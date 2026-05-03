"""
Platform Admin API - Manage Institution Applications
Approve/reject institutions and create subscriptions
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

router = APIRouter()

ADMIN_SECRET = "firstchapter@admin2026"

def verify_admin(x_admin_secret: str = Header(...)):
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

class InstitutionApprovalRequest(BaseModel):
    institution_id: str
    action: str  # 'approve' or 'reject'
    admin_user_id: str
    admin_name: str
    rejection_reason: Optional[str] = None
    package_id: Optional[str] = None

@router.get("/list")
async def get_institution_applications(status: str = 'pending', x_admin_secret: str = Header(...)):
    """
    Get institution applications filtered by status.
    Status: pending, approved, rejected
    """
    verify_admin(x_admin_secret)
    from database.crud import get_db
    db = get_db()
    
    try:
        result = db.table("institutions")\
            .select("*")\
            .eq("application_status", status)\
            .order("application_submitted_at.desc")\
            .execute()
        
        return {
            "institutions": result.data or [],
            "count": len(result.data or [])
        }
    
    except Exception as e:
        print(f"Error fetching institutions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approve")
async def approve_or_reject_institution(request: InstitutionApprovalRequest, x_admin_secret: str = Header(...)):
    """
    Approve or reject an institution application.
    
    If approving:
    - Updates institution status to 'approved'
    - Creates subscription with token allocation from package
    - Sends notification to institution admin
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"Approve request received: action={request.action}, institution_id={request.institution_id}")
    
    try:
        verify_admin(x_admin_secret)
    except HTTPException as e:
        logger.error(f"Admin verification failed: {e.detail}")
        raise
    
    from database.crud import get_db
    db = get_db()
    
    try:
        if request.action == 'approve':
            # Get package details to create subscription
            if not request.package_id:
                raise HTTPException(status_code=400, detail="package_id required for approval")
            
            # Try to get package by ID first (UUID), then by name
            try:
                package_result = db.table("packages")\
                    .select("*")\
                    .eq("id", request.package_id)\
                    .single()\
                    .execute()
                
                if not package_result.data:
                    # Not found by UUID, try by name mapping
                    name_mapping = {
                        'basic': 'Institution Basic',
                        'pro': 'Institution Pro', 
                        'enterprise': 'Institution Enterprise'
                    }
                    package_name = name_mapping.get(request.package_id.lower())
                    if package_name:
                        package_result = db.table("packages")\
                            .select("*")\
                            .eq("name", package_name)\
                            .eq("type", "institution")\
                            .single()\
                            .execute()
                    
                    if not package_result.data:
                        raise HTTPException(status_code=404, detail=f"Package not found: {request.package_id}")
            except Exception as e:
                # Try name mapping if UUID lookup fails
                name_mapping = {
                    'basic': 'Institution Basic',
                    'pro': 'Institution Pro',
                    'enterprise': 'Institution Enterprise'
                }
                package_name = name_mapping.get(request.package_id.lower())
                if not package_name:
                    raise HTTPException(status_code=404, detail=f"Package not found: {request.package_id}")
                
                package_result = db.table("packages")\
                    .select("*")\
                    .eq("name", package_name)\
                    .eq("type", "institution")\
                    .single()\
                    .execute()
                
                if not package_result.data:
                    raise HTTPException(status_code=404, detail=f"Package not found: {package_name}")
            
            package = package_result.data
            features = package.get('features', {})
            
            # Get institution details
            institution_result = db.table("institutions")\
                .select("*")\
                .eq("id", request.institution_id)\
                .single()\
                .execute()
            
            if not institution_result.data:
                raise HTTPException(status_code=404, detail="Institution not found")
            
            institution = institution_result.data
            
            # Update institution status
            db.table("institutions").update({
                "application_status": "approved",
                "approved_at": datetime.utcnow().isoformat(),
                "approved_by": request.admin_name,
                "is_active": True
            }).eq("id", request.institution_id).execute()
            
            # Create subscription with separate input/output token allocation
            subscription_data = {
                "id": str(uuid.uuid4()),
                "institution_id": request.institution_id,
                "package_id": package['id'],  # ← Use actual UUID from package!
                "package_name": package['name'],
                "type": "institution",
                "is_active": True,
                
                # Separate token allocations
                "input_tokens_allocated": int(features.get('input_tokens', 0)),
                "output_tokens_allocated": int(features.get('output_tokens', 0)),
                "input_tokens_used": 0,
                "output_tokens_used": 0,
                
                # MAU limits
                "free_users_limit": int(features.get('free_mau', 1000)),
                "additional_users_purchased": 0,
                "total_user_capacity": int(features.get('free_mau', 1000)),
                
                # Fair Usage Policy defaults
                "student_cap_percentage": 0.5,  # 0.5% of total quota per student
                "max_tokens_per_request": 4000,
                "rate_limit_per_minute": 10,
                "allow_concurrent_requests": False,
                "quota_alerts_enabled": True,
                
                # Subscription period
                "start_date": datetime.utcnow().date().isoformat(),
                "end_date": None,  # Will be set based on payment
                "payment_status": "pending",
                
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
            
            db.table("subscriptions").insert(subscription_data).execute()
            
            # Create notification for institution admin
            db.rpc("create_notification", {
                "p_user_id": institution['clerk_user_id'],
                "p_user_role": "institution",
                "p_type": "institution_approved",
                "p_title": "🎉 Application Approved!",
                "p_message": f"Your institution has been approved! You can now start managing students.",
                "p_action_url": "/institution",
                "p_action_label": "View Dashboard",
                "p_priority": "high",
                "p_related_entity_type": "institution",
                "p_related_entity_id": request.institution_id
            }).execute()
            
            return {
                "success": True,
                "message": "Institution approved and subscription created",
                "subscription_id": subscription_data['id']
            }
        
        elif request.action == 'reject':
            # Update institution status to rejected
            db.table("institutions").update({
                "application_status": "rejected",
                "rejected_at": datetime.utcnow().isoformat(),
                "rejection_reason": request.rejection_reason,
                "is_active": False
            }).eq("id", request.institution_id).execute()
            
            # Get institution for notification
            institution_result = db.table("institutions")\
                .select("clerk_user_id")\
                .eq("id", request.institution_id)\
                .single()\
                .execute()
            
            if institution_result.data and institution_result.data.get('clerk_user_id'):
                # Send rejection notification
                db.rpc("create_notification", {
                    "p_user_id": institution_result.data['clerk_user_id'],
                    "p_user_role": "institution",
                    "p_type": "institution_rejected",
                    "p_title": "Application Not Approved",
                    "p_message": f"Reason: {request.rejection_reason or 'Not specified'}",
                    "p_action_url": None,
                    "p_action_label": None,
                    "p_priority": "normal",
                    "p_related_entity_type": "institution",
                    "p_related_entity_id": request.institution_id
                }).execute()
            
            return {
                "success": True,
                "message": "Institution application rejected"
            }
        
        else:
            raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing institution approval: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
