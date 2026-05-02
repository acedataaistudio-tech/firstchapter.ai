"""
Student Management API
Handles student applications, approvals, and user management for institutions
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

router = APIRouter()

# ══════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ══════════════════════════════════════════════════════════════════

class StudentApplicationRequest(BaseModel):
    """Student applies to join institution"""
    user_id: str  # Clerk user ID
    institution_id: str
    student_name: str
    student_email: EmailStr
    student_roll_number: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    year_of_study: Optional[int] = None

class StudentApprovalRequest(BaseModel):
    """Institution admin approves/rejects student"""
    student_id: str  # institution_students table ID
    action: str  # 'approve' or 'reject'
    admin_user_id: str
    admin_name: str
    rejection_reason: Optional[str] = None

class BulkStudentUpload(BaseModel):
    """Bulk student upload"""
    institution_id: str
    admin_user_id: str
    students: List[dict]  # List of student data

# ══════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@router.post("/student/apply")
async def submit_student_application(request: StudentApplicationRequest):
    """
    Student submits application to join institution.
    Creates pending application for institution admin review.
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        # Check if institution exists and is active
        institution = db.table("institutions")\
            .select("id, name, is_active, application_status")\
            .eq("id", request.institution_id)\
            .single()\
            .execute()
        
        if not institution.data:
            raise HTTPException(status_code=404, detail="Institution not found")
        
        if not institution.data.get("is_active"):
            raise HTTPException(
                status_code=400,
                detail="This institution is not currently accepting students"
            )
        
        # Check if student already applied
        existing = db.table("institution_students")\
            .select("id, application_status")\
            .eq("institution_id", request.institution_id)\
            .eq("user_id", request.user_id)\
            .execute()
        
        if existing.data and len(existing.data) > 0:
            status = existing.data[0].get("application_status")
            if status == "pending":
                raise HTTPException(
                    status_code=400,
                    detail="You already have a pending application for this institution"
                )
            elif status == "approved":
                raise HTTPException(
                    status_code=400,
                    detail="You are already a member of this institution"
                )
            elif status == "rejected":
                # Allow reapplication
                pass
        
        # Create student application
        student_data = {
            "institution_id": request.institution_id,
            "user_id": request.user_id,
            "student_name": request.student_name,
            "student_email": request.student_email,
            "student_roll_number": request.student_roll_number,
            "department": request.department,
            "course": request.course,
            "year_of_study": request.year_of_study,
            "application_status": "pending",
            "application_submitted_at": datetime.utcnow().isoformat(),
        }
        
        result = db.table("institution_students").insert(student_data).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create application")
        
        # Notification trigger will fire automatically
        
        return {
            "success": True,
            "student_id": result.data[0]["id"],
            "status": "pending",
            "message": f"Application submitted to {institution.data['name']}. You will be notified once reviewed."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Application failed: {str(e)}")

@router.get("/institution/{institution_id}/students")
async def get_institution_students(
    institution_id: str,
    status: Optional[str] = None  # Filter by status
):
    """
    Get list of students for an institution.
    Optionally filter by application status.
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        query = db.table("institution_students")\
            .select("*")\
            .eq("institution_id", institution_id)
        
        if status:
            query = query.eq("application_status", status)
        
        result = query.order("created_at", desc=True).execute()
        
        students = result.data or []
        
        # Group by status for summary
        summary = {
            "total": len(students),
            "pending": len([s for s in students if s.get("application_status") == "pending"]),
            "approved": len([s for s in students if s.get("application_status") == "approved"]),
            "rejected": len([s for s in students if s.get("application_status") == "rejected"]),
        }
        
        return {
            "students": students,
            "summary": summary
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch students: {str(e)}")

@router.get("/institution/{institution_id}/students/pending")
async def get_pending_applications(institution_id: str):
    """Get all pending student applications for institution admin review"""
    from database.crud import get_db
    db = get_db()
    
    try:
        result = db.table("institution_students")\
            .select("*")\
            .eq("institution_id", institution_id)\
            .eq("application_status", "pending")\
            .order("application_submitted_at", desc=True)\
            .execute()
        
        return {
            "pending_applications": result.data or [],
            "count": len(result.data or [])
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch applications: {str(e)}")

@router.post("/student/approve")
async def approve_or_reject_student(request: StudentApprovalRequest):
    """
    Institution admin approves or rejects student application.
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        # Get student application
        student = db.table("institution_students")\
            .select("*")\
            .eq("id", request.student_id)\
            .single()\
            .execute()
        
        if not student.data:
            raise HTTPException(status_code=404, detail="Student application not found")
        
        student_data = student.data
        
        if request.action == "approve":
            # ═══════════════════════════════════════════════════════
            # APPROVE STUDENT
            # ═══════════════════════════════════════════════════════
            
            # Update student status
            db.table("institution_students").update({
                "application_status": "approved",
                "approved_by": request.admin_user_id,
                "approved_at": datetime.utcnow().isoformat(),
                "is_active": True,
                "access_granted_at": datetime.utcnow().isoformat(),
            }).eq("id", request.student_id).execute()
            
            # Add student to institution_users table (for token tracking)
            # Get institution subscription to calculate student allocation
            subscription = db.table("subscriptions")\
                .select("*")\
                .eq("institution_id", student_data["institution_id"])\
                .eq("is_active", True)\
                .single()\
                .execute()
            
            if subscription.data:
                sub = subscription.data
                total_quota = (sub.get("input_tokens_allocated", 0) + 
                              sub.get("output_tokens_allocated", 0))
                student_cap_pct = sub.get("student_cap_percentage", 0.5) / 100
                student_allocation = int(total_quota * student_cap_pct)
                
                # Check if already exists in institution_users
                existing_user = db.table("institution_users")\
                    .select("id")\
                    .eq("institution_id", student_data["institution_id"])\
                    .eq("user_id", student_data["user_id"])\
                    .execute()
                
                if not existing_user.data:
                    db.table("institution_users").insert({
                        "institution_id": student_data["institution_id"],
                        "user_id": student_data["user_id"],
                        "student_name": student_data["student_name"],
                        "student_email": student_data["student_email"],
                        "student_roll_number": student_data.get("student_roll_number"),
                        "monthly_tokens_allocated": student_allocation,
                        "monthly_tokens_used": 0,
                        "is_active": True,
                    }).execute()
            
            # Log activity
            db.rpc("log_institution_activity", {
                "p_institution_id": student_data["institution_id"],
                "p_user_id": request.admin_user_id,
                "p_user_name": request.admin_name,
                "p_action_type": "student_approved",
                "p_action_description": f"Approved student: {student_data['student_name']}",
                "p_related_entity_type": "student",
                "p_related_entity_id": request.student_id,
            }).execute()
            
            message = f"Student {student_data['student_name']} has been approved!"
        
        else:
            # ═══════════════════════════════════════════════════════
            # REJECT STUDENT
            # ═══════════════════════════════════════════════════════
            
            db.table("institution_students").update({
                "application_status": "rejected",
                "approved_by": request.admin_user_id,
                "approved_at": datetime.utcnow().isoformat(),
                "rejection_reason": request.rejection_reason,
            }).eq("id", request.student_id).execute()
            
            # Log activity
            db.rpc("log_institution_activity", {
                "p_institution_id": student_data["institution_id"],
                "p_user_id": request.admin_user_id,
                "p_user_name": request.admin_name,
                "p_action_type": "student_rejected",
                "p_action_description": f"Rejected student: {student_data['student_name']}",
                "p_related_entity_type": "student",
                "p_related_entity_id": request.student_id,
                "p_details": {"rejection_reason": request.rejection_reason}
            }).execute()
            
            message = f"Student {student_data['student_name']} application has been rejected."
        
        # Notification trigger will fire automatically
        
        return {
            "success": True,
            "action": request.action,
            "student_id": request.student_id,
            "message": message
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Approval action failed: {str(e)}")

@router.get("/student/status/{user_id}")
async def get_student_application_status(user_id: str):
    """
    Check if student has applied to any institution and get status.
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        applications = db.table("institution_students")\
            .select("*, institutions(name)")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
        
        return {
            "applications": applications.data or [],
            "count": len(applications.data or [])
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch status: {str(e)}")

@router.post("/institution/students/bulk-upload")
async def bulk_upload_students(request: BulkStudentUpload):
    """
    Bulk upload students (CSV import).
    Auto-approves students during bulk upload.
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        # Get institution subscription for allocation calculation
        subscription = db.table("subscriptions")\
            .select("*")\
            .eq("institution_id", request.institution_id)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if not subscription.data:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        sub = subscription.data
        total_quota = (sub.get("input_tokens_allocated", 0) + 
                      sub.get("output_tokens_allocated", 0))
        student_cap_pct = sub.get("student_cap_percentage", 0.5) / 100
        student_allocation = int(total_quota * student_cap_pct)
        
        success_count = 0
        errors = []
        
        for student_data in request.students:
            try:
                # Create approved student record
                db.table("institution_students").insert({
                    "institution_id": request.institution_id,
                    "user_id": student_data.get("user_id") or f"bulk_{uuid.uuid4()}",
                    "student_name": student_data["student_name"],
                    "student_email": student_data["student_email"],
                    "student_roll_number": student_data.get("student_roll_number"),
                    "department": student_data.get("department"),
                    "course": student_data.get("course"),
                    "year_of_study": student_data.get("year_of_study"),
                    "application_status": "approved",
                    "approved_by": request.admin_user_id,
                    "approved_at": datetime.utcnow().isoformat(),
                    "is_active": True,
                }).execute()
                
                success_count += 1
            
            except Exception as e:
                errors.append({
                    "student": student_data.get("student_name"),
                    "error": str(e)
                })
        
        return {
            "success": True,
            "uploaded": success_count,
            "errors": errors,
            "message": f"Successfully uploaded {success_count} students"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk upload failed: {str(e)}")
