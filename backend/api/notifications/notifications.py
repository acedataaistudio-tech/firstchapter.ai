"""
Notifications API
Universal notification system for readers, institutions, publishers, platform admins
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter()

# ══════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ══════════════════════════════════════════════════════════════════

class MarkAsReadRequest(BaseModel):
    notification_id: str
    user_id: str

# ══════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@router.get("/notifications/{user_id}")
async def get_user_notifications(
    user_id: str,
    unread_only: bool = False,
    limit: int = 50
):
    """
    Get notifications for a user.
    Optionally filter to unread only.
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        query = db.table("notifications")\
            .select("*")\
            .eq("user_id", user_id)
        
        if unread_only:
            query = query.eq("is_read", False)
        
        result = query.order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        notifications = result.data or []
        
        # Count unread
        unread_count = len([n for n in notifications if not n.get("is_read")])
        
        return {
            "notifications": notifications,
            "total": len(notifications),
            "unread_count": unread_count
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch notifications: {str(e)}")

@router.post("/notifications/mark-read")
async def mark_notification_as_read(request: MarkAsReadRequest):
    """Mark a notification as read"""
    from database.crud import get_db
    db = get_db()
    
    try:
        db.table("notifications").update({
            "is_read": True,
            "read_at": datetime.utcnow().isoformat()
        }).eq("id", request.notification_id)\
          .eq("user_id", request.user_id)\
          .execute()
        
        return {"success": True}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark as read: {str(e)}")

@router.post("/notifications/mark-all-read/{user_id}")
async def mark_all_as_read(user_id: str):
    """Mark all notifications as read for a user"""
    from database.crud import get_db
    db = get_db()
    
    try:
        db.table("notifications").update({
            "is_read": True,
            "read_at": datetime.utcnow().isoformat()
        }).eq("user_id", user_id)\
          .eq("is_read", False)\
          .execute()
        
        return {"success": True}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark all as read: {str(e)}")

@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, user_id: str):
    """Delete a notification"""
    from database.crud import get_db
    db = get_db()
    
    try:
        db.table("notifications").delete()\
          .eq("id", notification_id)\
          .eq("user_id", user_id)\
          .execute()
        
        return {"success": True}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete notification: {str(e)}")

@router.get("/notifications/unread-count/{user_id}")
async def get_unread_count(user_id: str):
    """Get count of unread notifications"""
    from database.crud import get_db
    db = get_db()
    
    try:
        result = db.table("notifications")\
            .select("id", count="exact")\
            .eq("user_id", user_id)\
            .eq("is_read", False)\
            .execute()
        
        return {
            "unread_count": result.count or 0
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get count: {str(e)}")
