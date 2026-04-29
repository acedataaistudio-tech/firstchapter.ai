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
    tokens_used:       Optional[int] = None  # NEW: Return tokens used

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

    # Extract token usage from result (if available)
    input_tokens = result.get("input_tokens", 0)
    output_tokens = result.get("output_tokens", 0)
    total_tokens = result.get("total_tokens", 0)
    model_used = result.get("model", "gpt-4o-mini")

    # Save query to Supabase history
    query_id = None
    try:
        from database.crud import get_db
        db = get_db()
        
        # Ensure user exists
        db.table("users").upsert({
            "id":    x_user_id,
            "email": f"{x_user_id}@clerk.user",
        }, on_conflict="id").execute()
        
        # Save query with token count
        query_response = db.table("queries").insert({
            "user_id":    x_user_id,
            "session_id": session_id,
            "question":   request.question,
            "answer":     result["answer"],
            "sources":    result["sources"],
            "book_ids":   request.book_ids or [],
            "tokens_used": total_tokens,  # NEW: Save total tokens
        }).execute()
        
        # Get the inserted query ID
        if query_response.data and len(query_response.data) > 0:
            query_id = query_response.data[0].get("id")
        
    except Exception as save_err:
        print(f"Failed to save query to history: {save_err}")

    # Save detailed token usage and calculate publisher revenue
    if query_id and total_tokens > 0:
        try:
            from api.token_tracking import save_token_usage
            save_token_usage(
                query_id=query_id,
                user_id=x_user_id,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                model=model_used,
                sources=result.get("sources", []),
                book_ids=request.book_ids or []
            )
        except Exception as token_err:
            print(f"Failed to save token usage: {token_err}")

    # Calculate queries remaining based on subscription
    queries_remaining = 99  # Default for now, will be updated with subscription check
    
    # TODO: Check user's subscription and calculate actual remaining queries/tokens
    # This will be implemented when subscription checking is added

    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"],
        session_id=session_id,
        queries_remaining=queries_remaining,
        suggestions=result.get("suggestions", []),
        tokens_used=total_tokens,  # NEW: Return tokens to frontend
    )
