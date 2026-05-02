"""
Institution Onboarding API
Handles institution applications, college selection, and approval workflow
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
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
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@router.get("/colleges/list")
async def get_colleges_list():
    """
    Get list of pre-defined colleges for selection dropdown.
    Returns master list from colleges table.
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        # Get all colleges, grouped by type
        colleges = db.table("colleges")\
            .select("id, name, type, city, state")\
            .order("type, name")\
            .execute()
        
        # Group by type for easier frontend display
        grouped = {}
        for college in (colleges.data or []):
            college_type = college.get("type", "Other")
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
                .select("name, type")\
                .eq("id", request.college_id)\
                .single()\
                .execute()
            
            if not college.data:
                raise HTTPException(status_code=404, detail="Selected college not found")
            
            institution_name = college.data["name"]
            institution_type = college.data["type"]
        else:
            # Use manually entered name
            institution_name = request.institution_name
            institution_type = request.institution_type or "Other"
        
        # Create institution application
        institution_data = {
            "clerk_user_id": request.clerk_user_id,
            "name": institution_name,
            "type": institution_type,
            "full_name": institution_name,
            
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
        # TODO: Get platform admin user IDs
        # For now, log to activity table
        
        # Log platform admin action needed
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
                    
                    db.table("subscriptions").insert({
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
                        "start_date": datetime.utcnow().isoformat(),
                        # Trial mode for 30 days
                        "trial_mode_until": (datetime.utcnow().replace(day=datetime.utcnow().day + 30)).isoformat(),
                        "trial_mode_active": True,
                    }).execute()
            
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
                    "tokens_allocated": request.tokens_allocated
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
        
        # Notification trigger will fire automatically from database trigger
        
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
