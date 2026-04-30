"""
Token Usage API Endpoint
Returns user's token consumption statistics
"""

from fastapi import APIRouter, HTTPException, Query
from database.crud import get_db
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()


@router.get("/usage/tokens")
def get_token_usage(
    user_id: str = Query(..., description="User ID"),
    days: int = Query(30, description="Number of days to analyze")
):
    """
    Get token usage statistics for a user
    
    Query params:
    - user_id: User identifier
    - days: Number of days to look back (default: 30)
    
    Returns usage breakdown with allocations and costs
    """
    try:
        db = get_db()
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get user's current subscription
        subscription_response = db.table("subscriptions")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("is_active", True)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        
        subscription = subscription_response.data[0] if subscription_response.data else None
        
        # Get token allocations from subscription
        input_tokens_allocated = subscription.get("input_tokens_allocated", 0) if subscription else 0
        output_tokens_allocated = subscription.get("output_tokens_allocated", 0) if subscription else 0
        tokens_allocated = input_tokens_allocated + output_tokens_allocated
        
        # Get token usage from token_usage table
        usage_response = db.table("token_usage")\
            .select("*")\
            .eq("user_id", user_id)\
            .gte("created_at", start_date.isoformat())\
            .lte("created_at", end_date.isoformat())\
            .execute()
        
        usage_records = usage_response.data or []
        
        # Calculate totals
        total_input_tokens = sum(record.get("input_tokens", 0) for record in usage_records)
        total_output_tokens = sum(record.get("output_tokens", 0) for record in usage_records)
        total_tokens = total_input_tokens + total_output_tokens
        query_count = len(usage_records)
        
        # Calculate current month usage (for allocation tracking)
        first_day_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        month_usage_response = db.table("token_usage")\
            .select("*")\
            .eq("user_id", user_id)\
            .gte("created_at", first_day_of_month.isoformat())\
            .execute()
        
        month_records = month_usage_response.data or []
        input_tokens_used = sum(record.get("input_tokens", 0) for record in month_records)
        output_tokens_used = sum(record.get("output_tokens", 0) for record in month_records)
        tokens_used = input_tokens_used + output_tokens_used
        
        # Calculate remaining
        input_tokens_remaining = max(0, input_tokens_allocated - input_tokens_used)
        output_tokens_remaining = max(0, output_tokens_allocated - output_tokens_used)
        tokens_remaining = input_tokens_remaining + output_tokens_remaining
        
        # Calculate OpenAI costs
        # Rates: $0.15 per 1M input, $0.60 per 1M output
        input_cost_usd = (total_input_tokens / 1_000_000) * 0.15
        output_cost_usd = (total_output_tokens / 1_000_000) * 0.60
        total_cost_usd = input_cost_usd + output_cost_usd
        
        # Convert to INR (₹83 = $1)
        exchange_rate = 83
        total_cost_inr = total_cost_usd * exchange_rate
        
        return {
            "user_id": user_id,
            "days": days,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            
            # Total usage (period)
            "total_input_tokens": total_input_tokens,
            "total_output_tokens": total_output_tokens,
            "total_tokens": total_tokens,
            "query_count": query_count,
            
            # Monthly allocation
            "input_tokens_allocated": input_tokens_allocated,
            "output_tokens_allocated": output_tokens_allocated,
            "tokens_allocated": tokens_allocated,
            
            # Current month usage
            "input_tokens_used": input_tokens_used,
            "output_tokens_used": output_tokens_used,
            "tokens_used": tokens_used,
            
            # Remaining
            "input_tokens_remaining": input_tokens_remaining,
            "output_tokens_remaining": output_tokens_remaining,
            "tokens_remaining": tokens_remaining,
            
            # Costs
            "openai_cost_usd": round(total_cost_usd, 4),
            "openai_cost_inr": round(total_cost_inr, 2),
            
            # Subscription info
            "has_subscription": subscription is not None,
            "subscription_id": subscription.get("id") if subscription else None,
        }
        
    except IndexError:
        # No subscription found - return zeros
        return {
            "user_id": user_id,
            "days": days,
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "total_tokens": 0,
            "query_count": 0,
            "input_tokens_allocated": 0,
            "output_tokens_allocated": 0,
            "tokens_allocated": 0,
            "input_tokens_used": 0,
            "output_tokens_used": 0,
            "tokens_used": 0,
            "tokens_remaining": 0,
            "openai_cost_usd": 0,
            "openai_cost_inr": 0,
            "has_subscription": False,
            "subscription_id": None,
        }
        
    except Exception as e:
        print(f"Error fetching token usage: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
