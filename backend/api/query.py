from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional, Any
from retrieval.query import discover_books, query_books
import uuid
import asyncio

router = APIRouter()


class DiscoverRequest(BaseModel):
    topic: str

class QueryRequest(BaseModel):
    question: str
    book_ids: Optional[List[str]] = None
    session_id: Optional[str] = None
    chat_history: Optional[List[Any]] = None

class QueryResponse(BaseModel):
    answer: str
    sources: List[dict]
    session_id: str
    queries_remaining: int
    suggestions: List[str] = []
    tokens_used: Optional[int] = None
    warning: Optional[str] = None


@router.post("/discover")
async def discover(request: DiscoverRequest, x_user_id: str = Header(default="anonymous")):
    if not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic is required")
    try:
        books = discover_books(topic=request.topic)
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
async def query(request: QueryRequest, x_user_id: str = Header(default="anonymous")):
    session_id = request.session_id or str(uuid.uuid4())

    # ═══════════════════════════════════════════════════════════════
    # FAIR USAGE — delegates to middleware (handles tier, rate limits,
    # per-student cap, institution pool throttling). Raises 429 on hard block.
    # ═══════════════════════════════════════════════════════════════
    fair_usage_result = {'allowed': True, 'max_tokens': 3000, 'warning': None}
    try:
        from api.fair_usage_middleware import enforce_fair_usage
        fair_usage_result = enforce_fair_usage(x_user_id)
    except HTTPException:
        raise  # 429s pass through cleanly to client
    except Exception as e:
        # Fail open — never block a query because of a middleware bug
        print(f"⚠️ Fair usage middleware error (failing open): {e}")

    warning_message = fair_usage_result.get('warning')
    # ✅ Phase B finalization: pass the computed max_tokens cap through to the LLM
    # call so the institution admin's max_tokens_per_request setting actually
    # constrains response length (and dynamic throttling at 80/90/95% reduces
    # it further when pool is stressed)
    max_tokens_cap = fair_usage_result.get('max_tokens')

    try:
        result = query_books(
            question=request.question,
            book_ids=request.book_ids,
            user_id=x_user_id,
            chat_history=request.chat_history or [],
            max_tokens=max_tokens_cap,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    input_tokens = result.get("input_tokens", 0)
    output_tokens = result.get("output_tokens", 0)
    total_tokens = result.get("total_tokens", 0)
    model_used = result.get("model", "gpt-4o-mini")

    # Save query to history
    query_id = None
    try:
        from database.crud import get_db
        db = get_db()

        # ✅ Safe user upsert — only insert if missing, never overwrite
        # (the previous .upsert() call risked clobbering institution_id, etc.)
        existing_user = db.table("users").select("id").eq("id", x_user_id).execute()
        if not existing_user.data or len(existing_user.data) == 0:
            db.table("users").insert({
                "id": x_user_id,
                "email": f"{x_user_id}@clerk.user",
            }).execute()

        query_response = db.table("queries").insert({
            "user_id": x_user_id,
            "session_id": session_id,
            "question": request.question,
            "answer": result["answer"],
            "sources": result["sources"],
            "book_ids": request.book_ids or [],
            "tokens_used": total_tokens,
        }).execute()

        if query_response.data and len(query_response.data) > 0:
            query_id = query_response.data[0].get("id")

    except Exception as save_err:
        print(f"⚠️ Failed to save query to history: {save_err}")

    # Track query for cooldown window (rate-limit infrastructure)
    try:
        from api.fair_usage_middleware import track_query_in_rate_limit
        track_query_in_rate_limit(x_user_id)
    except Exception as e:
        print(f"⚠️ Could not track query in rate limit: {e}")

    # Save detailed token usage + revenue calculation + counter increments
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
            print(f"⚠️ Failed to save token usage: {token_err}")

    queries_remaining = 99  # Placeholder — TODO: derive from subscription remaining

    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"],
        session_id=session_id,
        queries_remaining=queries_remaining,
        suggestions=result.get("suggestions", []),
        tokens_used=total_tokens,
        warning=warning_message,
    )
