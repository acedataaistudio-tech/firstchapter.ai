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

# ══════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS FOR CLIENT_COLLEGES SYNC
# ══════════════════════════════════════════════════════════════════

def sync_to_client_colleges(db, institution_id: str, subscription_id: str):
    """
    ✨ Auto-sync approved institution to client_colleges table.
    Called after subscription is created.
    """
    try:
        # Get institution details
        institution = db.table("institutions")\
            .select("*")\
            .eq("id", institution_id)\
            .single()\
            .execute()
        
        if not institution.data:
            print(f"⚠️ Institution {institution_id} not found for sync")
            return
        
        inst = institution.data
        
        # Check if already in client_colleges
        existing = db.table("client_colleges")\
            .select("id")\
            .eq("institution_id", institution_id)\
            .execute()
        
        client_college_data = {
            "institution_id": institution_id,
            "institution_name": inst["name"],
            "institution_type": inst.get("type", "college"),
            "subscription_id": subscription_id,
            "is_client": True,
            "is_active": True,
            
            # Contact info
            "contact_email": inst.get("contact_email"),
            "contact_phone": inst.get("contact_phone"),
            "contact_person": inst.get("contact_person_name"),
            
            # Address
            "city": inst.get("city"),
            "state": inst.get("state"),
            "country": inst.get("country", "India"),
            
            # Metadata
            "synced_at": datetime.utcnow().isoformat(),
        }
        
        if existing.data and len(existing.data) > 0:
            # Update existing record
            db.table("client_colleges")\
                .update(client_college_data)\
                .eq("institution_id", institution_id)\
                .execute()
            print(f"✅ Updated client_colleges for {inst['name']}")
        else:
            # Insert new record
            db.table("client_colleges")\
                .insert(client_college_data)\
                .execute()
            print(f"✅ Synced {inst['name']} to client_colleges")
        
    except Exception as e:
        print(f"❌ Error syncing to client_colleges: {e}")
        # Don't fail the approval if sync fails - just log it

def remove_from_client_colleges(db, institution_id: str):
    """
    ✨ Remove/deactivate institution from client_colleges when deleted.
    Uses soft delete (is_active = false) to preserve history.
    """
    try:
        # Soft delete - set inactive
        result = db.table("client_colleges")\
            .update({
                "is_active": False,
                "is_client": False,
                "synced_at": datetime.utcnow().isoformat()
            })\
            .eq("institution_id", institution_id)\
            .execute()
        
        print(f"✅ Deactivated institution {institution_id} from client_colleges")
        return True
    except Exception as e:
        print(f"❌ Error removing from client_colleges: {e}")
        return False

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
                
                # Subscription period (1 year for institutional packages)
                "start_date": datetime.utcnow().date().isoformat(),
                "end_date": (datetime.utcnow().date().replace(year=datetime.utcnow().year + 1)).isoformat(),
                "payment_status": "pending",
                
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
            
            db.table("subscriptions").insert(subscription_data).execute()
            
            # ✨ NEW: Auto-sync to client_colleges
            sync_to_client_colleges(db, request.institution_id, subscription_data['id'])
            
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


@router.delete("/{institution_id}")
async def delete_institution(institution_id: str, x_admin_secret: str = Header(...)):
    """
    ✨ NEW: Delete (deactivate) an institution.
    
    Soft delete approach:
    - Sets institution is_active = false
    - Deactivates subscription
    - Removes from client_colleges (soft delete)
    """
    verify_admin(x_admin_secret)
    
    from database.crud import get_db
    db = get_db()
    
    try:
        # Check if institution exists
        institution = db.table("institutions")\
            .select("id, name")\
            .eq("id", institution_id)\
            .single()\
            .execute()
        
        if not institution.data:
            raise HTTPException(status_code=404, detail="Institution not found")
        
        # Soft delete institution
        db.table("institutions").update({
            "is_active": False,
            "application_status": "deleted",
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", institution_id).execute()
        
        # Deactivate subscription
        db.table("subscriptions").update({
            "is_active": False,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("institution_id", institution_id).execute()
        
        # Remove from client_colleges
        remove_from_client_colleges(db, institution_id)
        
        print(f"✅ Deleted institution: {institution.data['name']}")
        
        return {
            "success": True,
            "message": f"Institution {institution.data['name']} deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting institution: {e}")
        raise HTTPException(status_code=500, detail=str(e))
