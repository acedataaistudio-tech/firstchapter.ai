"""
Institution MAU Purchase API
Allows institutions to purchase additional MAU (Monthly Active Users)
Price: ₹100 per additional reader
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import razorpay
import os
from datetime import datetime

router = APIRouter()

# Razorpay client
razorpay_client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))
)

PRICE_PER_READER = 100  # ₹100 per additional reader

# ══════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ══════════════════════════════════════════════════════════════════

class CreateMAUOrderRequest(BaseModel):
    institution_id: str
    additional_users: int  # Number of readers to purchase
    admin_user_id: str
    admin_name: str

class VerifyMAUPaymentRequest(BaseModel):
    institution_id: str
    order_id: str
    payment_id: str
    signature: str
    additional_users: int
    admin_user_id: str
    admin_name: str

# ══════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@router.post("/institution/mau/create-order")
async def create_mau_order(request: CreateMAUOrderRequest):
    """
    Create Razorpay order for purchasing additional MAU.
    Returns order details for frontend to process payment.
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        # Validate institution has active subscription
        subscription = db.table("subscriptions")\
            .select("*")\
            .eq("institution_id", request.institution_id)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if not subscription.data:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        # Validate request
        if request.additional_users < 1:
            raise HTTPException(status_code=400, detail="Must purchase at least 1 reader")
        
        if request.additional_users > 1000:
            raise HTTPException(status_code=400, detail="Cannot purchase more than 1000 readers at once")
        
        # Calculate amount
        amount = request.additional_users * PRICE_PER_READER * 100  # Razorpay uses paise
        
        # Create Razorpay order
        order_data = {
            "amount": amount,
            "currency": "INR",
            "receipt": f"mau_{request.institution_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "notes": {
                "institution_id": request.institution_id,
                "additional_users": request.additional_users,
                "price_per_reader": PRICE_PER_READER,
                "admin_user_id": request.admin_user_id,
                "purchase_type": "additional_mau"
            }
        }
        
        razorpay_order = razorpay_client.order.create(data=order_data)
        
        # Log the purchase attempt
        db.rpc("log_institution_activity", {
            "p_institution_id": request.institution_id,
            "p_user_id": request.admin_user_id,
            "p_user_name": request.admin_name,
            "p_action_type": "mau_purchase_initiated",
            "p_action_description": f"Initiated purchase of {request.additional_users} additional readers",
            "p_details": {
                "additional_users": request.additional_users,
                "amount": amount / 100,
                "order_id": razorpay_order["id"]
            }
        }).execute()
        
        return {
            "success": True,
            "order": {
                "id": razorpay_order["id"],
                "amount": amount,
                "currency": razorpay_order["currency"],
                "additional_users": request.additional_users,
                "price_per_reader": PRICE_PER_READER
            },
            "razorpay_key": os.getenv("RAZORPAY_KEY_ID")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create order: {str(e)}")


@router.post("/institution/mau/verify-payment")
async def verify_mau_payment(request: VerifyMAUPaymentRequest):
    """
    Verify Razorpay payment and update subscription with additional MAU.
    """
    from database.crud import get_db
    import hmac
    import hashlib
    
    db = get_db()
    
    try:
        # Verify signature
        generated_signature = hmac.new(
            os.getenv("RAZORPAY_KEY_SECRET").encode(),
            f"{request.order_id}|{request.payment_id}".encode(),
            hashlib.sha256
        ).hexdigest()
        
        if generated_signature != request.signature:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        # Get subscription
        subscription = db.table("subscriptions")\
            .select("*")\
            .eq("institution_id", request.institution_id)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if not subscription.data:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        sub = subscription.data
        
        # Update subscription with additional users
        current_additional = sub.get("additional_users_purchased", 0)
        new_additional = current_additional + request.additional_users
        
        free_users = sub.get("free_users_limit", 0)
        new_total_capacity = free_users + new_additional
        
        db.table("subscriptions").update({
            "additional_users_purchased": new_additional,
            "total_user_capacity": new_total_capacity,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", sub["id"]).execute()
        
        # Record purchase in institution_user_purchases
        db.table("institution_user_purchases").insert({
            "institution_id": request.institution_id,
            "subscription_id": sub["id"],
            "purchase_type": "additional_mau",
            "quantity": request.additional_users,
            "price_per_unit": PRICE_PER_READER,
            "total_amount": request.additional_users * PRICE_PER_READER,
            "payment_method": "razorpay",
            "razorpay_order_id": request.order_id,
            "razorpay_payment_id": request.payment_id,
            "payment_status": "completed",
            "purchased_by_user_id": request.admin_user_id,
            "purchased_at": datetime.utcnow().isoformat()
        }).execute()
        
        # Log successful purchase
        db.rpc("log_institution_activity", {
            "p_institution_id": request.institution_id,
            "p_user_id": request.admin_user_id,
            "p_user_name": request.admin_name,
            "p_action_type": "mau_purchased",
            "p_action_description": f"Purchased {request.additional_users} additional readers",
            "p_details": {
                "additional_users": request.additional_users,
                "total_amount": request.additional_users * PRICE_PER_READER,
                "new_total_capacity": new_total_capacity,
                "payment_id": request.payment_id
            }
        }).execute()
        
        return {
            "success": True,
            "message": f"Successfully purchased {request.additional_users} additional readers",
            "new_capacity": new_total_capacity,
            "additional_purchased": new_additional
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")


@router.get("/institution/{institution_id}/mau-status")
async def get_mau_status(institution_id: str):
    """
    Get current MAU status for institution.
    Shows capacity, usage, and purchase history.
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        # Get subscription
        subscription = db.table("subscriptions")\
            .select("*")\
            .eq("institution_id", institution_id)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if not subscription.data:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        sub = subscription.data
        
        # Get current active students
        students = db.table("institution_students")\
            .select("id")\
            .eq("institution_id", institution_id)\
            .eq("is_active", True)\
            .execute()
        
        active_count = len(students.data or [])
        
        # Get purchase history
        purchases = db.table("institution_user_purchases")\
            .select("*")\
            .eq("institution_id", institution_id)\
            .eq("payment_status", "completed")\
            .order("purchased_at", desc=True)\
            .limit(10)\
            .execute()
        
        free_users = sub.get("free_users_limit", 0)
        additional_purchased = sub.get("additional_users_purchased", 0)
        total_capacity = sub.get("total_user_capacity", free_users)
        
        usage_percent = (active_count / total_capacity * 100) if total_capacity > 0 else 0
        
        return {
            "free_users_limit": free_users,
            "additional_purchased": additional_purchased,
            "total_capacity": total_capacity,
            "active_users": active_count,
            "remaining": total_capacity - active_count,
            "usage_percent": round(usage_percent, 1),
            "price_per_reader": PRICE_PER_READER,
            "purchase_history": purchases.data or []
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get MAU status: {str(e)}")
