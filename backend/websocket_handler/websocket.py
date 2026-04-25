from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from retrieval.query import query_books
from database.crud import log_query, get_session_history
from typing import Dict, List
import json
import uuid

router = APIRouter()

# In-memory session store — move to Redis for production
active_sessions: Dict[str, List[WebSocket]] = {}

class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active:
            self.active[session_id] = []
        self.active[session_id].append(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active:
            self.active[session_id].remove(websocket)
            if not self.active[session_id]:
                del self.active[session_id]

    async def broadcast(self, session_id: str, message: dict):
        if session_id in self.active:
            dead = []
            for ws in self.active[session_id]:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.active[session_id].remove(ws)

    def get_participant_count(self, session_id: str) -> int:
        return len(self.active.get(session_id, []))

manager = ConnectionManager()

@router.websocket("/ws/session/{session_id}")
async def websocket_session(
    websocket: WebSocket,
    session_id: str,
    user_id: str = "anonymous",
):
    await manager.connect(session_id, websocket)

    # Notify others that someone joined
    await manager.broadcast(session_id, {
        "type":    "user_joined",
        "user_id": user_id,
        "count":   manager.get_participant_count(session_id),
    })

    # Send existing history to the new joiner
    history = get_session_history(session_id)
    await websocket.send_text(json.dumps({
        "type":    "session_history",
        "history": history,
    }))

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            msg_type = data.get("type", "query")

            if msg_type == "query":
                question = data.get("question", "")
                book_ids = data.get("book_ids", [])

                # Broadcast typing indicator
                await manager.broadcast(session_id, {
                    "type":    "thinking",
                    "user_id": user_id,
                })

                # Run RAG query
                result = query_books(
                    question=question,
                    book_ids=book_ids or None,
                    user_id=user_id,
                )

                # Log to DB
                log_query(
                    user_id=user_id,
                    session_id=session_id,
                    question=question,
                    answer=result["answer"],
                    sources=result["sources"],
                    book_ids=book_ids,
                )

                # Broadcast answer to all participants
                await manager.broadcast(session_id, {
                    "type":       "answer",
                    "question":   question,
                    "answer":     result["answer"],
                    "sources":    result["sources"],
                    "asked_by":   user_id,
                    "session_id": session_id,
                })

            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
        await manager.broadcast(session_id, {
            "type":    "user_left",
            "user_id": user_id,
            "count":   manager.get_participant_count(session_id),
        })
