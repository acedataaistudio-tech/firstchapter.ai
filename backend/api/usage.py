"""
Token Usage API Endpoint
Returns user's token consumption statistics, including:
- Subscription-level pool allocation/usage (institution-wide for institution users)
- Per-student soft cap data for institution users
"""

from fastapi import APIRouter, HTTPException, Query
from database.crud import get_db
from datetime import datetime, timedelta

router = APIRouter()


def _to_int(v, default=0):
    try:
        return int(float(v)) if v is not None else default
    except (ValueError, TypeError):
        return default


@router.get("/usage/tokens")
def get_token_usage(
    user_id: str = Query(..., description="User ID"),
    days: int = Query(30, description="Number of days to analyze")
):
    """
    Get token usage statistics for a user.

    Subscription lookup priority for institution students:
      1. users.subscription_id (set during student approval)
      2. Fallback: subscriptions.institution_id matches users.institution_id

    Returns institution-specific fields (is_institution_user, student_tokens_*)
    when the user belongs to an institution.
    """
    try:
        db = get_db()

        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # ──────────────────────────────────────────────
        # 1. Personal usage in the date range (from token_usage)
        # ──────────────────────────────────────────────
        usage_response = db.table("token_usage")\
            .select("input_tokens, output_tokens")\
            .eq("user_id", user_id)\
            .gte("created_at", start_date.isoformat())\
            .lte("created_at", end_date.isoformat())\
            .execute()

        usage_records = usage_response.data or []
        total_input_tokens = sum(_to_int(r.get("input_tokens")) for r in usage_records)
        total_output_tokens = sum(_to_int(r.get("output_tokens")) for r in usage_records)
        total_tokens = total_input_tokens + total_output_tokens
        query_count = len(usage_records)

        # ──────────────────────────────────────────────
        # 2. User's institution + subscription linking
        # ──────────────────────────────────────────────
        user_response = db.table("users")\
            .select("subscription_id, institution_id")\
            .eq("id", user_id)\
            .execute()

        user_row = user_response.data[0] if user_response.data and len(user_response.data) > 0 else {}
        subscription_id = user_row.get("subscription_id")
        institution_id = user_row.get("institution_id")

        # ──────────────────────────────────────────────
        # 3. Find the active subscription using a tiered lookup
        # ──────────────────────────────────────────────
        subscription = None

        # Priority 1: user has subscription_id explicitly set
        if subscription_id:
            sub_response = db.table("subscriptions")\
                .select("*")\
                .eq("id", subscription_id)\
                .eq("is_active", True)\
                .execute()
            if sub_response.data and len(sub_response.data) > 0:
                subscription = sub_response.data[0]

        # Priority 2: institution user without subscription_id → look up by institution
        if not subscription and institution_id:
            sub_response = db.table("subscriptions")\
                .select("*")\
                .eq("institution_id", institution_id)\
                .eq("is_active", True)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            if sub_response.data and len(sub_response.data) > 0:
                subscription = sub_response.data[0]

        # Priority 3: legacy individual paid user
        if not subscription:
            sub_response = db.table("subscriptions")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("is_active", True)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            if sub_response.data and len(sub_response.data) > 0:
                subscription = sub_response.data[0]

        # ──────────────────────────────────────────────
        # 4. Pool-level allocation + usage (from subscription)
        # ──────────────────────────────────────────────
        input_tokens_allocated = _to_int(subscription.get("input_tokens_allocated")) if subscription else 0
        output_tokens_allocated = _to_int(subscription.get("output_tokens_allocated")) if subscription else 0
        tokens_allocated = input_tokens_allocated + output_tokens_allocated

        # ✅ Pool-level usage: read from subscription counters (incremented in token_tracking.py)
        # For institution users this is the institution-wide pool usage.
        # For individual paid users this is their personal subscription usage.
        input_tokens_used = _to_int(subscription.get("input_tokens_used")) if subscription else 0
        output_tokens_used = _to_int(subscription.get("output_tokens_used")) if subscription else 0
        tokens_used = input_tokens_used + output_tokens_used

        input_tokens_remaining = max(0, input_tokens_allocated - input_tokens_used)
        output_tokens_remaining = max(0, output_tokens_allocated - output_tokens_used)
        tokens_remaining = max(0, tokens_allocated - tokens_used)

        # ──────────────────────────────────────────────
        # 5. 🆕 Per-student data for institution users
        # ──────────────────────────────────────────────
        is_institution_user = institution_id is not None
        institution_name = None
        student_tokens_allocated = 0
        student_tokens_used = 0
        student_usage_percent = 0

        if is_institution_user:
            try:
                inst_response = db.table("institutions")\
                    .select("name")\
                    .eq("id", institution_id)\
                    .execute()
                if inst_response.data and len(inst_response.data) > 0:
                    institution_name = inst_response.data[0].get("name")
            except Exception as e:
                print(f"⚠️ Could not fetch institution name: {e}")

            try:
                iu_response = db.table("institution_users")\
                    .select("monthly_tokens_allocated, monthly_tokens_used")\
                    .eq("institution_id", institution_id)\
                    .eq("user_id", user_id)\
                    .execute()
                if iu_response.data and len(iu_response.data) > 0:
                    iu = iu_response.data[0]
                    student_tokens_allocated = _to_int(iu.get("monthly_tokens_allocated"))
                    student_tokens_used = _to_int(iu.get("monthly_tokens_used"))
                    if student_tokens_allocated > 0:
                        student_usage_percent = round(
                            (student_tokens_used / student_tokens_allocated) * 100, 1
                        )
            except Exception as e:
                print(f"⚠️ Could not fetch institution_users data: {e}")

        # ──────────────────────────────────────────────
        # 6. Cost calculation (based on personal usage in date range)
        # ──────────────────────────────────────────────
        input_cost_usd = (total_input_tokens / 1_000_000) * 0.15
        output_cost_usd = (total_output_tokens / 1_000_000) * 0.60
        total_cost_usd = input_cost_usd + output_cost_usd
        total_cost_inr = total_cost_usd * 83

        return {
            # User context
            "user_id": user_id,
            "days": days,
            "date_range": {"start": start_date.isoformat(), "end": end_date.isoformat()},

            # Personal usage in date range (from token_usage)
            "total_input_tokens": total_input_tokens,
            "total_output_tokens": total_output_tokens,
            "total_tokens": total_tokens,
            "query_count": query_count,

            # Pool allocation (institution-wide for institution users; personal for paid individuals)
            "input_tokens_allocated": input_tokens_allocated,
            "output_tokens_allocated": output_tokens_allocated,
            "tokens_allocated": tokens_allocated,

            # Pool usage
            "input_tokens_used": input_tokens_used,
            "output_tokens_used": output_tokens_used,
            "tokens_used": tokens_used,

            # Pool remaining
            "input_tokens_remaining": input_tokens_remaining,
            "output_tokens_remaining": output_tokens_remaining,
            "tokens_remaining": tokens_remaining,

            # Costs
            "openai_cost_usd": round(total_cost_usd, 4),
            "openai_cost_inr": round(total_cost_inr, 2),

            # Subscription info
            "has_subscription": subscription is not None,
            "subscription_id": subscription.get("id") if subscription else None,

            # 🆕 Institution-specific (zeros/None for non-institution users)
            "is_institution_user": is_institution_user,
            "institution_id": institution_id,
            "institution_name": institution_name,
            "student_tokens_allocated": student_tokens_allocated,
            "student_tokens_used": student_tokens_used,
            "student_usage_percent": student_usage_percent,
        }

    except Exception as e:
        print(f"❌ Error fetching token usage: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
