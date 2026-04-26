from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional, Any
from retrieval.query import discover_books, query_books
import uuid

router = APIRouter()

class DiscoverRequest(BaseModel):
    topic: str

class QueryRequest(BaseModel):
    question:     str
    book_ids:     Optional[List[str]] = None
    session_id:   Optional[str] = None
    chat_history: Optional[List[Any]] = None

class QueryResponse(BaseModel):
    answer:            str
    sources:           List[dict]
    session_id:        str
    queries_remaining: int
    suggestions:       List[str] = []

@router.post("/discover")
async def discover(
    request: DiscoverRequest,
    x_user_id: str = Header(default="anonymous"),
):
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic is required")
    try:
        books = discover_books(topic=request.topic)

        # Deduplicate by book_id — keep highest scoring result
        seen_ids = set()
        unique_books = []
        for book in books:
            if book["book_id"] not in seen_ids:
                seen_ids.add(book["book_id"])
                unique_books.append(book)

        return {"topic": request.topic, "books": unique_books}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/query", response_model=QueryResponse)
async def query(
    request: QueryRequest,
    x_user_id: str = Header(default="anonymous"),
):
    session_id = request.session_id or str(uuid.uuid4())

    try:
        result = query_books(
            question=request.question,
            book_ids=request.book_ids,
            user_id=x_user_id,
            chat_history=request.chat_history or [],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Save query to Supabase history
    try:
        from database.crud import get_db
        db = get_db()
        # Ensure user exists
        db.table("users").upsert({
            "id":    x_user_id,
            "email": f"{x_user_id}@clerk.user",
        }, on_conflict="id").execute()
        # Save query
        db.table("queries").insert({
            "user_id":    x_user_id,
            "session_id": session_id,
            "question":   request.question,
            "answer":     result["answer"],
            "sources":    result["sources"],
            "book_ids":   request.book_ids or [],
        }).execute()
    except Exception as save_err:
        print(f"Failed to save query to history: {save_err}")

    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"],
        session_id=session_id,
        queries_remaining=99,
        suggestions=result.get("suggestions", []),
    )