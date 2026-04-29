"""
Query API Endpoint - Phase 2.5
Now includes:
- Fair usage enforcement before query
- Token limit warnings
- MAU tracking for institutions
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional, Any
from retrieval.query import discover_books, query_books
import uuid

# NEW: Import fair usage middleware
from api.fair_usage_middleware import enforce_fair_usage, track_query_in_rate_limit

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
    tokens_used:       Optional[int] = None
    warning:           Optional[str] = None  # NEW: Fair usage warnings


@router.post("/discover")
async def discover(
    request: DiscoverRequest,
    x_user_id: str = Header(default="anonymous"),
):
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic is required")
    try:
        books = discover_books(topic=request.topic)

        # Deduplicate by book_id
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

    # ═══════════════════════════════════════════════════════════════
    # NEW: Fair Usage Enforcement
    # ═══════════════════════════════════════════════════════════════
    try:
        usage_check = enforce_fair_usage(x_user_id)
        
        # If throttled, raises HTTPException automatically
        # If allowed, get max tokens and warnings
        max_tokens_allowed = usage_check.get('max_tokens', 5000)
        usage_warning = usage_check.get('warning')  # May be None
        
    except HTTPException as e:
        # Re-raise rate limit errors to user
        raise e
    except Exception as e:
        # Log but don't block on fair usage check failure
        print(f"Fair usage check failed: {e}")
        max_tokens_allowed = 1000
        usage_warning = None

    # ═══════════════════════════════════════════════════════════════
    # Process Query
    # ═══════════════════════════════════════════════════════════════
    try:
        result = query_books(
            question=request.question,
            book_ids=request.book_ids,
            user_id=x_user_id,
            chat_history=request.chat_history or [],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Extract token usage
    input_tokens = result.get("input_tokens", 0)
    output_tokens = result.get("output_tokens", 0)
    total_tokens = result.get("total_tokens", 0)
    model_used = result.get("model", "gpt-4o-mini")

    # ═══════════════════════════════════════════════════════════════
    # Save Query to Database
    # ═══════════════════════════════════════════════════════════════
    query_id = None
    try:
        from database.crud import get_db
        db = get_db()
        
        # Ensure user exists
        db.table("users").upsert({
            "id":    x_user_id,
            "email": f"{x_user_id}@clerk.user",
        }, on_conflict="id").execute()
        
        # Save query
        query_response = db.table("queries").insert({
            "user_id":    x_user_id,
            "session_id": session_id,
            "question":   request.question,
            "answer":     result["answer"],
            "sources":    result["sources"],
            "book_ids":   request.book_ids or [],
            "tokens_used": total_tokens,
        }).execute()
        
        if query_response.data and len(query_response.data) > 0:
            query_id = query_response.data[0].get("id")
        
    except Exception as save_err:
        print(f"Failed to save query: {save_err}")

    # ═══════════════════════════════════════════════════════════════
    # NEW: Save Token Usage with Cost Tracking
    # ═══════════════════════════════════════════════════════════════
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

    # ═══════════════════════════════════════════════════════════════
    # NEW: Track Query for Rate Limiting
    # ═══════════════════════════════════════════════════════════════
    try:
        track_query_in_rate_limit(x_user_id)
    except Exception as rate_err:
        print(f"Failed to track rate limit: {rate_err}")

    # ═══════════════════════════════════════════════════════════════
    # Calculate Queries Remaining
    # ═══════════════════════════════════════════════════════════════
    queries_remaining = 99  # Default
    
    # TODO: Calculate actual remaining based on subscription
    # For now, simple placeholder

    # ═══════════════════════════════════════════════════════════════
    # Return Response with Warnings
    # ═══════════════════════════════════════════════════════════════
    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"],
        session_id=session_id,
        queries_remaining=queries_remaining,
        suggestions=result.get("suggestions", []),
        tokens_used=total_tokens,
        warning=usage_warning  # NEW: Include usage warnings
    )
