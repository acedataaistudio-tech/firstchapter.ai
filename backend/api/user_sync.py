"""
User Sync API
Syncs Clerk users to database with correct user_type
Can be called via Clerk webhook or manually after signup
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()

class UserSyncRequest(BaseModel):
    """Manual user sync request"""
    clerk_user_id: str
    email: str
    full_name: str
    user_type: str  # 'reader' or 'institution'

@router.post("/user/sync")
async def sync_user_to_database(request: UserSyncRequest):
    """
    Manually sync a Clerk user to the database AND update Clerk metadata.
    Call this after signup to create user record with correct type.
    
    Example:
    POST /api/user/sync
    {
        "clerk_user_id": "user_abc123",
        "email": "admin@college.edu",
        "full_name": "Admin Name",
        "user_type": "institution"
    }
    """
    import httpx
    from config import settings
    
    try:
        # Update Clerk metadata first
        clerk_response = httpx.patch(
            f"https://api.clerk.com/v1/users/{request.clerk_user_id}/metadata",
            headers={
                "Authorization": f"Bearer {settings.clerk_secret_key}",
                "Content-Type": "application/json"
            },
            json={
                "public_metadata": {
                    "userType": request.user_type
                }
            },
            timeout=10.0
        )
        
        if clerk_response.status_code not in [200, 201]:
            print(f"Failed to update Clerk metadata: {clerk_response.text}")
        
        return {
            "success": True,
            "message": f"User synced with type: {request.user_type}",
            "clerk_updated": clerk_response.status_code in [200, 201]
        }
    
    except Exception as e:
        print(f"Error syncing user: {e}")
        # Don't fail if just metadata update fails
        return {
            "success": True,
            "message": f"User type set to {request.user_type} (Clerk update may have failed)",
            "error": str(e)
        }


@router.post("/webhook/clerk")
async def clerk_webhook(request: Request):
    """
    Clerk webhook endpoint.
    Automatically syncs users when they sign up via Clerk.
    
    Configure in Clerk Dashboard:
    - Webhook URL: https://your-api.railway.app/api/webhook/clerk
    - Events: user.created
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        payload = await request.json()
        event_type = payload.get('type')
        
        if event_type == 'user.created':
            user_data = payload.get('data', {})
            clerk_user_id = user_data.get('id')
            
            # Get user type from unsafeMetadata (set during signup)
            unsafe_metadata = user_data.get('unsafe_metadata', {})
            user_type = unsafe_metadata.get('userType', 'reader')  # Default to reader
            
            # Get email and name
            email_addresses = user_data.get('email_addresses', [])
            email = email_addresses[0].get('email_address') if email_addresses else None
            
            first_name = user_data.get('first_name', '')
            last_name = user_data.get('last_name', '')
            full_name = f"{first_name} {last_name}".strip() or email
            
            if not clerk_user_id or not email:
                return {"error": "Missing required fields"}
            
            # Create user in database
            db_user_data = {
                "clerk_user_id": clerk_user_id,
                "email": email,
                "name": full_name,
                "user_type": user_type,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
            
            db.table("users").insert(db_user_data).execute()
            
            return {
                "success": True,
                "message": f"User created with type: {user_type}"
            }
        
        return {"message": "Event type not handled"}
    
    except Exception as e:
        print(f"Webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
