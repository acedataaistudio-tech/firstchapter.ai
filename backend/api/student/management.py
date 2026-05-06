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


class StudentApplicationRequest(BaseModel):
    user_id: str
    institution_id: str
    student_name: str
    student_email: EmailStr
    student_roll_number: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    year_of_study: Optional[int] = None

class StudentApprovalRequest(BaseModel):
    student_id: str
    action: str
    admin_user_id: str
    admin_name: Optional[str] = "Institution Admin"
    rejection_reason: Optional[str] = None
    validity_years: Optional[int] = None

class BulkStudentUpload(BaseModel):
    institution_id: str
    admin_user_id: str
    students: List[dict]


# ──────────────────────────────────────────────────────────────────
# Numeric helpers — Postgres returns numeric/Decimal as strings via Supabase
# ──────────────────────────────────────────────────────────────────
def _to_int(v, default=0):
    try:
        return int(float(v)) if v is not None else default
    except (ValueError, TypeError):
        return default

def _to_float(v, default=0.0):
    try:
        return float(v) if v is not None else default
    except (ValueError, TypeError):
        return default

def _calculate_student_allocation(subscription: dict) -> int:
    """
    Per-student monthly token cap = total_pool * (student_cap_percentage / 100).
    student_cap_percentage in DB is stored as e.g. '0.50' meaning 0.50% (a
    fair-use overcommit cap), so divide by 100 to get the multiplier.
    """
    total_quota = (
        _to_int(subscription.get("input_tokens_allocated"))
        + _to_int(subscription.get("output_tokens_allocated"))
    )
    cap_pct = _to_float(subscription.get("student_cap_percentage"), default=0.5) / 100.0
    return int(total_quota * cap_pct)


# ──────────────────────────────────────────────────────────────────
# ENDPOINTS
# ──────────────────────────────────────────────────────────────────

@router.post("/student/apply")
async def submit_student_application(request: StudentApplicationRequest):
    from database.crud import get_db
    db = get_db()

    try:
        institution_query = db.table("institutions")\
            .select("id, name, is_active, application_status")\
            .eq("id", request.institution_id)\
            .execute()

        if not institution_query.data or len(institution_query.data) == 0:
            raise HTTPException(status_code=404, detail="Institution not found")

        institution = institution_query.data[0]

        if not institution.get("is_active"):
            raise HTTPException(status_code=400, detail="This institution is not currently accepting students")

        existing = db.table("institution_students")\
            .select("id, application_status")\
            .eq("institution_id", request.institution_id)\
            .eq("user_id", request.user_id)\
            .execute()

        if existing.data and len(existing.data) > 0:
            status = existing.data[0].get("application_status")
            if status == "pending":
                raise HTTPException(status_code=400, detail="You already have a pending application for this institution")
            elif status == "approved":
                raise HTTPException(status_code=400, detail="You are already a member of this institution")

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
async def get_institution_students(institution_id: str, status: Optional[str] = None):
    from database.crud import get_db
    db = get_db()
    try:
        query = db.table("institution_students").select("*").eq("institution_id", institution_id)
        if status:
            query = query.eq("application_status", status)
        result = query.order("created_at", desc=True).execute()
        students = result.data or []

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
    from database.crud import get_db
    db = get_db()
    try:
        result = db.table("institution_students")\
            .select("*")\
            .eq("institution_id", institution_id)\
            .eq("application_status", "pending")\
            .order("applied_at", desc=True)\
            .execute()
        return {"pending_applications": result.data or [], "count": len(result.data or [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch applications: {str(e)}")


@router.post("/student/approve")
async def approve_or_reject_student(request: StudentApprovalRequest):
    """
    Institution admin approves or rejects student application.
    On approval, links user to institution AND its active subscription so the
    fair-usage middleware and token-tracking can find the institution's pool.
    """
    from database.crud import get_db
    db = get_db()

    if request.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")

    try:
        student_query = db.table("institution_students")\
            .select("*")\
            .eq("id", request.student_id)\
            .execute()

        if not student_query.data or len(student_query.data) == 0:
            raise HTTPException(status_code=404, detail="Student application not found")

        student_data = student_query.data[0]

        current_status = student_data.get("application_status")
        if current_status in ("approved", "rejected"):
            raise HTTPException(status_code=400, detail=f"Application already {current_status}")

        now_iso = datetime.utcnow().isoformat()

        if request.action == "approve":
            expires_at = None
            if request.validity_years and request.validity_years > 0:
                expires_at = (datetime.utcnow() + timedelta(days=request.validity_years * 365)).isoformat()

            update_payload = {
                "application_status": "approved",
                "approved_by": request.admin_user_id,
                "approved_at": now_iso,
                "is_active": True,
            }
            if request.validity_years is not None:
                update_payload["access_validity_years"] = request.validity_years
            if expires_at is not None:
                update_payload["access_expires_at"] = expires_at

            db.table("institution_students").update(update_payload).eq("id", request.student_id).execute()

            # ✅ Look up institution's active subscription to link to the user
            inst_subscription_id = None
            subscription_data = None
            try:
                sub_query = db.table("subscriptions")\
                    .select("*")\
                    .eq("institution_id", student_data["institution_id"])\
                    .eq("is_active", True)\
                    .order("created_at", desc=True)\
                    .limit(1)\
                    .execute()
                if sub_query.data and len(sub_query.data) > 0:
                    subscription_data = sub_query.data[0]
                    inst_subscription_id = subscription_data["id"]
            except Exception as e:
                print(f"⚠️ Subscription lookup failed (non-fatal): {e}")

            # Update users table — link institution AND subscription
            try:
                user_check = db.table("users").select("id").eq("id", student_data["user_id"]).execute()

                user_payload = {
                    "institution_id": student_data["institution_id"],
                    "subscription_id": inst_subscription_id,
                    "role": "reader",
                    "plan_type": "institution",
                    "updated_at": now_iso,
                }

                if user_check.data and len(user_check.data) > 0:
                    db.table("users").update(user_payload).eq("id", student_data["user_id"]).execute()
                else:
                    db.table("users").insert({
                        "id": student_data["user_id"],
                        "email": student_data["student_email"],
                        **user_payload,
                        "queries_used": 0,
                        "queries_limit": 999999,
                    }).execute()
            except Exception as e:
                print(f"⚠️ Could not update users table: {e}")

            # Per-student token allocation (Phase 2 hybrid soft cap)
            if subscription_data:
                try:
                    student_allocation = _calculate_student_allocation(subscription_data)

                    existing_user = db.table("institution_users")\
                        .select("id")\
                        .eq("institution_id", student_data["institution_id"])\
                        .eq("user_id", student_data["user_id"])\
                        .execute()

                    iu_payload = {
                        "institution_id": student_data["institution_id"],
                        "user_id": student_data["user_id"],
                        "student_name": student_data["student_name"],
                        "student_email": student_data["student_email"],
                        "student_roll_number": student_data.get("student_roll_number"),
                        "monthly_tokens_allocated": student_allocation,
                        "monthly_tokens_used": 0,
                        "is_active": True,
                    }

                    if existing_user.data and len(existing_user.data) > 0:
                        db.table("institution_users").update(iu_payload).eq("id", existing_user.data[0]["id"]).execute()
                    else:
                        db.table("institution_users").insert(iu_payload).execute()
                except Exception as e:
                    print(f"⚠️ Could not allocate institution_users tokens: {e}")

            from utils.activity_log import log_institution_activity
            log_institution_activity(
                db,
                institution_id=student_data["institution_id"],
                user_id=request.admin_user_id,
                user_name=request.admin_name or "Institution Admin",
                action_type="student_approved",
                action_description=f"Approved student: {student_data['student_name']}",
                action_details={
                    "student_id": request.student_id,
                    "student_email": student_data.get("student_email"),
                },
            )

            validity_msg = f" (access valid for {request.validity_years} year{'s' if request.validity_years != 1 else ''})" if request.validity_years else ""
            message = f"Student {student_data['student_name']} has been approved!{validity_msg}"

        else:
            # REJECT
            db.table("institution_students").update({
                "application_status": "rejected",
                "approved_by": request.admin_user_id,
                "rejected_at": now_iso,
                "rejection_reason": request.rejection_reason,
                "is_active": False,
            }).eq("id", request.student_id).execute()

            from utils.activity_log import log_institution_activity
            log_institution_activity(
                db,
                institution_id=student_data["institution_id"],
                user_id=request.admin_user_id,
                user_name=request.admin_name or "Institution Admin",
                action_type="student_rejected",
                action_description=f"Rejected student: {student_data['student_name']}",
                action_details={
                    "student_id": request.student_id,
                    "rejection_reason": request.rejection_reason,
                },
            )

            message = f"Student {student_data['student_name']} application has been rejected."

        return {"success": True, "action": request.action, "student_id": request.student_id, "message": message}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"❌ Approval action failed: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Approval action failed: {str(e)}")


@router.get("/student/status/{user_id}")
async def get_student_application_status(user_id: str):
    from database.crud import get_db
    db = get_db()
    try:
        applications = db.table("institution_students")\
            .select("*, institutions(name)")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()

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


@router.post("/student/cleanup-expired")
async def cleanup_expired_students():
    from database.crud import get_db
    db = get_db()
    try:
        now_iso = datetime.utcnow().isoformat()
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
                db.table("institution_students").update({"is_active": False, "updated_at": now_iso}).eq("id", s["id"]).execute()
                db.table("institution_users").update({"is_active": False}).eq("user_id", s["user_id"]).eq("institution_id", s["institution_id"]).execute()
                db.table("users").update({"institution_id": None, "subscription_id": None, "plan_type": "free", "updated_at": now_iso}).eq("id", s["user_id"]).execute()
                deactivated_count += 1
            except Exception as e:
                print(f"⚠️ Failed to deactivate {s.get('student_name')}: {e}")
        return {"success": True, "deactivated": deactivated_count, "total_expired_found": len(expired)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


@router.post("/institution/students/bulk-upload")
async def bulk_upload_students(request: BulkStudentUpload):
    from database.crud import get_db
    db = get_db()
    try:
        sub_query = db.table("subscriptions")\
            .select("*")\
            .eq("institution_id", request.institution_id)\
            .eq("is_active", True)\
            .execute()

        if not sub_query.data or len(sub_query.data) == 0:
            raise HTTPException(status_code=404, detail="No active subscription found")

        subscription_data = sub_query.data[0]
        student_allocation = _calculate_student_allocation(subscription_data)
        success_count = 0
        errors = []

        for student_data in request.students:
            try:
                user_id = student_data.get("user_id") or f"bulk_{uuid.uuid4()}"
                db.table("institution_students").insert({
                    "institution_id": request.institution_id,
                    "user_id": user_id,
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

                try:
                    db.table("institution_users").insert({
                        "institution_id": request.institution_id,
                        "user_id": user_id,
                        "student_name": student_data["student_name"],
                        "student_email": student_data["student_email"],
                        "student_roll_number": student_data.get("student_roll_number"),
                        "monthly_tokens_allocated": student_allocation,
                        "monthly_tokens_used": 0,
                        "is_active": True,
                    }).execute()
                except Exception as iu_err:
                    print(f"⚠️ Could not create institution_users row: {iu_err}")

                success_count += 1
            except Exception as e:
                errors.append({"student": student_data.get("student_name"), "error": str(e)})

        return {"success": True, "uploaded": success_count, "errors": errors, "message": f"Successfully uploaded {success_count} students"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bulk upload failed: {str(e)}")
