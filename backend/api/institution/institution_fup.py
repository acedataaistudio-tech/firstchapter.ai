"""
Institution Fair Usage Policy (FUP) Enforcement
Complete implementation with all safety features
"""

from fastapi import HTTPException
from datetime import datetime, timedelta
from typing import Tuple, Optional
import asyncio

async def check_institution_fair_usage(
    user_id: str,
    institution_id: str,
    requested_max_tokens: int = 4000
) -> Tuple[bool, int, Optional[str], int]:
    """
    Comprehensive Fair Usage Policy check for institution users.
    
    Enforces:
    1. No concurrent requests per user
    2. Rate limiting (15 req/min default, configurable)
    3. Group quota limits (institution total)
    4. Per-user monthly caps
    5. Per-request token limits
    6. Graceful degradation (80/90/95/100%)
    
    Args:
        user_id: Clerk user ID
        institution_id: Institution UUID
        requested_max_tokens: Tokens requested for this query
        
    Returns:
        Tuple of (can_proceed, max_tokens_allowed, warning_message, delay_seconds)
        
    Raises:
        HTTPException: If request should be blocked
    """
    from database.crud import get_db
    db = get_db()
    
    # ═══════════════════════════════════════════════════════════════
    # 0. GET INSTITUTION SUBSCRIPTION & EFFECTIVE SETTINGS
    # ═══════════════════════════════════════════════════════════════
    subscription = db.table("subscriptions")\
        .select("*")\
        .eq("institution_id", institution_id)\
        .eq("is_active", True)\
        .single()\
        .execute()
    
    if not subscription.data:
        raise HTTPException(
            status_code=404, 
            detail="No active subscription found for institution"
        )
    
    sub = subscription.data
    
    # Get effective settings (considering platform overrides and trial mode)
    settings_result = db.rpc(
        "get_effective_institution_settings",
        {"p_subscription_id": sub["id"]}
    ).execute()
    
    if not settings_result.data or len(settings_result.data) == 0:
        # Fallback to direct subscription values
        effective_settings = {
            "student_cap_percentage": sub.get("student_cap_percentage", 0.5),
            "max_tokens_per_request": sub.get("max_tokens_per_request", 4000),
            "rate_limit_per_minute": sub.get("rate_limit_per_minute", 15),
            "source": "subscription"
        }
    else:
        effective_settings = settings_result.data[0]
    
    # Extract settings
    rate_limit = effective_settings["rate_limit_per_minute"]
    max_tokens_limit = effective_settings["max_tokens_per_request"]
    student_cap_pct = effective_settings["student_cap_percentage"]
    
    # Check emergency throttle
    if sub.get("emergency_throttle_active", False):
        throttle_until = sub.get("emergency_throttle_until")
        if throttle_until and datetime.fromisoformat(throttle_until) > datetime.utcnow():
            raise HTTPException(
                status_code=503,
                detail=f"🚨 Emergency throttle active: {sub.get('emergency_throttle_reason', 'High usage detected')}. "
                       f"Service will resume shortly."
            )
    
    # ═══════════════════════════════════════════════════════════════
    # 1. CHECK FOR CONCURRENT REQUESTS (No concurrent usage)
    # ═══════════════════════════════════════════════════════════════
    active_requests = db.table("institution_request_logs")\
        .select("id, request_started_at")\
        .eq("user_id", user_id)\
        .eq("status", "in_progress")\
        .execute()
    
    if active_requests.data and len(active_requests.data) > 0:
        # Check if request is truly stuck (> 5 minutes old)
        for req in active_requests.data:
            started_at = datetime.fromisoformat(req["request_started_at"].replace('Z', '+00:00'))
            if datetime.utcnow() - started_at.replace(tzinfo=None) > timedelta(minutes=5):
                # Mark as failed (likely stuck)
                db.table("institution_request_logs")\
                    .update({
                        "status": "failed",
                        "error_message": "Request timeout - marked as failed",
                        "request_completed_at": datetime.utcnow().isoformat()
                    })\
                    .eq("id", req["id"])\
                    .execute()
            else:
                # Active request detected
                raise HTTPException(
                    status_code=429,
                    detail="⏸️ Concurrent request detected. Please wait for your current request to complete."
                )
    
    # ═══════════════════════════════════════════════════════════════
    # 2. RATE LIMITING (Requests per minute)
    # ═══════════════════════════════════════════════════════════════
    one_minute_ago = datetime.utcnow() - timedelta(minutes=1)
    
    recent_requests = db.table("institution_request_logs")\
        .select("id")\
        .eq("user_id", user_id)\
        .gte("created_at", one_minute_ago.isoformat())\
        .execute()
    
    request_count = len(recent_requests.data) if recent_requests.data else 0
    
    if request_count >= rate_limit:
        raise HTTPException(
            status_code=429,
            detail=f"⏱️ Rate limit exceeded. Maximum {rate_limit} requests per minute. "
                   f"You've made {request_count} requests in the last minute. Please wait."
        )
    
    # ═══════════════════════════════════════════════════════════════
    # 3. CHECK USER BLOCK STATUS
    # ═══════════════════════════════════════════════════════════════
    inst_user = db.table("institution_users")\
        .select("*")\
        .eq("institution_id", institution_id)\
        .eq("user_id", user_id)\
        .execute()
    
    if inst_user.data and len(inst_user.data) > 0:
        user_data = inst_user.data[0]
        
        if user_data.get("is_blocked", False):
            blocked_until = user_data.get("blocked_until")
            if blocked_until:
                unblock_time = datetime.fromisoformat(blocked_until.replace('Z', '+00:00'))
                if datetime.utcnow() < unblock_time.replace(tzinfo=None):
                    raise HTTPException(
                        status_code=403,
                        detail=f"🚫 Account temporarily blocked: {user_data.get('blocked_reason', 'Policy violation')}. "
                               f"Access will be restored automatically."
                    )
                else:
                    # Unblock expired - remove block
                    db.table("institution_users")\
                        .update({"is_blocked": False, "blocked_reason": None, "blocked_until": None})\
                        .eq("id", user_data["id"])\
                        .execute()
    
    # ═══════════════════════════════════════════════════════════════
    # 4. GROUP-LEVEL QUOTA CHECK (Institution Total)
    # ═══════════════════════════════════════════════════════════════
    group_quota = (sub.get("input_tokens_allocated", 0) + 
                   sub.get("output_tokens_allocated", 0))
    group_used = (sub.get("input_tokens_used", 0) + 
                  sub.get("output_tokens_used", 0))
    
    if group_quota == 0:
        raise HTTPException(
            status_code=403,
            detail="No tokens allocated to institution. Please contact your administrator."
        )
    
    group_usage_percent = (group_used / group_quota) * 100
    
    # ═══════════════════════════════════════════════════════════════
    # 5. GRACEFUL DEGRADATION (Institution-Level FUP)
    # ═══════════════════════════════════════════════════════════════
    max_tokens_allowed = min(requested_max_tokens, max_tokens_limit)
    warning = None
    delay = 0
    
    if group_usage_percent >= 100:
        raise HTTPException(
            status_code=429,
            detail="🛑 Institution monthly token limit reached. Usage resets on renewal date. "
                   "Contact your administrator to upgrade the plan."
        )
    
    elif group_usage_percent >= 95:
        # CRITICAL: Reduce to 500 tokens, 5-second delay
        max_tokens_allowed = 500
        warning = "🚨 Critical: Institution at 95% capacity. Queries limited to 500 tokens with 5-second cooldown."
        delay = 5
    
    elif group_usage_percent >= 90:
        # WARNING: Reduce to 2000 tokens, 2-second delay
        max_tokens_allowed = min(max_tokens_allowed, 2000)
        warning = "⚠️ Warning: Institution at 90% capacity. Queries limited to 2000 tokens with 2-second delay."
        delay = 2
    
    elif group_usage_percent >= 80:
        # INFO: Warning only, no restrictions yet
        warning = "💡 Notice: Institution at 80% capacity. Please monitor usage."
    
    # ═══════════════════════════════════════════════════════════════
    # 6. PER-USER MONTHLY CAP CHECK
    # ═══════════════════════════════════════════════════════════════
    if not inst_user.data or len(inst_user.data) == 0:
        # Create user record with dynamic cap
        user_cap = int(group_quota * (student_cap_pct / 100))
        
        db.table("institution_users").insert({
            "institution_id": institution_id,
            "user_id": user_id,
            "monthly_tokens_allocated": user_cap,
            "monthly_tokens_used": 0,
        }).execute()
        
        user_used = 0
        user_allocated = user_cap
    else:
        user_data = inst_user.data[0]
        user_used = user_data.get("monthly_tokens_used", 0)
        user_allocated = user_data.get("monthly_tokens_allocated", 0)
        
        # Update last active
        db.table("institution_users")\
            .update({"last_active": datetime.utcnow().isoformat()})\
            .eq("id", user_data["id"])\
            .execute()
    
    if user_allocated > 0:
        user_usage_percent = (user_used / user_allocated) * 100
        
        if user_usage_percent >= 100:
            raise HTTPException(
                status_code=429,
                detail=f"🛑 Personal monthly limit reached ({user_allocated:,} tokens). "
                       f"Your allocation resets next month. Contact your administrator for more tokens."
            )
        
        elif user_usage_percent >= 95:
            if not warning or "Critical" not in warning:
                warning = f"🚨 You've used {user_usage_percent:.1f}% of your personal monthly allocation. Only 5% remaining!"
        
        elif user_usage_percent >= 90:
            if not warning:
                warning = f"⚠️ You've used {user_usage_percent:.1f}% of your personal monthly allocation."
    
    # ═══════════════════════════════════════════════════════════════
    # 7. FINAL TOKEN LIMIT ENFORCEMENT
    # ═══════════════════════════════════════════════════════════════
    max_tokens_allowed = min(max_tokens_allowed, max_tokens_limit)
    
    # Log this check for monitoring
    if group_usage_percent > 80 or (user_allocated > 0 and user_used / user_allocated > 0.8):
        # Could log to analytics here
        pass
    
    return (True, max_tokens_allowed, warning, delay)


async def log_institution_request_start(
    user_id: str,
    institution_id: str,
    max_tokens: int,
    question: str,
    book_ids: list,
    session_id: str,
    db
) -> str:
    """
    Log request start for concurrency tracking.
    
    Returns:
        request_log_id for later completion update
    """
    result = db.table("institution_request_logs").insert({
        "institution_id": institution_id,
        "user_id": user_id,
        "status": "in_progress",
        "tokens_requested": max_tokens,
        "question": question,
        "book_ids": book_ids,
        "session_id": session_id,
        "request_started_at": datetime.utcnow().isoformat(),
    }).execute()
    
    return result.data[0]["id"] if result.data else None


async def log_institution_request_complete(
    request_log_id: str,
    tokens_used: int,
    input_tokens: int,
    output_tokens: int,
    status: str,
    error_message: Optional[str],
    db
):
    """
    Mark request as completed and record token usage.
    """
    completed_at = datetime.utcnow()
    
    # Get request start time to calculate duration
    request_data = db.table("institution_request_logs")\
        .select("request_started_at")\
        .eq("id", request_log_id)\
        .single()\
        .execute()
    
    duration_ms = None
    if request_data.data:
        started_at = datetime.fromisoformat(request_data.data["request_started_at"].replace('Z', '+00:00'))
        duration = (completed_at - started_at.replace(tzinfo=None)).total_seconds() * 1000
        duration_ms = int(duration)
    
    db.table("institution_request_logs").update({
        "status": status,
        "request_completed_at": completed_at.isoformat(),
        "tokens_used": tokens_used,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "request_duration_ms": duration_ms,
        "error_message": error_message,
    }).eq("id", request_log_id).execute()
    
    # Update institution user stats
    if status == "completed" and tokens_used > 0:
        db.rpc("increment_institution_user_tokens", {
            "p_user_id": request_data.data.get("user_id") if request_data.data else None,
            "p_institution_id": request_data.data.get("institution_id") if request_data.data else None,
            "p_tokens": tokens_used
        }).execute()


# Helper stored procedure to increment user tokens atomically
# Add this to migration SQL:
"""
CREATE OR REPLACE FUNCTION increment_institution_user_tokens(
  p_user_id TEXT,
  p_institution_id UUID,
  p_tokens INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE institution_users
  SET 
    monthly_tokens_used = monthly_tokens_used + p_tokens,
    requests_today = requests_today + 1,
    requests_this_month = requests_this_month + 1,
    last_active = NOW()
  WHERE user_id = p_user_id 
    AND institution_id = p_institution_id;
END;
$$ LANGUAGE plpgsql;
"""
