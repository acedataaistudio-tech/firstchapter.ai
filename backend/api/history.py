from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from database.crud import get_db
import uuid

router = APIRouter()

# ── History ───────────────────────────────────────────────────────────────────

@router.get("/")
def get_history(x_user_id: str = Header(default="anonymous")):
    try:
        db = get_db()
        res = db.table("queries")\
            .select("id, session_id, question, answer, sources, book_ids, created_at")\
            .eq("user_id", x_user_id)\
            .order("created_at", desc=True)\
            .limit(50)\
            .execute()

        # Group by session_id
        sessions = {}
        for row in res.data:
            sid = str(row["session_id"])
            if sid not in sessions:
                sessions[sid] = {
                    "session_id": sid,
                    "topic":      row["question"][:80],
                    "queries":    0,
                    "books":      [],
                    "date":       row["created_at"],
                }
            sessions[sid]["queries"] += 1
            # Collect unique book titles from sources
            for source in (row.get("sources") or []):
                title = source.get("book_title", "")
                if title and title not in sessions[sid]["books"]:
                    sessions[sid]["books"].append(title)

        return {"history": list(sessions.values())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{session_id}")
def delete_session(session_id: str, x_user_id: str = Header(default="anonymous")):
    try:
        db = get_db()
        db.table("queries")\
            .delete()\
            .eq("session_id", session_id)\
            .eq("user_id", x_user_id)\
            .execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))