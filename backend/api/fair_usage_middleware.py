"""
Fair Usage Policy Middleware
Hybrid throttling for institution students:
  - Per-student soft cap (warnings 80-95%, hard block at 100%)
  - Institution pool throttling (warnings 80-95%, hard block at 100%)
  - Most restrictive limit wins for max_tokens_per_query
"""

from fastapi import HTTPException
from database.crud import get_db
from datetime import datetime, timedelta
from typing import Dict, Optional


# ──────────────────────────────────────────────────────────────────
# Tier limits
# ──────────────────────────────────────────────────────────────────
USAGE_LIMITS = {
    'free': {
        'queries_per_day': 10,
        'max_tokens_per_query': 500,
        'cooldown_after_consecutive': 5,
        'cooldown_minutes': 5,
    },
    'basic': {
        'queries_per_month': 100,
        'max_tokens_per_query': 2000,
        'cooldown_after_consecutive': 10,
        'cooldown_minutes': 2,
    },
    'premium': {
        'queries_per_month': None,
        'max_tokens_per_query': 5000,
        'cooldown_after_consecutive': 20,
        'cooldown_minutes': 1,
    },
    'institution': {
        'queries_per_month': None,
        'max_tokens_per_query': 3000,
        'cooldown_after_consecutive': 15,
        'cooldown_minutes': 3,
        'throttle_at_80_percent': 2000,
        'throttle_at_90_percent': 1000,
        'throttle_at_95_percent': 500,
    },
}


# ──────────────────────────────────────────────────────────────────
# Numeric coercion helpers (Postgres numeric → string via Supabase)
# ──────────────────────────────────────────────────────────────────
def _to_int(v, default=0):
    try:
        return int(float(v)) if v is not None else default
    except (ValueError, TypeError):
        return default


# ──────────────────────────────────────────────────────────────────
# Tier resolution
# ──────────────────────────────────────────────────────────────────
def get_user_tier(user_id: str) -> str:
    """Return user's tier — institution overrides paid tiers."""
    try:
        db = get_db()
        user_query = db.table("users")\
            .select("subscription_id, institution_id")\
            .eq("id", user_id)\
            .execute()

        if not user_query.data or len(user_query.data) == 0:
            return 'free'

        user = user_query.data[0]
        if user.get("institution_id"):
            return 'institution'

        subscription_id = user.get("subscription_id")
        if not subscription_id:
            return 'free'

        sub_query = db.table("subscriptions")\
            .select("package_id")\
            .eq("id", subscription_id)\
            .eq("is_active", True)\
            .execute()

        if not sub_query.data or len(sub_query.data) == 0:
            return 'free'

        package_id = sub_query.data[0].get("package_id")
        if not package_id:
            return 'free'

        pkg_query = db.table("packages").select("name").eq("id", package_id).execute()
        if not pkg_query.data or len(pkg_query.data) == 0:
            return 'free'

        package_name = (pkg_query.data[0].get("name") or "").lower()
        if 'premium' in package_name or 'annual' in package_name:
            return 'premium'
        elif 'basic' in package_name:
            return 'basic'
        return 'free'

    except Exception as e:
        print(f"⚠️ Error getting user tier: {e}")
        return 'free'


# ──────────────────────────────────────────────────────────────────
# Rate limit / cooldown checks (unchanged from prior logic, .single() removed)
# ──────────────────────────────────────────────────────────────────
def check_rate_limit(user_id: str, tier: str) -> Dict:
    try:
        db = get_db()
        limits = USAGE_LIMITS.get(tier, USAGE_LIMITS['free'])
        now = datetime.now()

        if limits.get('queries_per_day'):
            window_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            window_end = window_start + timedelta(days=1)

            queries_today = db.table("queries")\
                .select("id", count="exact")\
                .eq("user_id", user_id)\
                .gte("created_at", window_start.isoformat())\
                .lt("created_at", window_end.isoformat())\
                .execute()

            if (queries_today.count or 0) >= limits['queries_per_day']:
                return {
                    'allowed': False,
                    'reason': f"Daily limit reached ({limits['queries_per_day']} queries/day)",
                    'wait_seconds': int((window_end - now).total_seconds()),
                    'usage': {'queries_used': queries_today.count, 'queries_limit': limits['queries_per_day']}
                }

        if limits.get('queries_per_month'):
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_end = (month_start.replace(year=now.year + 1, month=1) if now.month == 12
                         else month_start.replace(month=now.month + 1))

            queries_month = db.table("queries")\
                .select("id", count="exact")\
                .eq("user_id", user_id)\
                .gte("created_at", month_start.isoformat())\
                .lt("created_at", month_end.isoformat())\
                .execute()

            if (queries_month.count or 0) >= limits['queries_per_month']:
                return {
                    'allowed': False,
                    'reason': f"Monthly limit reached ({limits['queries_per_month']} queries/month)",
                    'wait_seconds': int((month_end - now).total_seconds()),
                    'usage': {'queries_used': queries_month.count, 'queries_limit': limits['queries_per_month']}
                }

        cooldown_check = check_cooldown(user_id, tier, limits)
        if not cooldown_check['allowed']:
            return cooldown_check

        return {'allowed': True, 'reason': 'OK', 'wait_seconds': 0, 'usage': {}}

    except Exception as e:
        print(f"⚠️ Error checking rate limit: {e}")
        return {'allowed': True, 'reason': 'OK', 'wait_seconds': 0, 'usage': {}}


def check_cooldown(user_id: str, tier: str, limits: Dict) -> Dict:
    try:
        db = get_db()
        now = datetime.now()
        window_start = now - timedelta(minutes=15)

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

        if record.get('is_throttled') and record.get('throttle_until'):
            throttle_until = datetime.fromisoformat(record['throttle_until'].replace('Z', '+00:00')).replace(tzinfo=None)
            if throttle_until > now:
                wait_seconds = int((throttle_until - now).total_seconds())
                return {
                    'allowed': False,
                    'reason': f"Cooldown after {limits['cooldown_after_consecutive']} consecutive queries",
                    'wait_seconds': wait_seconds,
                }

        queries_count = record.get('queries_count', 0)
        if queries_count >= limits['cooldown_after_consecutive']:
            throttle_until = now + timedelta(minutes=limits['cooldown_minutes'])
            db.table("user_rate_limits").update({
                'is_throttled': True,
                'throttle_until': throttle_until.isoformat()
            }).eq("id", record['id']).execute()

            return {
                'allowed': False,
                'reason': f"Cooldown required after {queries_count} queries",
                'wait_seconds': limits['cooldown_minutes'] * 60,
            }

        return {'allowed': True, 'reason': 'OK', 'wait_seconds': 0}

    except Exception as e:
        print(f"⚠️ Error checking cooldown: {e}")
        return {'allowed': True, 'reason': 'OK', 'wait_seconds': 0}


# ──────────────────────────────────────────────────────────────────
# 🆕 INSTITUTION POOL CHECK (uses institution_id, not subscription_id)
# ──────────────────────────────────────────────────────────────────
def check_institution_pool(institution_id: str) -> Dict:
    """
    Check institution pool usage (input + output combined, take the higher %).
    Returns: {allowed, max_tokens, usage_percent, warning, reason?, base_max_tokens}

    base_max_tokens reflects the institution admin's configured max_tokens_per_request
    when the pool is below 80% utilization. Above 80%, throttle caps kick in.
    """
    try:
        db = get_db()

        sub_query = db.table("subscriptions")\
            .select("input_tokens_allocated, output_tokens_allocated, input_tokens_used, output_tokens_used, max_tokens_per_request")\
            .eq("institution_id", institution_id)\
            .eq("is_active", True)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        if not sub_query.data or len(sub_query.data) == 0:
            return {'allowed': True, 'max_tokens': USAGE_LIMITS['institution']['max_tokens_per_query'], 'usage_percent': 0}

        sub = sub_query.data[0]
        input_alloc = _to_int(sub.get("input_tokens_allocated"))
        output_alloc = _to_int(sub.get("output_tokens_allocated"))
        input_used = _to_int(sub.get("input_tokens_used"))
        output_used = _to_int(sub.get("output_tokens_used"))

        # ✅ Phase B: Use admin-configured max_tokens_per_request from subscription;
        # fall back to hardcoded default only if not configured
        configured_cap = _to_int(
            sub.get("max_tokens_per_request"),
            default=USAGE_LIMITS['institution']['max_tokens_per_query']
        )
        if configured_cap <= 0:
            configured_cap = USAGE_LIMITS['institution']['max_tokens_per_query']

        input_pct = (input_used / input_alloc * 100) if input_alloc > 0 else 0
        output_pct = (output_used / output_alloc * 100) if output_alloc > 0 else 0
        usage_percent = max(input_pct, output_pct)

        limits = USAGE_LIMITS['institution']

        if usage_percent >= 100:
            return {
                'allowed': False,
                'reason': '🛑 Your institution has used 100% of its monthly token allocation. Contact your admin to top up.',
                'usage_percent': usage_percent,
                'max_tokens': 0,
            }
        elif usage_percent >= 95:
            # Cap at the smaller of: configured cap, or 95% throttle limit
            return {'allowed': True, 'max_tokens': min(configured_cap, limits['throttle_at_95_percent']), 'usage_percent': usage_percent,
                    'warning': f"⚠️ Critical: Institution has used {usage_percent:.0f}% of monthly tokens."}
        elif usage_percent >= 90:
            return {'allowed': True, 'max_tokens': min(configured_cap, limits['throttle_at_90_percent']), 'usage_percent': usage_percent,
                    'warning': f"⚠️ Warning: Institution has used {usage_percent:.0f}% of monthly tokens."}
        elif usage_percent >= 80:
            return {'allowed': True, 'max_tokens': min(configured_cap, limits['throttle_at_80_percent']), 'usage_percent': usage_percent,
                    'warning': f"💡 Notice: Institution has used {usage_percent:.0f}% of monthly tokens."}
        else:
            # Below 80%: use full admin-configured cap
            return {'allowed': True, 'max_tokens': configured_cap, 'usage_percent': usage_percent}

    except Exception as e:
        print(f"⚠️ Error checking institution pool: {e}")
        return {'allowed': True, 'max_tokens': USAGE_LIMITS['institution']['max_tokens_per_query']}


# ──────────────────────────────────────────────────────────────────
# 🆕 PER-STUDENT SOFT CAP CHECK (Phase 2 hybrid)
# ──────────────────────────────────────────────────────────────────
def check_per_student_cap(user_id: str, institution_id: str) -> Dict:
    """
    Check per-student monthly soft cap (institution_users.monthly_tokens_allocated).
    Hybrid: warnings at 80/90/95%, hard block at 100%.
    """
    try:
        db = get_db()
        student_query = db.table("institution_users")\
            .select("monthly_tokens_allocated, monthly_tokens_used, is_active")\
            .eq("institution_id", institution_id)\
            .eq("user_id", user_id)\
            .execute()

        if not student_query.data or len(student_query.data) == 0:
            # Fail open if row missing (legacy users approved before this feature)
            return {'allowed': True, 'max_tokens': USAGE_LIMITS['institution']['max_tokens_per_query'], 'student_usage_percent': 0}

        student = student_query.data[0]

        if not student.get('is_active', True):
            return {
                'allowed': False,
                'reason': '🛑 Your institution access has been deactivated. Contact your institution admin.',
                'max_tokens': 0,
            }

        allocated = _to_int(student.get('monthly_tokens_allocated'))
        used = _to_int(student.get('monthly_tokens_used'))

        if allocated == 0:
            return {'allowed': True, 'max_tokens': USAGE_LIMITS['institution']['max_tokens_per_query'], 'student_usage_percent': 0}

        usage_percent = (used / allocated) * 100
        limits = USAGE_LIMITS['institution']

        if usage_percent >= 100:
            return {
                'allowed': False,
                'reason': "🛑 You've reached your monthly token allocation. Resets on the 1st of next month, or contact your institution admin for a top-up.",
                'student_usage_percent': usage_percent,
                'max_tokens': 0,
            }
        elif usage_percent >= 95:
            return {'allowed': True, 'max_tokens': limits['throttle_at_95_percent'], 'student_usage_percent': usage_percent,
                    'warning': f"⚠️ Critical: You've used {usage_percent:.0f}% of your monthly tokens."}
        elif usage_percent >= 90:
            return {'allowed': True, 'max_tokens': limits['throttle_at_90_percent'], 'student_usage_percent': usage_percent,
                    'warning': f"⚠️ Warning: You've used {usage_percent:.0f}% of your monthly tokens."}
        elif usage_percent >= 80:
            return {'allowed': True, 'max_tokens': limits['throttle_at_80_percent'], 'student_usage_percent': usage_percent,
                    'warning': f"💡 Notice: You've used {usage_percent:.0f}% of your monthly tokens."}
        else:
            return {'allowed': True, 'max_tokens': limits['max_tokens_per_query'], 'student_usage_percent': usage_percent}

    except Exception as e:
        print(f"⚠️ Error checking per-student cap: {e}")
        return {'allowed': True, 'max_tokens': USAGE_LIMITS['institution']['max_tokens_per_query']}


# ──────────────────────────────────────────────────────────────────
# 🆕 PHASE C: Sliding-window per-minute rate limit check (institution users)
# ──────────────────────────────────────────────────────────────────
def check_per_minute_rate_limit(user_id: str, institution_id: str) -> Dict:
    """
    Enforce institution-configured rate_limit_per_minute via sliding 60s window.

    Counts queries this user made in the last 60 seconds against the
    institution's configured limit. Hard-blocks (429) if exceeded, with a
    countdown showing seconds until the oldest in-window query rolls off.

    Returns: {allowed, reason?, wait_seconds, queries_in_window, limit}
    """
    try:
        db = get_db()

        # Get institution's configured rate limit
        sub_query = db.table("subscriptions")\
            .select("rate_limit_per_minute")\
            .eq("institution_id", institution_id)\
            .eq("is_active", True)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        if not sub_query.data or len(sub_query.data) == 0:
            return {'allowed': True}

        limit = _to_int(sub_query.data[0].get("rate_limit_per_minute"), default=15)
        if limit <= 0:
            return {'allowed': True}

        # Count this user's queries in the last 60 seconds
        from datetime import timezone
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(seconds=60)

        recent_query = db.table("queries")\
            .select("created_at", count="exact")\
            .eq("user_id", user_id)\
            .gte("created_at", window_start.isoformat())\
            .order("created_at", desc=False)\
            .execute()

        count_in_window = recent_query.count or 0

        if count_in_window >= limit:
            # Compute wait_seconds: when does the oldest query in the window roll off?
            wait_seconds = 60  # default
            if recent_query.data and len(recent_query.data) > 0:
                try:
                    oldest = recent_query.data[0].get("created_at")
                    if oldest:
                        oldest_dt = datetime.fromisoformat(oldest.replace("Z", "+00:00"))
                        rolloff = oldest_dt + timedelta(seconds=60)
                        wait_seconds = max(1, int((rolloff - now).total_seconds()))
                except Exception:
                    pass

            return {
                'allowed': False,
                'reason': f"🛑 Rate limit reached: {limit} queries/minute. Try again in {wait_seconds} second{'s' if wait_seconds != 1 else ''}.",
                'wait_seconds': wait_seconds,
                'queries_in_window': count_in_window,
                'limit': limit,
            }

        return {
            'allowed': True,
            'queries_in_window': count_in_window,
            'limit': limit,
        }

    except Exception as e:
        # Fail open — never block a query because the rate-limit check itself errored
        print(f"⚠️ Per-minute rate limit check failed (failing open): {e}")
        return {'allowed': True}


# ──────────────────────────────────────────────────────────────────
# Track query for cooldown logic
# ──────────────────────────────────────────────────────────────────
def track_query_in_rate_limit(user_id: str):
    try:
        db = get_db()
        now = datetime.now()
        window_start = now - timedelta(minutes=15)
        window_end = now + timedelta(minutes=15)

        rate_limit = db.table("user_rate_limits")\
            .select("*")\
            .eq("user_id", user_id)\
            .gte("window_start", window_start.isoformat())\
            .limit(1)\
            .execute()

        if rate_limit.data:
            record = rate_limit.data[0]
            db.table("user_rate_limits").update({
                'queries_count': record.get('queries_count', 0) + 1,
                'window_end': window_end.isoformat()
            }).eq("id", record['id']).execute()
        else:
            db.table("user_rate_limits").insert({
                'user_id': user_id,
                'window_start': now.isoformat(),
                'window_end': window_end.isoformat(),
                'queries_count': 1,
                'is_throttled': False
            }).execute()

    except Exception as e:
        print(f"⚠️ Error tracking query in rate limit: {e}")


# ──────────────────────────────────────────────────────────────────
# 🎯 MAIN ENFORCEMENT — combines all checks
# ──────────────────────────────────────────────────────────────────
def enforce_fair_usage(user_id: str) -> Dict:
    """
    Main enforcement called before processing a query.
    Returns dict with allowed/tier/max_tokens/warning. Raises 429 on hard block.
    """
    try:
        tier = get_user_tier(user_id)

        rate_check = check_rate_limit(user_id, tier)
        if not rate_check['allowed']:
            raise HTTPException(
                status_code=429,
                detail={
                    'error': 'Rate limit exceeded',
                    'message': rate_check['reason'],
                    'wait_seconds': rate_check.get('wait_seconds', 0),
                    'tier': tier,
                }
            )

        if tier == 'institution':
            # Need institution_id for both the per-student and pool checks
            db = get_db()
            user_query = db.table("users").select("institution_id").eq("id", user_id).execute()
            institution_id = None
            if user_query.data and len(user_query.data) > 0:
                institution_id = user_query.data[0].get("institution_id")

            if not institution_id:
                # Inconsistent state, fall through to default
                return {'allowed': True, 'tier': tier, 'max_tokens': USAGE_LIMITS['institution']['max_tokens_per_query']}

            # ✅ Phase C: Per-minute sliding-window rate limit (admin-configured)
            rate_minute_check = check_per_minute_rate_limit(user_id, institution_id)
            if not rate_minute_check['allowed']:
                raise HTTPException(status_code=429, detail={
                    'error': 'Rate limit exceeded',
                    'message': rate_minute_check['reason'],
                    'wait_seconds': rate_minute_check.get('wait_seconds', 60),
                    'queries_in_window': rate_minute_check.get('queries_in_window'),
                    'limit': rate_minute_check.get('limit'),
                    'tier': tier,
                })

            student_check = check_per_student_cap(user_id, institution_id)
            pool_check = check_institution_pool(institution_id)

            # Hard blocks: per-student first (more specific message)
            if not student_check['allowed']:
                raise HTTPException(status_code=429, detail={
                    'error': 'Student token cap reached',
                    'message': student_check['reason'],
                    'student_usage_percent': student_check.get('student_usage_percent'),
                })

            if not pool_check['allowed']:
                raise HTTPException(status_code=429, detail={
                    'error': 'Institution pool exhausted',
                    'message': pool_check['reason'],
                    'usage_percent': pool_check.get('usage_percent'),
                })

            # Most restrictive max_tokens wins
            max_tokens = min(
                student_check.get('max_tokens', 3000),
                pool_check.get('max_tokens', 3000),
            )

            # Combine warnings (student-level first since more relevant to user)
            warnings = []
            if student_check.get('warning'):
                warnings.append(student_check['warning'])
            if pool_check.get('warning'):
                warnings.append(pool_check['warning'])

            return {
                'allowed': True,
                'tier': tier,
                'max_tokens': max_tokens,
                'warning': ' | '.join(warnings) if warnings else None,
                'student_usage_percent': student_check.get('student_usage_percent'),
                'pool_usage_percent': pool_check.get('usage_percent'),
            }

        # Non-institution
        limits = USAGE_LIMITS.get(tier, USAGE_LIMITS['free'])
        return {'allowed': True, 'tier': tier, 'max_tokens': limits['max_tokens_per_query']}

    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠️ Error in fair usage enforcement: {e}")
        return {'allowed': True, 'tier': 'free', 'max_tokens': 1000}
