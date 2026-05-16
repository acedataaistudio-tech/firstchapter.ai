"""
Subscription Management API
Creates and manages user subscriptions with token allocations
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from database.crud import get_db

router = APIRouter()

class CreateSubscriptionRequest(BaseModel):
    user_id: str
    package_id: str
    payment_id: Optional[str] = None  # None for free package
    # Optional — frontend sends from Clerk so we can populate users table
    # on first signup. Backwards-compatible.
    email: Optional[str] = None
    # Note: name is not stored in public.users (no column for it). Kept here
    # for forward-compat in case we want to log/email it, but not persisted.
    full_name: Optional[str] = None

@router.post("/subscriptions/create")
async def create_subscription(
    request: CreateSubscriptionRequest,
    x_user_id: str = Header(default="anonymous")
):
    """
    Create a new subscription for a user based on package selection.
    Assigns token allocations from the package.
    """
    db = get_db()
    
    try:
        # 1. Get package details
        package_response = db.table("packages")\
            .select("*")\
            .eq("id", request.package_id)\
            .single()\
            .execute()
        
        if not package_response.data:
            raise HTTPException(status_code=404, detail="Package not found")
        
        package = package_response.data
        
        # 2. Check if user already has an active subscription
        existing_sub = db.table("subscriptions")\
            .select("*")\
            .eq("user_id", request.user_id)\
            .eq("is_active", True)\
            .execute()
        
        if existing_sub.data:
            # Deactivate old subscription
            db.table("subscriptions")\
                .update({"is_active": False})\
                .eq("user_id", request.user_id)\
                .execute()
        
        # 3. Calculate subscription dates
        start_date = datetime.now()
        # Free package = lifetime, paid = 1 year from price_yearly
        if package["name"] == "Free" or package["price_yearly"] is None:
            end_date = start_date + timedelta(days=36500)  # 100 years (lifetime)
        else:
            end_date = start_date + timedelta(days=365)
        
        # 4. Create subscription record
        # ✅ Formula-driven token allocation from price.
        # See backend/utils/token_economics.py for the pricing model.
        # Falls back to Free tier (50K) when price = 0.
        from utils.token_economics import compute_token_allocation

        price_paise = package.get("price_monthly", 0) or 0
        input_tokens, output_tokens = compute_token_allocation(price_paise, billing_period="monthly")
        total_tokens = input_tokens + output_tokens
        
        subscription_data = {
            "user_id": request.user_id,
            "package_id": request.package_id,
            "package_name": package["name"],
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "is_active": True,
            "payment_id": request.payment_id,
            "input_tokens_allocated": input_tokens,
            "output_tokens_allocated": output_tokens,
            "input_tokens_used": 0,
            "output_tokens_used": 0,
        }
        
        result = db.table("subscriptions").insert(subscription_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create subscription")
        
        subscription = result.data[0]

        # 🔗 Ensure the users table has a row for this user, and link it to
        # the new subscription so /users/access-state finds it.
        # Without this link, access-state returns 'no_access' for fresh signups.
        #
        # Three failure modes we explicitly handle:
        # 1. Email is missing/empty   → synthesize `{user_id}@clerk.user` to satisfy NOT NULL/UNIQUE
        # 2. Email collision in users → fall back to UPDATE by id, OR if no id-match either, surface the error
        # 3. Generic exception        → surface so the frontend knows signup didn't finish cleanly
        link_failed = False
        link_failure_reason = None
        try:
            # Synthetic email fallback. Matches existing pattern in your data
            # (e.g. `user_3CwvsEsPZuXYcfPFaChxm8tBQ76@clerk.user`). Prevents
            # the empty-string UNIQUE collision that's been breaking signups.
            effective_email = (request.email or "").strip()
            if not effective_email:
                effective_email = f"{request.user_id}@clerk.user"

            user_check = db.table("users").select("id, email").eq("id", request.user_id).execute()
            existing_user = user_check.data[0] if user_check.data and len(user_check.data) > 0 else None

            user_payload = {
                "subscription_id": subscription["id"],
                "plan_type": "individual",
                "role": "reader",
                "updated_at": datetime.utcnow().isoformat(),
            }

            # Only set email if we have a real one AND existing user doesn't have a real email.
            # Don't overwrite a real email with a synthetic placeholder.
            if request.email and (not existing_user or not existing_user.get("email") or existing_user.get("email", "").endswith("@clerk.user")):
                user_payload["email"] = request.email

            if existing_user:
                db.table("users").update(user_payload).eq("id", request.user_id).execute()
            else:
                # New user record — minimum fields plus the link
                # Check email collision explicitly before INSERT to give a clear error
                if effective_email:
                    collision_check = db.table("users").select("id").eq("email", effective_email).execute()
                    if collision_check.data and len(collision_check.data) > 0:
                        # Same email exists under a DIFFERENT id — Clerk identity recreated
                        # or stale orphan row. Don't try to insert (would fail with UNIQUE).
                        # Surface this rather than swallow.
                        stale_id = collision_check.data[0].get("id")
                        raise RuntimeError(
                            f"Email '{effective_email}' is already linked to a different account "
                            f"({stale_id[:12]}...). Cannot create new user row without resolving conflict."
                        )

                db.table("users").insert({
                    "id":            request.user_id,
                    "email":         effective_email,
                    "queries_used":  0,
                    "queries_limit": 999999,
                    **user_payload,
                }).execute()
        except Exception as link_err:
            link_failed = True
            link_failure_reason = str(link_err)
            print(f"❌ Could not link subscription to user: {link_err}")

        # If the user-row linkage failed, the subscription exists but the
        # user can't actually access anything. Roll back the subscription
        # rather than leave inconsistent state.
        if link_failed:
            try:
                db.table("subscriptions").delete().eq("id", subscription["id"]).execute()
                print(f"↩️ Rolled back orphaned subscription {subscription['id']}")
            except Exception as rollback_err:
                print(f"⚠️ Rollback of orphaned subscription failed: {rollback_err}")
            raise HTTPException(
                status_code=409,
                detail=f"Could not complete subscription setup: {link_failure_reason}"
            )

        # ✉️ Send welcome email (non-fatal — never blocks subscription creation)
        try:
            from utils.email_service import send_email
            from utils.email_templates import build_reader_welcome_email, build_reader_payment_receipt_email

            # Look up user email for sending — name comes from Clerk via request
            user_row = db.table("users").select("email").eq("id", request.user_id).execute()
            user_email = request.email or None
            user_name = request.full_name or "there"
            if user_row.data and len(user_row.data) > 0:
                user_email = user_email or user_row.data[0].get("email")

            is_paid = price_paise > 0

            if user_email:
                # Welcome email
                welcome = build_reader_welcome_email(
                    user_name=user_name,
                    package_name=package["name"],
                    is_paid=is_paid,
                )
                send_email(
                    to=user_email,
                    subject=welcome["subject"],
                    html=welcome["html"],
                    text=welcome["text"],
                    tags=welcome.get("tags"),
                )

                # Payment receipt for paid plans only
                if is_paid and request.payment_id:
                    receipt = build_reader_payment_receipt_email(
                        user_name=user_name,
                        package_name=package["name"],
                        amount_inr=price_paise // 100,  # paise → rupees
                        payment_id=request.payment_id,
                        billing_cycle="monthly",
                    )
                    send_email(
                        to=user_email,
                        subject=receipt["subject"],
                        html=receipt["html"],
                        text=receipt["text"],
                        tags=receipt.get("tags"),
                    )
        except Exception as e:
            print(f"⚠️ Welcome email skipped (non-fatal): {e}")
        
        return {
            "success": True,
            "subscription": subscription,
            "message": "Subscription created successfully",
            "tokens_allocated": {
                "input": input_tokens,
                "output": output_tokens,
                "total": total_tokens
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Subscription creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subscriptions/current")
async def get_current_subscription(
    user_id: str,
    x_user_id: str = Header(default="anonymous")
):
    """
    Get user's current active subscription
    """
    db = get_db()
    
    try:
        result = db.table("subscriptions")\
            .select("*, packages(*)")\
            .eq("user_id", user_id)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if not result.data:
            return {
                "success": False,
                "subscription": None,
                "message": "No active subscription"
            }
        
        return {
            "success": True,
            "subscription": result.data
        }
        
    except Exception as e:
        print(f"Get subscription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
