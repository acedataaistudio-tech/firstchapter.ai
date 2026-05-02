"""
Query API with Dual Fair Usage Policy
- Individual readers: Personal quota FUP
- Institution users: Institution FUP with rate limiting, concurrency prevention
"""

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
    question:     str
    book_ids:     Optional[List[str]] = None
    session_id:   Optional[str] = None
    chat_history: Optional[List[Any]] = None
    max_tokens:   Optional[int] = 4000  # NEW: Client can request specific limit

class QueryResponse(BaseModel):
    answer:            str
    sources:           List[dict]
    session_id:        str
    queries_remaining: int
    suggestions:       List[str] = []
    tokens_used:       Optional[int] = None
    warning:           Optional[str] = None  # Fair Usage warnings

# ══════════════════════════════════════════════════════════════════
# INDIVIDUAL READER FAIR USAGE POLICY (Existing)
# ══════════════════════════════════════════════════════════════════

async def check_fair_usage_policy(user_id: str):
    """
    Check individual reader's Fair Usage Policy.
    
    Returns: (can_proceed, warning_message, delay_seconds)
    """
    try:
        from database.crud import get_db
        db = get_db()
        
        # Get active subscription
        subscription = db.table("subscriptions")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if not subscription.data:
            # No subscription - allow for now
            return (True, None, 0)
        
        sub = subscription.data
        tokens_allocated = (sub.get("input_tokens_allocated", 0) + 
                           sub.get("output_tokens_allocated", 0))
        tokens_used = (sub.get("input_tokens_used", 0) + 
                      sub.get("output_tokens_used", 0))
        
        if tokens_allocated == 0:
            return (True, None, 0)
        
        usage_percent = (tokens_used / tokens_allocated) * 100
        
        # Individual Fair Usage Policy
        if usage_percent >= 100:
            return (False, "🛑 Monthly token limit reached. Your usage will reset on your renewal date.", 0)
        
        elif usage_percent >= 95:
            return (True, "🚨 Critical: Only 5% of tokens remaining. Queries throttled with 5-second cooldown.", 5)
        
        elif usage_percent >= 90:
            return (True, "⚠️ Warning: 90% of tokens used. A 2-second delay is applied.", 2)
        
        elif usage_percent >= 80:
            return (True, "💡 Notice: 80% of tokens used. No restrictions yet.", 0)
        
        else:
            return (True, None, 0)
            
    except Exception as e:
        print(f"Fair Usage Policy check error: {e}")
        return (True, None, 0)

# ══════════════════════════════════════════════════════════════════
# DISCOVER ENDPOINT (Unchanged)
# ══════════════════════════════════════════════════════════════════

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

# ══════════════════════════════════════════════════════════════════
# QUERY ENDPOINT - DUAL FAIR USAGE POLICY
# ══════════════════════════════════════════════════════════════════

@router.post("/query", response_model=QueryResponse)
async def query(
    request: QueryRequest,
    x_user_id: str = Header(default="anonymous"),
    x_institution_id: str = Header(default=None),  # NEW: Institution ID header
):
    session_id = request.session_id or str(uuid.uuid4())
    
    # ═══════════════════════════════════════════════════════════════
    # DETERMINE USER TYPE & APPLY APPROPRIATE FAIR USAGE POLICY
    # ═══════════════════════════════════════════════════════════════
    
    request_log_id = None
    max_tokens = request.max_tokens or 4000
    warning = None
    
    if x_institution_id:
        # ───────────────────────────────────────────────────────────
        # INSTITUTION USER - Apply Institution FUP
        # ───────────────────────────────────────────────────────────
        try:
            from api.institution.institution_fup import (
                check_institution_fair_usage,
                log_institution_request_start,
                log_institution_request_complete
            )
            from database.crud import get_db
            db = get_db()
            
            # Check institution Fair Usage Policy
            can_proceed, max_tokens_allowed, warning, delay = await check_institution_fair_usage(
                user_id=x_user_id,
                institution_id=x_institution_id,
                requested_max_tokens=max_tokens
            )
            
            if not can_proceed:
                raise HTTPException(status_code=429, detail=warning or "Institution quota limit reached")
            
            max_tokens = max_tokens_allowed
            
            # Log request start (for concurrency tracking)
            request_log_id = await log_institution_request_start(
                user_id=x_user_id,
                institution_id=x_institution_id,
                max_tokens=max_tokens,
                question=request.question,
                book_ids=request.book_ids or [],
                session_id=session_id,
                db=db
            )
            
            # Apply throttle delay if needed (90%+, 95%+)
            if delay > 0:
                await asyncio.sleep(delay)
        
        except ImportError:
            # Institution FUP not yet deployed - allow request
            print("⚠️ Institution FUP module not found - allowing request")
            pass
        
        except Exception as inst_fup_error:
            # Log error but don't block request
            print(f"Institution FUP error: {inst_fup_error}")
            # Re-raise HTTPException errors (they're intentional blocks)
            if isinstance(inst_fup_error, HTTPException):
                raise
    
    else:
        # ───────────────────────────────────────────────────────────
        # INDIVIDUAL READER - Apply Individual FUP (Existing)
        # ───────────────────────────────────────────────────────────
        can_proceed, warning, delay = await check_fair_usage_policy(x_user_id)
        
        if not can_proceed:
            raise HTTPException(status_code=429, detail=warning or "Monthly token limit reached")
        
        # Apply throttle delay
        if delay > 0:
            await asyncio.sleep(delay)
    
    # ═══════════════════════════════════════════════════════════════
    # PROCESS QUERY (Same for both individual and institution users)
    # ═══════════════════════════════════════════════════════════════
    
    try:
        result = query_books(
            question=request.question,
            book_ids=request.book_ids,
            user_id=x_user_id,
            chat_history=request.chat_history or [],
            max_tokens=max_tokens,  # ENFORCED LIMIT (from FUP)
        )
    except Exception as query_error:
        # Mark institution request as failed
        if request_log_id:
            try:
                from api.institution.institution_fup import log_institution_request_complete
                from database.crud import get_db
                db = get_db()
                
                await log_institution_request_complete(
                    request_log_id=request_log_id,
                    tokens_used=0,
                    input_tokens=0,
                    output_tokens=0,
                    status="failed",
                    error_message=str(query_error),
                    db=db
                )
            except:
                pass
        
        raise HTTPException(status_code=500, detail=str(query_error))

    # Extract token usage from result
    input_tokens = result.get("input_tokens", 0)
    output_tokens = result.get("output_tokens", 0)
    total_tokens = result.get("total_tokens", 0)
    model_used = result.get("model", "gpt-4o-mini")

    # ═══════════════════════════════════════════════════════════════
    # SAVE QUERY TO HISTORY
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
        
        # Save query with token count
        query_response = db.table("queries").insert({
            "user_id":    x_user_id,
            "session_id": session_id,
            "question":   request.question,
            "answer":     result["answer"],
            "sources":    result["sources"],
            "book_ids":   request.book_ids or [],
            "tokens_used": total_tokens,
        }).execute()
        
        # Get the inserted query ID
        if query_response.data and len(query_response.data) > 0:
            query_id = query_response.data[0].get("id")
        
    except Exception as save_err:
        print(f"Failed to save query to history: {save_err}")

    # ═══════════════════════════════════════════════════════════════
    # SAVE TOKEN USAGE & UPDATE TRACKING
    # ═══════════════════════════════════════════════════════════════
    
    if query_id and total_tokens > 0:
        # Save detailed token usage for publisher payout calculation
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
    
    # Mark institution request as completed
    if request_log_id:
        try:
            from api.institution.institution_fup import log_institution_request_complete
            from database.crud import get_db
            db = get_db()
            
            await log_institution_request_complete(
                request_log_id=request_log_id,
                tokens_used=total_tokens,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                status="completed",
                error_message=None,
                db=db
            )
        except Exception as log_err:
            print(f"Failed to log institution request completion: {log_err}")

    # ═══════════════════════════════════════════════════════════════
    # RETURN RESPONSE WITH WARNING (if any)
    # ═══════════════════════════════════════════════════════════════
    
    queries_remaining = 99  # Placeholder - actual calculation can be added

    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"],
        session_id=session_id,
        queries_remaining=queries_remaining,
        suggestions=result.get("suggestions", []),
        tokens_used=total_tokens,
        warning=warning,  # FUP warning message (if any)
    )
