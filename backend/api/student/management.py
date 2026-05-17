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
    student_name: str            # As per institutional records
    student_email: EmailStr
    student_roll_number: str     # Admission/roll number — required for verification
    year_of_admission: int       # 4-digit year (e.g., 2024)
    # Legacy / optional fields (kept for backward compatibility)
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


class StudentRemovalRequest(BaseModel):
    """
    Request to remove a student from an institution.
    Demotes them to a regular Reader on the Free plan rather than hard-deleting.
    Their account, queries, and history are preserved.
    """
    student_id: str               # institution_students.id (NOT user_id)
    institution_id: str           # For cross-institution safety check
    admin_user_id: str            # Caller's clerk_user_id (institution admin)


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

    # ── Validate required fields ─────────────────────────────────
    name_clean = (request.student_name or "").strip()
    roll_clean = (request.student_roll_number or "").strip()

    if not name_clean:
        raise HTTPException(status_code=400, detail="Full name is required")
    if not roll_clean:
        raise HTTPException(status_code=400, detail="Admission/roll number is required")

    # Year of admission must be a sensible 4-digit value.
    # We allow anything from 6 years back to current year (matches the dropdown).
    current_year = datetime.utcnow().year
    if not (current_year - 6 <= request.year_of_admission <= current_year):
        raise HTTPException(
            status_code=400,
            detail=f"Year of admission must be between {current_year - 6} and {current_year}"
        )

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

        # Check if THIS user already applied
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

        # Check if the roll number is already in use at this institution
        # (different user_id but same admission number = someone else claimed it)
        roll_in_use = db.table("institution_students")\
            .select("id, user_id, application_status")\
            .eq("institution_id", request.institution_id)\
            .eq("student_roll_number", roll_clean)\
            .execute()

        if roll_in_use.data and len(roll_in_use.data) > 0:
            # Only block if it's a different user (allow same user re-applying)
            other = next((r for r in roll_in_use.data if r.get("user_id") != request.user_id), None)
            if other:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        f"This admission/roll number is already registered with {institution['name']}. "
                        f"If this is your number, please contact your institution administrator. "
                        f"If you entered it by mistake, please double-check and try again."
                    )
                )

        student_data = {
            "institution_id": request.institution_id,
            "user_id": request.user_id,
            "student_name": name_clean,
            "student_email": request.student_email,
            "student_roll_number": roll_clean,
            "year_of_admission": request.year_of_admission,
            # Legacy/optional fields (kept for backward compatibility)
            "student_department": request.department,
            "student_course": request.course,
            "student_year": str(request.year_of_study) if request.year_of_study else None,
            "application_status": "pending",
            "applied_at": datetime.utcnow().isoformat(),
        }

        try:
            result = db.table("institution_students").insert(student_data).execute()
        except Exception as e:
            # Catch the unique constraint violation if the pre-check missed
            # something (race condition, etc.) and surface a clean error.
            err_str = str(e).lower()
            if "uq_institution_student_roll" in err_str or "duplicate key" in err_str:
                raise HTTPException(
                    status_code=409,
                    detail="This admission/roll number is already registered. Please contact your institution administrator if this is incorrect."
                )
            raise

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

            # ✉️ Send student approval welcome email (non-fatal)
            try:
                from utils.email_service import send_email
                from utils.email_templates import build_student_approved_email

                # Look up institution name
                inst_name = "your institution"
                try:
                    inst_query = db.table("institutions")\
                        .select("name")\
                        .eq("id", student_data["institution_id"])\
                        .single()\
                        .execute()
                    if inst_query.data:
                        inst_name = inst_query.data.get("name") or inst_name
                except Exception:
                    pass

                # Use the student_allocation we computed above (if available)
                token_alloc = 0
                try:
                    token_alloc = int(student_allocation) if subscription_data else 0
                except Exception:
                    token_alloc = 0

                if student_data.get("student_email"):
                    email = build_student_approved_email(
                        student_name=student_data["student_name"],
                        institution_name=inst_name,
                        validity_years=request.validity_years or 0,
                        monthly_token_allocation=token_alloc,
                    )
                    send_email(
                        to=student_data["student_email"],
                        subject=email["subject"],
                        html=email["html"],
                        text=email["text"],
                        tags=email.get("tags"),
                    )
            except Exception as e:
                print(f"⚠️ Student approval email skipped (non-fatal): {e}")

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

            # ✉️ Send student rejection email (non-fatal)
            try:
                from utils.email_service import send_email
                from utils.email_templates import build_student_rejected_email

                # Look up institution name
                inst_name = "your institution"
                try:
                    inst_query = db.table("institutions")\
                        .select("name")\
                        .eq("id", student_data["institution_id"])\
                        .single()\
                        .execute()
                    if inst_query.data:
                        inst_name = inst_query.data.get("name") or inst_name
                except Exception:
                    pass

                if student_data.get("student_email"):
                    email = build_student_rejected_email(
                        student_name=student_data["student_name"],
                        institution_name=inst_name,
                        reason=request.rejection_reason,
                    )
                    send_email(
                        to=student_data["student_email"],
                        subject=email["subject"],
                        html=email["html"],
                        text=email["text"],
                        tags=email.get("tags"),
                    )
            except Exception as e:
                print(f"⚠️ Student rejection email skipped (non-fatal): {e}")

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


@router.post("/institution/students/remove")
async def remove_student_from_institution(request: StudentRemovalRequest):
    """
    Remove a student from an institution by demoting them to a regular Reader
    on the Free plan. No data loss — their account, queries, and saved answers
    are preserved.

    Operations performed (matches the order used by /student/cleanup-expired
    for consistency, with an added step to create a new Free subscription so
    the user retains usable access):

      1. Verify the student belongs to the claimed institution
      2. Mark institution_students row inactive (status preserves audit trail)
      3. Mark institution_users row inactive (clears per-student token allocation)
      4. Look up the Free package
      5. Create a new Free subscriptions row for the user
      6. Update users row: institution_id=NULL, plan_type='free',
         subscription_id=<new free sub>, role='reader'

    Idempotency: if the institution_students row is already inactive, the
    endpoint returns success without re-doing the work, so a double-click
    can't create duplicate Free subscriptions for the same user.
    """
    from database.crud import get_db
    db = get_db()

    try:
        # ─── 1. Verify student exists and belongs to the claimed institution ─
        student_query = db.table("institution_students")\
            .select("id, user_id, institution_id, student_name, student_email, is_active, application_status")\
            .eq("id", request.student_id)\
            .execute()

        if not student_query.data or len(student_query.data) == 0:
            raise HTTPException(status_code=404, detail="Student record not found")

        student = student_query.data[0]

        # Cross-institution safety — admin can only remove students from their own institution
        if student["institution_id"] != request.institution_id:
            raise HTTPException(
                status_code=403,
                detail="Student does not belong to the specified institution"
            )

        user_id = student.get("user_id")
        if not user_id:
            # Edge case: student row exists but never linked to a user (invite not claimed yet).
            # No user demotion needed — just deactivate the institution_students row.
            db.table("institution_students")\
                .update({"is_active": False, "updated_at": datetime.utcnow().isoformat()})\
                .eq("id", request.student_id)\
                .execute()
            return {
                "success": True,
                "message": f"Removed {student.get('student_name')} (invite never claimed — no user account to demote)",
                "user_demoted": False,
            }

        # Idempotency check — if the student row is already inactive, don't re-run.
        # Prevents duplicate Free subscriptions on accidental double-click.
        if not student.get("is_active", True):
            return {
                "success": True,
                "message": f"{student.get('student_name')} was already removed",
                "user_demoted": False,
                "already_inactive": True,
            }

        now_iso = datetime.utcnow().isoformat()

        # ─── 2. Mark institution_students row inactive ────────────────────
        # Matches the cleanup_expired_students pattern: soft-deactivate
        # rather than hard-delete to preserve audit.
        db.table("institution_students")\
            .update({"is_active": False, "updated_at": now_iso})\
            .eq("id", request.student_id)\
            .execute()

        # ─── 3. Mark institution_users row inactive (token allocation) ────
        # Non-fatal — may not exist for invite-flow students.
        try:
            db.table("institution_users")\
                .update({"is_active": False})\
                .eq("user_id", user_id)\
                .eq("institution_id", student["institution_id"])\
                .execute()
        except Exception as e:
            print(f"⚠️ institution_users deactivation failed (non-fatal): {e}")

        # ─── 4. Look up Free package ──────────────────────────────────────
        free_package = None
        try:
            pkg_query = db.table("packages")\
                .select("id, name, price_yearly, price_monthly")\
                .eq("name", "Free")\
                .limit(1)\
                .execute()
            if pkg_query.data and len(pkg_query.data) > 0:
                free_package = pkg_query.data[0]
        except Exception as e:
            print(f"⚠️ Free package lookup failed: {e}")

        if not free_package:
            # We can still demote the user, but without a subscription_id they'll
            # hit the access-state gate as 'no_access'. Surface this rather than
            # silently leaving them stranded.
            raise HTTPException(
                status_code=500,
                detail="Free package not found in packages table — cannot complete demotion"
            )

        # ─── 5. Create a new Free subscriptions row ───────────────────────
        # Mirrors backend/api/subscriptions.py create_subscription for the Free tier.
        # Uses the same canonical token_economics formula so the demoted user gets
        # exactly what a fresh Free signup gets — never hardcoded numbers.
        from utils.token_economics import compute_token_allocation

        price_paise = free_package.get("price_monthly", 0) or 0
        input_tokens, output_tokens = compute_token_allocation(price_paise, billing_period="monthly")

        free_sub_data = {
            "user_id": user_id,
            "package_id": free_package["id"],
            "package_name": "Free",
            "start_date": now_iso,
            "end_date": (datetime.utcnow() + timedelta(days=36500)).isoformat(),  # ~lifetime, matches subscriptions.py
            "is_active": True,
            "input_tokens_allocated": input_tokens,
            "output_tokens_allocated": output_tokens,
            "input_tokens_used": 0,
            "output_tokens_used": 0,
        }

        # Deactivate any other active subscriptions for this user first to
        # match the create_subscription invariant (one active sub per user).
        try:
            db.table("subscriptions")\
                .update({"is_active": False})\
                .eq("user_id", user_id)\
                .eq("is_active", True)\
                .execute()
        except Exception as e:
            print(f"⚠️ Deactivating prior subscriptions failed (non-fatal): {e}")

        sub_result = db.table("subscriptions").insert(free_sub_data).execute()
        if not sub_result.data or len(sub_result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create Free subscription")
        new_subscription_id = sub_result.data[0]["id"]

        # ─── 6. Update users row — demote to Free Reader ──────────────────
        # Critical: subscription_id MUST be set to the new Free sub or the user
        # will hit "No active access" on next page load.
        db.table("users")\
            .update({
                "institution_id": None,
                "subscription_id": new_subscription_id,
                "plan_type": "free",
                "role": "reader",
                "updated_at": now_iso,
            })\
            .eq("id", user_id)\
            .execute()

        # ─── 7. Send notification email (non-fatal — same pattern as approve/reject) ─
        # Uses the build_student_removed_email template so styling matches the rest
        # of the platform's emails (branded layout, mobile-friendly, plain-text fallback).
        try:
            from utils.email_service import send_email
            from utils.email_templates import build_student_removed_email

            # Look up institution name for the email body
            institution_name = "your institution"
            try:
                inst_row = db.table("institutions")\
                    .select("name")\
                    .eq("id", student["institution_id"])\
                    .execute()
                if inst_row.data and len(inst_row.data) > 0 and inst_row.data[0].get("name"):
                    institution_name = inst_row.data[0]["name"]
            except Exception:
                pass  # institution_name fallback already set

            recipient_email = student.get("student_email")
            student_display_name = student.get("student_name") or "there"

            # Skip synthetic placeholder emails (can't be delivered)
            if recipient_email and not recipient_email.endswith("@clerk.user"):
                email = build_student_removed_email(
                    student_name=student_display_name,
                    institution_name=institution_name,
                )
                send_email(
                    to=recipient_email,
                    subject=email["subject"],
                    html=email["html"],
                    text=email["text"],
                    tags=email.get("tags"),
                )
        except Exception as e:
            print(f"⚠️ Student-removed email skipped (non-fatal): {e}")

        return {
            "success": True,
            "message": f"{student.get('student_name')} has been removed from the institution and is now a free Reader.",
            "user_demoted": True,
            "user_id": user_id,
            "new_subscription_id": new_subscription_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to remove student: {str(e)}")
