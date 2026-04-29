"""
MAU Management & User Purchase System - Phase 2.5
Handles:
- Monthly Active User tracking
- Additional user purchases via Razorpay
- Self-service capacity increase
- Payment webhooks
"""

from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel
from database.crud import get_db
from datetime import datetime
from typing import Optional
import os
import hmac
import hashlib

router = APIRouter()

# Razorpay configuration (set in .env)
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")


class BuyUsersRequest(BaseModel):
    users_count: int
    

class BuyUsersResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    users_count: int
    razorpay_key: str


@router.get("/institution/{institution_id}/mau")
def get_mau_stats(
    institution_id: str,
    x_user_id: str = Header(default="anonymous")
):
    """
    Get Monthly Active Users statistics for institution
    
    Shows:
    - Current month active users
    - Capacity (free + purchased)
    - Available slots
    - Usage percentage
    """
    try:
        db = get_db()
        
        # Verify user is institution admin
        user = db.table("users")\
            .select("role, institution_id")\
            .eq("id", x_user_id)\
            .single()\
            .execute()
        
        if not user.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user.data.get("role") != "institution_admin" or user.data.get("institution_id") != institution_id:
            raise HTTPException(status_code=403, detail="Not authorized for this institution")
        
        # Get current month
        current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Count active users this month
        mau_count = db.table("monthly_active_users")\
            .select("user_id", count="exact")\
            .eq("institution_id", institution_id)\
            .eq("month", current_month.date())\
            .execute()
        
        active_users = mau_count.count if mau_count else 0
        
        # Get subscription details
        subscription = db.table("subscriptions")\
            .select("free_users_limit, additional_users_purchased, total_user_capacity")\
            .eq("institution_id", institution_id)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if not subscription.data:
            return {
                "error": "No active subscription found",
                "institution_id": institution_id
            }
        
        free_limit = subscription.data.get("free_users_limit", 0) or 0
        additional = subscription.data.get("additional_users_purchased", 0) or 0
        total_capacity = subscription.data.get("total_user_capacity", 0) or free_limit + additional
        
        # Calculate percentages
        usage_percent = (active_users / total_capacity * 100) if total_capacity > 0 else 0
        
        # Get recent active users list (optional)
        recent_users = db.table("monthly_active_users")\
            .select("user_id, last_active_at, query_count")\
            .eq("institution_id", institution_id)\
            .eq("month", current_month.date())\
            .order("last_active_at", desc=True)\
            .limit(10)\
            .execute()
        
        return {
            "institution_id": institution_id,
            "current_month": current_month.date().isoformat(),
            "active_users": active_users,
            "free_users_limit": free_limit,
            "additional_users_purchased": additional,
            "total_capacity": total_capacity,
            "available_slots": max(0, total_capacity - active_users),
            "usage_percentage": round(usage_percent, 2),
            "status": get_capacity_status(usage_percent),
            "recent_active_users": recent_users.data[:5] if recent_users.data else []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_capacity_status(usage_percent: float) -> str:
    """Get status message based on usage"""
    if usage_percent >= 95:
        return "critical"  # Red alert
    elif usage_percent >= 80:
        return "warning"   # Yellow warning
    elif usage_percent >= 60:
        return "notice"    # Blue notice
    else:
        return "healthy"   # Green


@router.post("/institution/{institution_id}/buy-users", response_model=BuyUsersResponse)
def create_user_purchase_order(
    institution_id: str,
    request: BuyUsersRequest,
    x_user_id: str = Header(default="anonymous")
):
    """
    Create Razorpay order for purchasing additional users
    
    Payment flow:
    1. Create Razorpay order (this endpoint)
    2. Frontend opens Razorpay checkout
    3. User pays
    4. Razorpay webhook confirms payment
    5. Capacity auto-increases
    """
    try:
        db = get_db()
        
        # Verify user is institution admin
        user = db.table("users")\
            .select("role, institution_id")\
            .eq("id", x_user_id)\
            .single()\
            .execute()
        
        if not user.data or user.data.get("role") != "institution_admin":
            raise HTTPException(status_code=403, detail="Only institution admins can purchase users")
        
        if user.data.get("institution_id") != institution_id:
            raise HTTPException(status_code=403, detail="Not authorized for this institution")
        
        # Validate request
        if request.users_count < 1:
            raise HTTPException(status_code=400, detail="Minimum 1 user required")
        
        if request.users_count > 10000:
            raise HTTPException(status_code=400, detail="Maximum 10,000 users per purchase")
        
        # Get subscription for validity dates
        subscription = db.table("subscriptions")\
            .select("id, start_date, end_date")\
            .eq("institution_id", institution_id)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if not subscription.data:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        # Calculate amount
        price_per_user = 10000  # ₹100 in paisa
        total_amount = request.users_count * price_per_user
        
        # Create Razorpay order
        import razorpay
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        
        receipt_id = f"users_{institution_id}_{int(datetime.now().timestamp())}"
        
        order_data = {
            "amount": total_amount,
            "currency": "INR",
            "receipt": receipt_id,
            "notes": {
                "institution_id": institution_id,
                "subscription_id": subscription.data['id'],
                "users_count": request.users_count,
                "type": "additional_users",
                "admin_user_id": x_user_id
            }
        }
        
        razorpay_order = client.order.create(data=order_data)
        
        # Save pending purchase to database
        purchase_record = {
            "institution_id": institution_id,
            "subscription_id": subscription.data['id'],
            "users_purchased": request.users_count,
            "price_per_user": price_per_user,
            "total_amount": total_amount,
            "order_id": razorpay_order['id'],
            "payment_status": "pending",
            "valid_from": subscription.data['start_date'],
            "valid_until": subscription.data['end_date'],
            "is_active": False  # Will be activated on payment
        }
        
        db.table("institution_user_purchases").insert(purchase_record).execute()
        
        return BuyUsersResponse(
            order_id=razorpay_order['id'],
            amount=total_amount,
            currency="INR",
            users_count=request.users_count,
            razorpay_key=RAZORPAY_KEY_ID
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    """
    Handle Razorpay payment webhooks
    
    Auto-updates institution capacity after successful payment
    """
    try:
        # Get webhook payload
        payload_bytes = await request.body()
        payload = payload_bytes.decode('utf-8')
        
        # Get signature from headers
        signature = request.headers.get("X-Razorpay-Signature", "")
        
        # Verify webhook signature
        if not verify_webhook_signature(payload, signature):
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Parse event
        import json
        event_data = json.loads(payload)
        
        event_type = event_data.get("event")
        
        if event_type == "payment.captured":
            handle_payment_captured(event_data)
        elif event_type == "payment.failed":
            handle_payment_failed(event_data)
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"Webhook error: {e}")
        # Don't raise exception - acknowledge receipt
        return {"status": "error", "message": str(e)}


def verify_webhook_signature(payload: str, signature: str) -> bool:
    """Verify Razorpay webhook signature"""
    try:
        expected_signature = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)
    except Exception as e:
        print(f"Signature verification failed: {e}")
        return False


def handle_payment_captured(event_data: dict):
    """Handle successful payment - auto-increase capacity"""
    try:
        db = get_db()
        
        payment = event_data['payload']['payment']['entity']
        order_id = payment.get('order_id')
        payment_id = payment.get('id')
        
        if not order_id:
            print("No order_id in payment")
            return
        
        # Get purchase record
        purchase = db.table("institution_user_purchases")\
            .select("*")\
            .eq("order_id", order_id)\
            .single()\
            .execute()
        
        if not purchase.data:
            print(f"Purchase record not found for order: {order_id}")
            return
        
        purchase_data = purchase.data
        
        # Update purchase status
        db.table("institution_user_purchases").update({
            "payment_id": payment_id,
            "payment_status": "paid",
            "is_active": True
        }).eq("id", purchase_data['id']).execute()
        
        # Get current subscription
        subscription = db.table("subscriptions")\
            .select("additional_users_purchased, total_user_capacity")\
            .eq("id", purchase_data['subscription_id'])\
            .single()\
            .execute()
        
        if not subscription.data:
            print(f"Subscription not found: {purchase_data['subscription_id']}")
            return
        
        # Calculate new capacity
        current_additional = subscription.data.get("additional_users_purchased", 0) or 0
        current_capacity = subscription.data.get("total_user_capacity", 0) or 0
        
        new_additional = current_additional + purchase_data['users_purchased']
        new_capacity = current_capacity + purchase_data['users_purchased']
        
        # Update subscription
        db.table("subscriptions").update({
            "additional_users_purchased": new_additional,
            "total_user_capacity": new_capacity
        }).eq("id", purchase_data['subscription_id']).execute()
        
        print(f"✅ Capacity increased: +{purchase_data['users_purchased']} users for institution {purchase_data['institution_id']}")
        
        # TODO: Send confirmation email to admin
        
    except Exception as e:
        print(f"Error handling payment captured: {e}")


def handle_payment_failed(event_data: dict):
    """Handle failed payment"""
    try:
        db = get_db()
        
        payment = event_data['payload']['payment']['entity']
        order_id = payment.get('order_id')
        
        if order_id:
            # Update purchase status
            db.table("institution_user_purchases").update({
                "payment_status": "failed"
            }).eq("order_id", order_id).execute()
            
            print(f"❌ Payment failed for order: {order_id}")
        
    except Exception as e:
        print(f"Error handling payment failed: {e}")


@router.get("/institution/{institution_id}/user-purchases")
def get_user_purchase_history(
    institution_id: str,
    x_user_id: str = Header(default="anonymous")
):
    """Get history of additional user purchases"""
    try:
        db = get_db()
        
        # Verify authorization
        user = db.table("users")\
            .select("role, institution_id")\
            .eq("id", x_user_id)\
            .single()\
            .execute()
        
        if not user.data or user.data.get("institution_id") != institution_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get purchase history
        purchases = db.table("institution_user_purchases")\
            .select("*")\
            .eq("institution_id", institution_id)\
            .order("created_at", desc=True)\
            .execute()
        
        return {
            "institution_id": institution_id,
            "purchases": purchases.data if purchases.data else [],
            "total_users_purchased": sum(p.get("users_purchased", 0) for p in (purchases.data or []) if p.get("payment_status") == "paid"),
            "total_spent": sum(p.get("total_amount", 0) for p in (purchases.data or []) if p.get("payment_status") == "paid")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
