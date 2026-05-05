"""
Institution Onboarding API
Handles institution applications, college selection, and approval workflow
UPDATED: Now includes auto-sync to client_colleges table
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import uuid

router = APIRouter()

# ══════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ══════════════════════════════════════════════════════════════════

class InstitutionOnboardingRequest(BaseModel):
    """Institution application form data"""
    # Admin details
    clerk_user_id: str
    admin_name: str
    admin_email: EmailStr
    
    # Institution selection
    college_id: Optional[str] = None  # If selected from list
    is_other: bool = False  # If "Other" selected
    
    # Institution details (required if is_other=True)
    institution_name: Optional[str] = None
    institution_type: Optional[str] = None  # 'university', 'college', 'school', etc.
    
    # Address
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "India"
    
    # Primary contact
    contact_email: EmailStr
    contact_phone: str
    contact_person_name: str
    contact_person_designation: str
    
    # Head of institution
    head_name: str
    head_email: EmailStr
    head_phone: str
    head_designation: str = "Principal/Director"
    
    # Package selection
    package_id: str
    package_name: str
    estimated_students: int

class InstitutionApprovalRequest(BaseModel):
    """Platform admin approval/rejection"""
    institution_id: str
    action: str  # 'approve' or 'reject'
    admin_user_id: str
    admin_name: str
    rejection_reason: Optional[str] = None
    
    # Subscription details (if approving)
    package_id: Optional[str] = None
    tokens_allocated: Optional[int] = None

# ══════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════

def sync_to_client_colleges(db, institution_id: str, subscription_id: str):
    """
    ✨ NEW: Auto-sync approved institution to client_colleges table
    
    This creates/updates the client_colleges record when an institution
    gets approved and receives a subscription.
    
    Args:
        db: Database connection
        institution_id: UUID of institution
        subscription_id: UUID of subscription
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

# ══════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@router.get("/colleges/list")
async def get_colleges_list():
    """
    Get list of pre-defined colleges for selection dropdown.
    Returns master list from colleges table.
    
    Used for: Institution registration (admin applying for their college)
    
    Note: The /colleges/client-list endpoint (for reader onboarding) 
    is now in colleges.py to ensure correct route ordering.
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        # Get all colleges, grouped by type
        colleges = db.table("colleges")\
            .select("id, name, institution_type, city, state, location")\
            .order("institution_type, name")\
            .execute()
        
        # Group by type for easier frontend display
        grouped = {}
        for college in (colleges.data or []):
            college_type = college.get("institution_type", "Other")
            if college_type not in grouped:
                grouped[college_type] = []
            grouped[college_type].append({
                "id": college["id"],
                "name": college["name"],
                "city": college.get("city"),
                "state": college.get("state"),
                "display_name": f"{college['name']}, {college.get('city', '')}"
            })
        
        return {
            "colleges": grouped,
            "total_count": len(colleges.data or [])
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch colleges: {str(e)}")

@router.post("/institution/apply")
async def submit_institution_application(request: InstitutionOnboardingRequest):
    """
    Submit new institution application.
    Creates pending application for platform admin review.
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        # Check if user already has pending/approved application
        existing = db.table("institutions")\
            .select("id, application_status")\
            .eq("clerk_user_id", request.clerk_user_id)\
            .execute()
        
        if existing.data and len(existing.data) > 0:
            status = existing.data[0].get("application_status")
            if status == "pending":
                raise HTTPException(
                    status_code=400,
                    detail="You already have a pending application. Please wait for admin review."
                )
            elif status == "approved":
                raise HTTPException(
                    status_code=400,
                    detail="Your institution is already registered."
                )
        
        # Determine institution name
        if request.college_id:
            # Get college name from master list
            college = db.table("colleges")\
                .select("name, institution_type")\
                .eq("id", request.college_id)\
                .single()\
                .execute()
            
            if not college.data:
                raise HTTPException(status_code=404, detail="Selected college not found")
            
            institution_name = college.data["name"]
            institution_type = college.data["institution_type"]
        else:
            # Use manually entered name
            institution_name = request.institution_name
            institution_type = request.institution_type or "Other"
        
        # Create institution application
        institution_data = {
            "clerk_user_id": request.clerk_user_id,
            "name": institution_name,
            "type": institution_type,
            
            # Application status
            "application_status": "pending",
            "application_submitted_at": datetime.utcnow().isoformat(),
            "onboarding_completed": True,
            
            # Address
            "address_line1": request.address_line1,
            "address_line2": request.address_line2,
            "city": request.city,
            "state": request.state,
            "postal_code": request.postal_code,
            "country": request.country,
            
            # Primary contact
            "contact_email": request.contact_email,
            "contact_phone": request.contact_phone,
            "contact_person_name": request.contact_person_name,
            "contact_person_designation": request.contact_person_designation,
            
            # Head of institution
            "head_name": request.head_name,
            "head_email": request.head_email,
            "head_phone": request.head_phone,
            "head_designation": request.head_designation,
            
            # Package request
            "requested_package_id": request.package_id,
            "requested_package_name": request.package_name,
            "estimated_students": request.estimated_students,
        }
        
        result = db.table("institutions").insert(institution_data).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create application")
        
        institution_id = result.data[0]["id"]
        
        # Create notification for platform admins
        try:
            db.rpc("create_notification", {
                "p_user_id": "platform_admin",  # TODO: Actual admin IDs
                "p_user_role": "platform_admin",
                "p_type": "institution_application",
                "p_title": "🏛️ New Institution Application",
                "p_message": f"{institution_name} has submitted an application for review.",
                "p_action_url": f"/admin/institutions/{institution_id}",
                "p_action_label": "Review Application",
                "p_priority": "high",
                "p_related_entity_type": "institution",
                "p_related_entity_id": institution_id
            }).execute()
        except:
            # Notification failure shouldn't block application
            pass
        
        return {
            "success": True,
            "institution_id": institution_id,
            "status": "pending",
            "message": "Application submitted successfully! You will be notified once it's reviewed."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Application submission failed: {str(e)}")

@router.get("/institution/status/{clerk_user_id}")
async def get_institution_application_status(clerk_user_id: str):
    """
    Check application status for institution admin.
    Returns pending/approved/rejected status.
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        institution = db.table("institutions")\
            .select("*")\
            .eq("clerk_user_id", clerk_user_id)\
            .execute()
        
        if not institution.data or len(institution.data) == 0:
            return {
                "has_application": False,
                "status": None
            }
        
        inst = institution.data[0]
        
        return {
            "has_application": True,
            "institution_id": inst["id"],
            "status": inst["application_status"],
            "institution_name": inst["name"],
            "submitted_at": inst.get("application_submitted_at"),
            "approved_at": inst.get("approved_at"),
            "rejection_reason": inst.get("rejection_reason"),
            "is_active": inst.get("is_active", False)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch status: {str(e)}")

@router.post("/institution/approve")
async def approve_or_reject_institution(request: InstitutionApprovalRequest):
    """
    Platform admin endpoint to approve/reject institution application.
    Creates subscription if approved.
    
    ✨ UPDATED: Now syncs to client_colleges automatically
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        # Get institution
        institution = db.table("institutions")\
            .select("*")\
            .eq("id", request.institution_id)\
            .single()\
            .execute()
        
        if not institution.data:
            raise HTTPException(status_code=404, detail="Institution not found")
        
        inst = institution.data
        
        if request.action == "approve":
            # ═══════════════════════════════════════════════════════
            # APPROVE APPLICATION
            # ═══════════════════════════════════════════════════════
            
            # Update institution status
            db.table("institutions").update({
                "application_status": "approved",
                "approved_by": request.admin_user_id,
                "approved_at": datetime.utcnow().isoformat(),
                "is_active": True,
                "is_verified": True,
            }).eq("id", request.institution_id).execute()
            
            subscription_id = None
            
            # Create subscription
            if request.package_id and request.tokens_allocated:
                # Get package details
                package = db.table("packages")\
                    .select("*")\
                    .eq("id", request.package_id)\
                    .single()\
                    .execute()
                
                if package.data:
                    # Calculate token split (34% input, 66% output)
                    input_tokens = int(request.tokens_allocated * 0.34)
                    output_tokens = int(request.tokens_allocated * 0.66)
                    
                    # Calculate end date (1 year from now)
                    start_date = datetime.utcnow()
                    end_date = start_date + timedelta(days=365)
                    
                    sub_result = db.table("subscriptions").insert({
                        "institution_id": request.institution_id,
                        "institution_name": inst["name"],
                        "package_id": request.package_id,
                        "package_name": package.data["name"],
                        "input_tokens_allocated": input_tokens,
                        "output_tokens_allocated": output_tokens,
                        "input_tokens_used": 0,
                        "output_tokens_used": 0,
                        "total_students": inst.get("estimated_students", 0),
                        "is_active": True,
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        # Trial mode for 30 days
                        "trial_mode_until": (start_date + timedelta(days=30)).isoformat(),
                        "trial_mode_active": True,
                    }).execute()
                    
                    if sub_result.data and len(sub_result.data) > 0:
                        subscription_id = sub_result.data[0]["id"]
                        
                        # ✨ NEW: Auto-sync to client_colleges
                        sync_to_client_colleges(db, request.institution_id, subscription_id)
            
            # Log admin action
            db.table("platform_admin_actions").insert({
                "admin_user_id": request.admin_user_id,
                "admin_name": request.admin_name,
                "action_type": "institution_approved",
                "action_description": f"Approved institution: {inst['name']}",
                "entity_type": "institution",
                "entity_id": request.institution_id,
                "details": {
                    "package_id": request.package_id,
                    "tokens_allocated": request.tokens_allocated,
                    "subscription_id": subscription_id
                }
            }).execute()
            
            message = f"Institution {inst['name']} has been approved and activated!"
        
        else:
            # ═══════════════════════════════════════════════════════
            # REJECT APPLICATION
            # ═══════════════════════════════════════════════════════
            
            db.table("institutions").update({
                "application_status": "rejected",
                "approved_by": request.admin_user_id,
                "approved_at": datetime.utcnow().isoformat(),
                "rejection_reason": request.rejection_reason,
            }).eq("id", request.institution_id).execute()
            
            # Log admin action
            db.table("platform_admin_actions").insert({
                "admin_user_id": request.admin_user_id,
                "admin_name": request.admin_name,
                "action_type": "institution_rejected",
                "action_description": f"Rejected institution: {inst['name']}",
                "entity_type": "institution",
                "entity_id": request.institution_id,
                "details": {
                    "rejection_reason": request.rejection_reason
                }
            }).execute()
            
            message = f"Institution {inst['name']} application has been rejected."
        
        return {
            "success": True,
            "action": request.action,
            "institution_id": request.institution_id,
            "message": message
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Approval action failed: {str(e)}")
