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
        package_response = db.table("subscription_packages")\
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
        subscription_data = {
            "user_id": request.user_id,
            "package_id": request.package_id,
            "package_name": package["name"],
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "is_active": True,
            "payment_id": request.payment_id,
            "input_tokens_allocated": package.get("input_tokens_allocated", 0),
            "output_tokens_allocated": package.get("output_tokens_allocated", 0),
            "input_tokens_used": 0,
            "output_tokens_used": 0,
        }
        
        result = db.table("subscriptions").insert(subscription_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create subscription")
        
        subscription = result.data[0]
        
        return {
            "success": True,
            "subscription": subscription,
            "message": "Subscription created successfully",
            "tokens_allocated": {
                "input": package.get("input_tokens_allocated", 0),
                "output": package.get("output_tokens_allocated", 0),
                "total": package.get("input_tokens_allocated", 0) + package.get("output_tokens_allocated", 0)
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
            .select("*, subscription_packages(*)")\
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
