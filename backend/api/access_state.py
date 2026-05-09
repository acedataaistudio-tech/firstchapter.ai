"""
Access state for a user.

Exposes one endpoint that the frontend reads on home page load to know
how to render: full access, trial banner, or hard-block screen.

Three states map cleanly to the three product states:
  - 'active'         : user has an approved subscription (institutional or paid)
  - 'trial_pending'  : application pending approval; using Free-equivalent 50K quota
  - 'blocked'        : trial exhausted, application rejected, or no path to access

The state computation is a single source of truth — frontend trusts whatever
this endpoint returns rather than computing state itself.
"""

from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
from database.crud import get_db


router = APIRouter()


# Same Free-tier allocation used everywhere — keeps the model consistent.
TRIAL_TOKEN_LIMIT = 50_000


def _to_int(v, default=0):
    try:
        return int(float(v)) if v is not None else default
    except (ValueError, TypeError):
        return default


def compute_access_state(user_id: str) -> dict:
    """
    Compute the user's current access state.

    Lookup priority:
      1. Active subscription (institutional or paid individual) → 'active'
      2. Pending institution application → 'trial_pending' (or 'blocked' if exhausted)
      3. Rejected institution application with no fallback → 'blocked'
      4. None of the above → 'no_access' (treat as blocked)

    Returns a dict that the frontend can render directly:
      {
        "state":        str,
        "user_id":      str,
        "headline":     str,           # for banner / hard-block screen
        "detail":       str,
        "tokens_used":  int | None,
        "tokens_limit": int | None,
        "institution_name": str | None,
        "rejection_reason": str | None,
        "can_apply_elsewhere": bool,
      }
    """
    db = get_db()

    # ──────────────────────────────────────────────────
    # 1. Check for an active real subscription
    # ──────────────────────────────────────────────────
    user_row = None
    try:
        ur = db.table("users")\
            .select("id, subscription_id, institution_id, plan_type, role")\
            .eq("id", user_id)\
            .execute()
        if ur.data and len(ur.data) > 0:
            user_row = ur.data[0]
    except Exception as e:
        print(f"⚠️ access-state: users lookup failed: {e}")

    # Subscription via users.subscription_id
    if user_row and user_row.get("subscription_id"):
        try:
            sr = db.table("subscriptions")\
                .select("id, package_name, is_active")\
                .eq("id", user_row["subscription_id"])\
                .eq("is_active", True)\
                .execute()
            if sr.data and len(sr.data) > 0:
                return {
                    "state": "active",
                    "user_id": user_id,
                    "headline": "Active",
                    "detail": f"Your {sr.data[0].get('package_name', 'subscription')} is active.",
                    "tokens_used": None,
                    "tokens_limit": None,
                    "institution_name": None,
                    "rejection_reason": None,
                    "can_apply_elsewhere": False,
                }
        except Exception as e:
            print(f"⚠️ access-state: subscription lookup failed: {e}")

    # Subscription via institution_id (institutional users without explicit subscription_id)
    if user_row and user_row.get("institution_id"):
        try:
            sr = db.table("subscriptions")\
                .select("id, package_name")\
                .eq("institution_id", user_row["institution_id"])\
                .eq("is_active", True)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            if sr.data and len(sr.data) > 0:
                # The user's institution has an active subscription, AND the
                # user's institution_id is set — they have institutional access.
                return {
                    "state": "active",
                    "user_id": user_id,
                    "headline": "Active",
                    "detail": f"Your institutional access ({sr.data[0].get('package_name', 'subscription')}) is active.",
                    "tokens_used": None,
                    "tokens_limit": None,
                    "institution_name": None,
                    "rejection_reason": None,
                    "can_apply_elsewhere": False,
                }
        except Exception as e:
            print(f"⚠️ access-state: institution subscription lookup failed: {e}")

    # ──────────────────────────────────────────────────
    # 2. Check institution_students for pending/rejected applications
    # ──────────────────────────────────────────────────
    application = None
    try:
        ar = db.table("institution_students")\
            .select("id, institution_id, application_status, rejection_reason, created_at")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        if ar.data and len(ar.data) > 0:
            application = ar.data[0]
    except Exception as e:
        print(f"⚠️ access-state: application lookup failed: {e}")

    # Look up institution name once, if relevant
    institution_name = None
    if application and application.get("institution_id"):
        try:
            ir = db.table("institutions")\
                .select("name")\
                .eq("id", application["institution_id"])\
                .execute()
            if ir.data and len(ir.data) > 0:
                institution_name = ir.data[0].get("name")
        except Exception as e:
            print(f"⚠️ access-state: institution name lookup failed: {e}")

    # ──────────────────────────────────────────────────
    # 3. Pending application → trial Free quota
    # ──────────────────────────────────────────────────
    if application and application.get("application_status") == "pending":
        # Sum tokens used since the application was submitted
        applied_at = application.get("created_at")
        tokens_used = 0
        try:
            tu_query = db.table("token_usage")\
                .select("input_tokens, output_tokens")\
                .eq("user_id", user_id)
            if applied_at:
                tu_query = tu_query.gte("created_at", applied_at)
            tu = tu_query.execute()
            if tu.data:
                tokens_used = sum(
                    _to_int(r.get("input_tokens")) + _to_int(r.get("output_tokens"))
                    for r in tu.data
                )
        except Exception as e:
            print(f"⚠️ access-state: token_usage lookup failed: {e}")

        # If trial exhausted → blocked
        if tokens_used >= TRIAL_TOKEN_LIMIT:
            return {
                "state": "blocked",
                "user_id": user_id,
                "headline": "Trial access ended",
                "detail": (
                    f"You've used all {TRIAL_TOKEN_LIMIT:,} of your trial tokens. "
                    f"Your application to {institution_name or 'your institution'} is still pending. "
                    f"Once approved, you'll have full access to your institution's token pool. "
                    f"You may also apply to a different institution."
                ),
                "tokens_used": tokens_used,
                "tokens_limit": TRIAL_TOKEN_LIMIT,
                "institution_name": institution_name,
                "rejection_reason": None,
                "can_apply_elsewhere": True,
            }

        # Still has trial budget left
        return {
            "state": "trial_pending",
            "user_id": user_id,
            "headline": "Trial access — application pending",
            "detail": (
                f"Your application to {institution_name or 'your institution'} is pending review. "
                f"You have full access while you wait, up to {TRIAL_TOKEN_LIMIT:,} tokens. "
                f"Once approved, you'll switch to your institution's full pool."
            ),
            "tokens_used": tokens_used,
            "tokens_limit": TRIAL_TOKEN_LIMIT,
            "institution_name": institution_name,
            "rejection_reason": None,
            "can_apply_elsewhere": False,
        }

    # ──────────────────────────────────────────────────
    # 4. Rejected application → blocked
    # ──────────────────────────────────────────────────
    if application and application.get("application_status") == "rejected":
        return {
            "state": "blocked",
            "user_id": user_id,
            "headline": "Application not approved",
            "detail": (
                f"Your application to {institution_name or 'your institution'} was not approved. "
                f"You can apply to a different institution, or contact your institution administrator "
                f"to discuss the rejection."
            ),
            "tokens_used": None,
            "tokens_limit": None,
            "institution_name": institution_name,
            "rejection_reason": application.get("rejection_reason"),
            "can_apply_elsewhere": True,
        }

    # ──────────────────────────────────────────────────
    # 5. No subscription, no application — they shouldn't be on /
    # ──────────────────────────────────────────────────
    return {
        "state": "no_access",
        "user_id": user_id,
        "headline": "No active access",
        "detail": "Choose a subscription plan or apply to your institution to get started.",
        "tokens_used": None,
        "tokens_limit": None,
        "institution_name": None,
        "rejection_reason": None,
        "can_apply_elsewhere": True,
    }


@router.get("/users/access-state")
def get_access_state(user_id: str = Query(..., description="User ID")):
    """
    Returns the user's current access state. Used by the frontend home page
    to decide whether to render full access, the trial banner, or a hard block.
    """
    try:
        return compute_access_state(user_id)
    except Exception as e:
        import traceback
        print(f"❌ access-state error for {user_id}: {e}")
        traceback.print_exc()
        # On unexpected error, fail open with active state — better to let
        # the user proceed than incorrectly block them due to a logic bug.
        # The fair-usage middleware is the real enforcement layer anyway.
        raise HTTPException(status_code=500, detail=str(e))
