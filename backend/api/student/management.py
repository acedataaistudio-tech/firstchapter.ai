"""
Student Management API
Handles student applications, approvals, and user management for institutions
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
    admin_name: Optional[str] = "Institution Admin"  # ✅ Made optional with default
    rejection_reason: Optional[str] = None
    # ✅ NEW: Validity period (in years) — only used on approve
    validity_years: Optional[int] = None  # None = no expiry (lifetime access)

class BulkStudentUpload(BaseModel):
    """Bulk student upload"""
    institution_id: str
    admin_user_id: str
    students: List[dict]

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
        institution_query = db.table("institutions")\
            .select("id, name, is_active, application_status")\
            .eq("id", request.institution_id)\
            .execute()

        if not institution_query.data or len(institution_query.data) == 0:
            raise HTTPException(status_code=404, detail="Institution not found")

        institution = institution_query.data[0]

        if not institution.get("is_active"):
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
            "student_department": request.department,
            "student_course": request.course,
            "student_year": str(request.year_of_study) if request.year_of_study else None,
            "application_status": "pending",
            "applied_at": datetime.utcnow().isoformat(),
        }

        result = db.table("institution_students").insert(student_data).execute()

        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create application")

        return {
            "success": True,
            "student_id": result.data[0]["id"],
            "status": "pending",
            "message": f"Application submitted to {institution['name']}. You will be notified once reviewed."
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Application failed: {str(e)}")


@router.get("/institution/{institution_id}/students")
async def get_institution_students(
    institution_id: str,
    status: Optional[str] = None
):
    """Get list of students for an institution. Optionally filter by status."""
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

        # ✅ NEW: Mark expired students inline (lazy expiry display)
        now = datetime.utcnow()
        for s in students:
            expires_at = s.get("access_expires_at")
            if expires_at and s.get("application_status") == "approved":
                try:
                    exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00")).replace(tzinfo=None)
                    s["is_expired"] = exp_dt < now
                except Exception:
                    s["is_expired"] = False
            else:
                s["is_expired"] = False

        summary = {
            "total": len(students),
            "pending": len([s for s in students if s.get("application_status") == "pending"]),
            "approved": len([s for s in students if s.get("application_status") == "approved" and not s.get("is_expired")]),
            "rejected": len([s for s in students if s.get("application_status") == "rejected"]),
            "expired": len([s for s in students if s.get("is_expired")]),
        }

        return {"students": students, "summary": summary}

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
            .order("applied_at", desc=True)\
            .execute()

        return {
            "pending_applications": result.data or [],
            "count": len(result.data or [])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch applications: {str(e)}")


# ══════════════════════════════════════════════════════════════════
# ✨ FIXED APPROVAL ENDPOINT
# ══════════════════════════════════════════════════════════════════

@router.post("/student/approve")
async def approve_or_reject_student(request: StudentApprovalRequest):
    """
    Institution admin approves or rejects student application.

    Fixes applied:
      • Removed .single() — uses .execute() with explicit null check
      • Removed reference to non-existent access_granted_at column
      • Rejection now writes to rejected_at (was incorrectly writing approved_at)
      • Subscription lookup is non-fatal (institution_users insert is best-effort)
      • Activity log RPC wrapped in try/except so logging failures don't break approval
      • Validation: action must be 'approve' or 'reject'

    New feature:
      • validity_years: optional int — sets access_expires_at on approval
    """
    from database.crud import get_db
    db = get_db()

    # ✅ Validate action up front
    if request.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")

    try:
        # ✅ FIX 1: Use .execute() instead of .single()
        student_query = db.table("institution_students")\
            .select("*")\
            .eq("id", request.student_id)\
            .execute()

        if not student_query.data or len(student_query.data) == 0:
            raise HTTPException(status_code=404, detail="Student application not found")

        student_data = student_query.data[0]

        # Don't re-process if already approved/rejected
        current_status = student_data.get("application_status")
        if current_status in ("approved", "rejected"):
            raise HTTPException(
                status_code=400,
                detail=f"Application already {current_status}"
            )

        now_iso = datetime.utcnow().isoformat()

        if request.action == "approve":
            # ═══════════════════════════════════════════════════════
            # APPROVE STUDENT
            # ═══════════════════════════════════════════════════════

            # ✅ NEW: Compute expiry if validity_years provided
            expires_at = None
            if request.validity_years and request.validity_years > 0:
                expires_at = (
                    datetime.utcnow() + timedelta(days=request.validity_years * 365)
                ).isoformat()

            # ✅ FIX 2: Removed access_granted_at (column doesn't exist)
            update_payload = {
                "application_status": "approved",
                "approved_by": request.admin_user_id,
                "approved_at": now_iso,
                "is_active": True,
            }

            # Only include validity fields if provided (so old DBs without these columns still work)
            if request.validity_years is not None:
                update_payload["access_validity_years"] = request.validity_years
            if expires_at is not None:
                update_payload["access_expires_at"] = expires_at

            db.table("institution_students")\
                .update(update_payload)\
                .eq("id", request.student_id)\
                .execute()

            # Update users table with institution_id
            try:
                user_check = db.table("users")\
                    .select("id")\
                    .eq("id", student_data["user_id"])\
                    .execute()

                if user_check.data and len(user_check.data) > 0:
                    db.table("users").update({
                        "institution_id": student_data["institution_id"],
                        "role": "reader",
                        "plan_type": "institution",
                        "updated_at": now_iso,
                    }).eq("id", student_data["user_id"]).execute()
                else:
                    db.table("users").insert({
                        "id": student_data["user_id"],
                        "email": student_data["student_email"],
                        "institution_id": student_data["institution_id"],
                        "role": "reader",
                        "plan_type": "institution",
                        "queries_used": 0,
                        "queries_limit": 999999,
                    }).execute()
            except Exception as e:
                print(f"⚠️ Could not update users table: {e}")

            # ✅ FIX 3: Subscription lookup without .single() — non-fatal
            try:
                subscription_query = db.table("subscriptions")\
                    .select("*")\
                    .eq("institution_id", student_data["institution_id"])\
                    .eq("is_active", True)\
                    .execute()

                if subscription_query.data and len(subscription_query.data) > 0:
                    sub = subscription_query.data[0]
                    total_quota = (
                        sub.get("input_tokens_allocated", 0)
                        + sub.get("output_tokens_allocated", 0)
                    )
                    student_cap_pct = sub.get("student_cap_percentage", 0.5) / 100
                    student_allocation = int(total_quota * student_cap_pct)

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
            except Exception as e:
                print(f"⚠️ Could not allocate institution_users tokens: {e}")

            # ✅ FIX 4: Wrap activity log so logging failure doesn't break approval
            try:
                db.rpc("log_institution_activity", {
                    "p_institution_id": student_data["institution_id"],
                    "p_user_id": request.admin_user_id,
                    "p_user_name": request.admin_name or "Institution Admin",
                    "p_action_type": "student_approved",
                    "p_action_description": f"Approved student: {student_data['student_name']}",
                    "p_related_entity_type": "student",
                    "p_related_entity_id": request.student_id,
                }).execute()
            except Exception as e:
                print(f"⚠️ Activity log failed (non-fatal): {e}")

            validity_msg = (
                f" (access valid for {request.validity_years} year{'s' if request.validity_years != 1 else ''})"
                if request.validity_years else ""
            )
            message = f"Student {student_data['student_name']} has been approved!{validity_msg}"

        else:
            # ═══════════════════════════════════════════════════════
            # REJECT STUDENT
            # ═══════════════════════════════════════════════════════

            # ✅ FIX 5: Use rejected_at (was incorrectly writing to approved_at)
            db.table("institution_students").update({
                "application_status": "rejected",
                "approved_by": request.admin_user_id,  # records who rejected
                "rejected_at": now_iso,
                "rejection_reason": request.rejection_reason,
                "is_active": False,
            }).eq("id", request.student_id).execute()

            try:
                db.rpc("log_institution_activity", {
                    "p_institution_id": student_data["institution_id"],
                    "p_user_id": request.admin_user_id,
                    "p_user_name": request.admin_name or "Institution Admin",
                    "p_action_type": "student_rejected",
                    "p_action_description": f"Rejected student: {student_data['student_name']}",
                    "p_related_entity_type": "student",
                    "p_related_entity_id": request.student_id,
                    "p_details": {"rejection_reason": request.rejection_reason}
                }).execute()
            except Exception as e:
                print(f"⚠️ Activity log failed (non-fatal): {e}")

            message = f"Student {student_data['student_name']} application has been rejected."

        return {
            "success": True,
            "action": request.action,
            "student_id": request.student_id,
            "message": message
        }

    except HTTPException:
        raise
    except Exception as e:
        # Log full error to Railway logs for diagnosis
        import traceback
        print(f"❌ Approval action failed: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Approval action failed: {str(e)}")


@router.get("/student/status/{user_id}")
async def get_student_application_status(user_id: str):
    """Check if student has applied to any institution and get status."""
    from database.crud import get_db
    db = get_db()

    try:
        applications = db.table("institution_students")\
            .select("*, institutions(name)")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()

        # ✅ Annotate with expiry info
        now = datetime.utcnow()
        apps = applications.data or []
        for a in apps:
            expires_at = a.get("access_expires_at")
            if expires_at and a.get("application_status") == "approved":
                try:
                    exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00")).replace(tzinfo=None)
                    a["is_expired"] = exp_dt < now
                    a["days_remaining"] = max(0, (exp_dt - now).days)
                except Exception:
                    a["is_expired"] = False
                    a["days_remaining"] = None
            else:
                a["is_expired"] = False
                a["days_remaining"] = None

        return {"applications": apps, "count": len(apps)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch status: {str(e)}")


# ══════════════════════════════════════════════════════════════════
# ✨ NEW: Scheduled cleanup endpoint for expired students
# ══════════════════════════════════════════════════════════════════

@router.post("/student/cleanup-expired")
async def cleanup_expired_students():
    """
    Deactivates students whose access_expires_at has passed.
    Call this from a scheduled job (e.g., Supabase pg_cron daily) or manually.
    """
    from database.crud import get_db
    db = get_db()

    try:
        now_iso = datetime.utcnow().isoformat()

        # Find approved + active students past their expiry
        expired_query = db.table("institution_students")\
            .select("id, user_id, institution_id, student_name, access_expires_at")\
            .eq("application_status", "approved")\
            .eq("is_active", True)\
            .lt("access_expires_at", now_iso)\
            .execute()

        expired = expired_query.data or []
        deactivated_count = 0

        for s in expired:
            try:
                # Deactivate in institution_students
                db.table("institution_students").update({
                    "is_active": False,
                    "updated_at": now_iso,
                }).eq("id", s["id"]).execute()

                # Deactivate in institution_users (token tracking)
                db.table("institution_users").update({
                    "is_active": False,
                }).eq("user_id", s["user_id"])\
                  .eq("institution_id", s["institution_id"])\
                  .execute()

                # Remove institution link from users table
                db.table("users").update({
                    "institution_id": None,
                    "plan_type": "free",
                    "updated_at": now_iso,
                }).eq("id", s["user_id"]).execute()

                deactivated_count += 1
            except Exception as e:
                print(f"⚠️ Failed to deactivate {s.get('student_name')}: {e}")

        return {
            "success": True,
            "deactivated": deactivated_count,
            "total_expired_found": len(expired),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


@router.post("/institution/students/bulk-upload")
async def bulk_upload_students(request: BulkStudentUpload):
    """Bulk upload students (CSV import). Auto-approves students during bulk upload."""
    from database.crud import get_db
    db = get_db()

    try:
        # ✅ Removed .single() here too
        subscription_query = db.table("subscriptions")\
            .select("*")\
            .eq("institution_id", request.institution_id)\
            .eq("is_active", True)\
            .execute()

        if not subscription_query.data or len(subscription_query.data) == 0:
            raise HTTPException(status_code=404, detail="No active subscription found")

        sub = subscription_query.data[0]
        total_quota = (
            sub.get("input_tokens_allocated", 0)
            + sub.get("output_tokens_allocated", 0)
        )
        student_cap_pct = sub.get("student_cap_percentage", 0.5) / 100
        student_allocation = int(total_quota * student_cap_pct)

        success_count = 0
        errors = []

        for student_data in request.students:
            try:
                db.table("institution_students").insert({
                    "institution_id": request.institution_id,
                    "user_id": student_data.get("user_id") or f"bulk_{uuid.uuid4()}",
                    "student_name": student_data["student_name"],
                    "student_email": student_data["student_email"],
                    "student_roll_number": student_data.get("student_roll_number"),
                    "student_department": student_data.get("department"),
                    "student_course": student_data.get("course"),
                    "student_year": str(student_data.get("year_of_study")) if student_data.get("year_of_study") else None,
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
