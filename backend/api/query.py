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
        return {"topic": request.topic, "books": books}
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

    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"],
        session_id=session_id,
        queries_remaining=99,
        suggestions=result.get("suggestions", []),
    )