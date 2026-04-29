"""
Fair Usage Policy Middleware - Phase 2.5
Implements:
- Rate limiting per user tier
- Token limits per session
- Cooldown periods
- Dynamic throttling for institutions
- Claude-style pause messages
"""

from fastapi import HTTPException, Header
from database.crud import get_db
from datetime import datetime, timedelta
from typing import Optional, Dict
import time


# Fair Usage Limits by Tier
USAGE_LIMITS = {
    'free': {
        'queries_per_day': 10,
        'max_tokens_per_query': 500,
        'cooldown_after_consecutive': 5,
        'cooldown_minutes': 5
    },
    'basic': {
        'queries_per_month': 100,
        'max_tokens_per_query': 2000,
        'cooldown_after_consecutive': 10,
        'cooldown_minutes': 2
    },
    'premium': {
        'queries_per_month': None,  # Unlimited
        'max_tokens_per_query': 5000,
        'cooldown_after_consecutive': 20,
        'cooldown_minutes': 1
    },
    'institution': {
        'queries_per_month': None,  # Unlimited (but token limited)
        'max_tokens_per_query': 3000,
        'cooldown_after_consecutive': 15,
        'cooldown_minutes': 3,
        # Dynamic throttling based on usage
        'throttle_at_80_percent': 2000,
        'throttle_at_90_percent': 1000,
        'throttle_at_95_percent': 500
    }
}


def get_user_tier(user_id: str) -> str:
    """Get user's subscription tier"""
    try:
        db = get_db()
        
        # Get user's subscription
        user = db.table("users")\
            .select("subscription_id, institution_id")\
            .eq("id", user_id)\
            .single()\
            .execute()
        
        if not user.data:
            return 'free'
        
        # Check if institution user
        if user.data.get("institution_id"):
            return 'institution'
        
        subscription_id = user.data.get("subscription_id")
        if not subscription_id:
            return 'free'
        
        # Get subscription package
        subscription = db.table("subscriptions")\
            .select("package_id")\
            .eq("id", subscription_id)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if not subscription.data:
            return 'free'
        
        package_id = subscription.data.get("package_id")
        if not package_id:
            return 'free'
        
        # Get package name
        package = db.table("packages")\
            .select("name")\
            .eq("id", package_id)\
            .single()\
            .execute()
        
        if not package.data:
            return 'free'
        
        package_name = package.data.get("name", "").lower()
        
        if 'premium' in package_name or 'annual' in package_name:
            return 'premium'
        elif 'basic' in package_name:
            return 'basic'
        else:
            return 'free'
        
    except Exception as e:
        print(f"Error getting user tier: {e}")
        return 'free'


def check_rate_limit(user_id: str, tier: str) -> Dict:
    """
    Check if user has exceeded rate limits
    
    Returns:
        {
            'allowed': bool,
            'reason': str,
            'wait_seconds': int,
            'usage': dict
        }
    """
    try:
        db = get_db()
        limits = USAGE_LIMITS.get(tier, USAGE_LIMITS['free'])
        
        # Get current time window
        now = datetime.now()
        
        # Daily limits (for free tier)
        if limits.get('queries_per_day'):
            window_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            window_end = window_start + timedelta(days=1)
            
            # Count queries today
            queries_today = db.table("queries")\
                .select("id", count="exact")\
                .eq("user_id", user_id)\
                .gte("created_at", window_start.isoformat())\
                .lt("created_at", window_end.isoformat())\
                .execute()
            
            if queries_today.count >= limits['queries_per_day']:
                return {
                    'allowed': False,
                    'reason': f"Daily limit reached ({limits['queries_per_day']} queries/day)",
                    'wait_seconds': int((window_end - now).total_seconds()),
                    'usage': {
                        'queries_used': queries_today.count,
                        'queries_limit': limits['queries_per_day']
                    }
                }
        
        # Monthly limits (for basic/premium)
        if limits.get('queries_per_month'):
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                month_end = month_start.replace(year=now.year + 1, month=1)
            else:
                month_end = month_start.replace(month=now.month + 1)
            
            queries_month = db.table("queries")\
                .select("id", count="exact")\
                .eq("user_id", user_id)\
                .gte("created_at", month_start.isoformat())\
                .lt("created_at", month_end.isoformat())\
                .execute()
            
            if queries_month.count >= limits['queries_per_month']:
                return {
                    'allowed': False,
                    'reason': f"Monthly limit reached ({limits['queries_per_month']} queries/month)",
                    'wait_seconds': int((month_end - now).total_seconds()),
                    'usage': {
                        'queries_used': queries_month.count,
                        'queries_limit': limits['queries_per_month']
                    }
                }
        
        # Check cooldown (consecutive queries)
        cooldown_check = check_cooldown(user_id, tier, limits)
        if not cooldown_check['allowed']:
            return cooldown_check
        
        return {
            'allowed': True,
            'reason': 'OK',
            'wait_seconds': 0,
            'usage': {}
        }
        
    except Exception as e:
        print(f"Error checking rate limit: {e}")
        # Allow on error (fail open)
        return {'allowed': True, 'reason': 'OK', 'wait_seconds': 0, 'usage': {}}


def check_cooldown(user_id: str, tier: str, limits: Dict) -> Dict:
    """Check if user needs cooldown after consecutive queries"""
    try:
        db = get_db()
        
        # Get rate limit record
        now = datetime.now()
        window_start = now - timedelta(minutes=15)  # 15-minute window
        
        rate_limit = db.table("user_rate_limits")\
            .select("*")\
            .eq("user_id", user_id)\
            .gte("window_start", window_start.isoformat())\
            .order("window_start", desc=True)\
            .limit(1)\
            .execute()
        
        if not rate_limit.data:
            return {'allowed': True, 'reason': 'OK', 'wait_seconds': 0}
        
        record = rate_limit.data[0]
        
        # Check if currently throttled
        if record.get('is_throttled') and record.get('throttle_until'):
            throttle_until = datetime.fromisoformat(record['throttle_until'].replace('Z', '+00:00'))
            if throttle_until > now:
                wait_seconds = int((throttle_until - now).total_seconds())
                return {
                    'allowed': False,
                    'reason': f"Taking a {limits['cooldown_minutes']}-minute break after {limits['cooldown_after_consecutive']} consecutive queries",
                    'wait_seconds': wait_seconds,
                    'throttle_message': get_throttle_message(wait_seconds)
                }
        
        # Check consecutive query count
        queries_count = record.get('queries_count', 0)
        if queries_count >= limits['cooldown_after_consecutive']:
            # Apply throttle
            throttle_until = now + timedelta(minutes=limits['cooldown_minutes'])
            
            db.table("user_rate_limits").update({
                'is_throttled': True,
                'throttle_until': throttle_until.isoformat()
            }).eq("id", record['id']).execute()
            
            return {
                'allowed': False,
                'reason': f"Cooldown required after {queries_count} queries",
                'wait_seconds': limits['cooldown_minutes'] * 60,
                'throttle_message': get_throttle_message(limits['cooldown_minutes'] * 60)
            }
        
        return {'allowed': True, 'reason': 'OK', 'wait_seconds': 0}
        
    except Exception as e:
        print(f"Error checking cooldown: {e}")
        return {'allowed': True, 'reason': 'OK', 'wait_seconds': 0}


def check_institution_token_limit(user_id: str) -> Dict:
    """
    Check institution token limits with dynamic throttling
    
    Returns max tokens allowed based on usage percentage
    """
    try:
        db = get_db()
        
        # Get user's institution
        user = db.table("users")\
            .select("institution_id, subscription_id")\
            .eq("id", user_id)\
            .single()\
            .execute()
        
        if not user.data or not user.data.get("institution_id"):
            return {'allowed': True, 'max_tokens': 5000}  # Non-institution user
        
        subscription_id = user.data.get("subscription_id")
        if not subscription_id:
            return {'allowed': True, 'max_tokens': 3000}
        
        # Get subscription token usage
        subscription = db.table("subscriptions")\
            .select("output_tokens_allocated, output_tokens_used")\
            .eq("id", subscription_id)\
            .single()\
            .execute()
        
        if not subscription.data:
            return {'allowed': True, 'max_tokens': 3000}
        
        allocated = subscription.data.get("output_tokens_allocated", 0) or 0
        used = subscription.data.get("output_tokens_used", 0) or 0
        
        if allocated == 0:
            return {'allowed': True, 'max_tokens': 3000}
        
        # Calculate usage percentage
        usage_percent = (used / allocated) * 100
        
        limits = USAGE_LIMITS['institution']
        
        # Dynamic throttling
        if usage_percent >= 100:
            return {
                'allowed': False,
                'reason': 'Institution token budget exhausted',
                'usage_percent': usage_percent,
                'max_tokens': 0
            }
        elif usage_percent >= 95:
            max_tokens = limits['throttle_at_95_percent']
            warning = "⚠️ Critical: 95% of tokens used. Contact admin to top up."
        elif usage_percent >= 90:
            max_tokens = limits['throttle_at_90_percent']
            warning = "⚠️ Warning: 90% of tokens used. Queries are throttled."
        elif usage_percent >= 80:
            max_tokens = limits['throttle_at_80_percent']
            warning = "⚠️ Notice: 80% of tokens used. Consider upgrading soon."
        else:
            max_tokens = limits['max_tokens_per_query']
            warning = None
        
        return {
            'allowed': True,
            'max_tokens': max_tokens,
            'usage_percent': usage_percent,
            'warning': warning
        }
        
    except Exception as e:
        print(f"Error checking institution limit: {e}")
        return {'allowed': True, 'max_tokens': 3000}


def track_query_in_rate_limit(user_id: str):
    """Track query for rate limiting purposes"""
    try:
        db = get_db()
        
        now = datetime.now()
        window_start = now - timedelta(minutes=15)
        window_end = now + timedelta(minutes=15)
        
        # Get or create rate limit record
        rate_limit = db.table("user_rate_limits")\
            .select("*")\
            .eq("user_id", user_id)\
            .gte("window_start", window_start.isoformat())\
            .limit(1)\
            .execute()
        
        if rate_limit.data:
            # Update existing
            record = rate_limit.data[0]
            db.table("user_rate_limits").update({
                'queries_count': record.get('queries_count', 0) + 1,
                'window_end': window_end.isoformat()
            }).eq("id", record['id']).execute()
        else:
            # Create new
            db.table("user_rate_limits").insert({
                'user_id': user_id,
                'window_start': now.isoformat(),
                'window_end': window_end.isoformat(),
                'queries_count': 1,
                'is_throttled': False
            }).execute()
        
    except Exception as e:
        print(f"Error tracking query in rate limit: {e}")


def get_throttle_message(wait_seconds: int) -> str:
    """Generate Claude-style pause message"""
    minutes = wait_seconds // 60
    seconds = wait_seconds % 60
    
    if minutes > 0:
        time_str = f"{minutes} minute{'s' if minutes > 1 else ''}"
    else:
        time_str = f"{seconds} second{'s' if seconds > 1 else ''}"
    
    messages = [
        f"You've used Firstchapter quite a bit! Let's take a {time_str} break to keep things fair for everyone. ☕",
        f"Time for a quick {time_str} pause. This helps us provide great service to all our users! 🌟",
        f"Taking a {time_str} breather after those great questions. Be right back! 📚"
    ]
    
    import random
    return random.choice(messages)


# Middleware function
def enforce_fair_usage(user_id: str) -> Dict:
    """
    Main enforcement function - call before processing query
    
    Returns:
        {
            'allowed': bool,
            'reason': str,
            'max_tokens': int,
            'wait_seconds': int,
            'message': str
        }
    
    Raises HTTPException if not allowed
    """
    try:
        # Get user tier
        tier = get_user_tier(user_id)
        
        # Check rate limits
        rate_check = check_rate_limit(user_id, tier)
        if not rate_check['allowed']:
            raise HTTPException(
                status_code=429,
                detail={
                    'error': 'Rate limit exceeded',
                    'message': rate_check.get('throttle_message') or rate_check['reason'],
                    'wait_seconds': rate_check['wait_seconds'],
                    'tier': tier
                }
            )
        
        # Check institution token limits (if applicable)
        if tier == 'institution':
            token_check = check_institution_token_limit(user_id)
            if not token_check['allowed']:
                raise HTTPException(
                    status_code=429,
                    detail={
                        'error': 'Token budget exhausted',
                        'message': token_check['reason'],
                        'usage_percent': token_check['usage_percent']
                    }
                )
            
            # Return with throttling info
            return {
                'allowed': True,
                'tier': tier,
                'max_tokens': token_check['max_tokens'],
                'warning': token_check.get('warning')
            }
        
        # Non-institution user
        limits = USAGE_LIMITS.get(tier, USAGE_LIMITS['free'])
        return {
            'allowed': True,
            'tier': tier,
            'max_tokens': limits['max_tokens_per_query']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in fair usage enforcement: {e}")
        # Fail open - allow query
        return {
            'allowed': True,
            'tier': 'free',
            'max_tokens': 1000
        }
