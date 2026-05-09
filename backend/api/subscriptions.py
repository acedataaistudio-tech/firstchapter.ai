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
    # Optional — frontend sends these from Clerk so we can populate the
    # users table on first signup. Backwards-compatible: requests without
    # them still work for existing users.
    email: Optional[str] = None
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
        # Without this, access-state returns 'no_access' for fresh signups.
        try:
            user_check = db.table("users").select("id, email, full_name").eq("id", request.user_id).execute()
            existing_user = user_check.data[0] if user_check.data and len(user_check.data) > 0 else None

            user_payload = {
                "subscription_id": subscription["id"],
                "plan_type": "individual",
                "role": "reader",
                "updated_at": datetime.utcnow().isoformat(),
            }

            # Only set email/name if provided AND not already on file (don't
            # overwrite richer existing data with what frontend sent).
            if request.email and (not existing_user or not existing_user.get("email")):
                user_payload["email"] = request.email
            if request.full_name and (not existing_user or not existing_user.get("full_name")):
                user_payload["full_name"] = request.full_name

            if existing_user:
                db.table("users").update(user_payload).eq("id", request.user_id).execute()
            else:
                # New user record — needs minimum fields
                db.table("users").insert({
                    "id": request.user_id,
                    "email": request.email or "",
                    "full_name": request.full_name or "",
                    "queries_used": 0,
                    "queries_limit": 999999,
                    **user_payload,
                }).execute()
        except Exception as e:
            print(f"⚠️ Could not link subscription to user (non-fatal): {e}")

        # ✉️ Send welcome email (non-fatal — never blocks subscription creation)
        try:
            from utils.email_service import send_email
            from utils.email_templates import build_reader_welcome_email, build_reader_payment_receipt_email

            # Look up user details for personalization
            user_row = db.table("users").select("email, full_name").eq("id", request.user_id).execute()
            user_email = None
            user_name = "there"
            if user_row.data and len(user_row.data) > 0:
                user_email = user_row.data[0].get("email")
                user_name = user_row.data[0].get("full_name") or user_name

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
