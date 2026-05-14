"""
Institution student invite flow.

Admin invites students by email → creates institution_students row in 'pending'
state with an invite_token + sends email with claim link.

Student clicks link → custom landing page → Clerk signup (strict email match)
→ POST /institution/students/claim-invite → flips status to 'active', sets
user_id from Clerk, fires notification to institution admin.

Endpoints:
  POST /institution/students/invite       — bulk-friendly admin endpoint
  GET  /institution/invites/{token}       — validate invite token (public, used by landing page)
  POST /institution/students/claim-invite — student finalizes signup (auth via Clerk x-user-id)
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import secrets
from database.crud import get_db


router = APIRouter()


# ──────────────────────────────────────────────────────────────────
# Helper — verify the caller is an admin of the given institution.
# ──────────────────────────────────────────────────────────────────
def verify_institution_admin(x_user_id: str, institution_id: str) -> dict:
    """
    Verifies that x_user_id is the registered Clerk admin for institution_id
    by matching against institutions.clerk_user_id (the wire-up created during
    institution wizard signup).
    """
    if not x_user_id or x_user_id == "anonymous":
        raise HTTPException(status_code=403, detail="Authentication required.")
    if not institution_id:
        raise HTTPException(status_code=400, detail="institution_id is required.")

    db = get_db()
    try:
        result = db.table("institutions")\
            .select("id, name, clerk_user_id, application_status, is_active")\
            .eq("id", institution_id)\
            .eq("clerk_user_id", x_user_id)\
            .execute()
    except Exception as e:
        print(f"❌ Institution admin verification failed: {e}")
        # Return 403 (not 500) for any auth failure — don't leak internals
        raise HTTPException(status_code=403, detail="Not authorized.")

    if not result.data or len(result.data) == 0:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to manage this institution."
        )

    inst = result.data[0]
    if inst.get("application_status") != "approved" or not inst.get("is_active"):
        raise HTTPException(status_code=403, detail="Institution is not active.")

    return inst


# ──────────────────────────────────────────────────────────────────
# POST /institution/students/invite
# ──────────────────────────────────────────────────────────────────
class StudentInviteRow(BaseModel):
    name: str
    admission_number: str
    email: EmailStr


class StudentInviteRequest(BaseModel):
    institution_id: str
    validity_period_years: int = 1     # matches existing student approval validity convention
    students: List[StudentInviteRow]   # 1 or many — same endpoint handles both


@router.post("/institution/students/invite")
def invite_students(
    request: StudentInviteRequest,
    x_user_id: str = Header(default="anonymous"),
):
    """
    Pre-creates institution_students rows in 'pending' state with invite tokens.
    Emails each student with a claim link. Idempotent on (institution_id, email):
    if a row already exists, returns a 'skipped' result for that student.
    """
    admin = verify_institution_admin(x_user_id, request.institution_id)
    db = get_db()

    # ── Validate inputs ──────────────────────────────────────
    if not request.students or len(request.students) == 0:
        raise HTTPException(status_code=400, detail="No students provided.")
    if len(request.students) > 500:
        raise HTTPException(status_code=400, detail="Cannot invite more than 500 students in one batch.")
    if request.validity_period_years < 1 or request.validity_period_years > 10:
        raise HTTPException(status_code=400, detail="Validity period must be between 1 and 10 years.")

    # ── Resolve institution name (for email content) ────────
    inst_name = "Your Institution"
    try:
        inst_res = db.table("institutions")\
            .select("name")\
            .eq("id", request.institution_id)\
            .execute()
        if inst_res.data and len(inst_res.data) > 0:
            inst_name = inst_res.data[0].get("name") or inst_name
    except Exception as e:
        print(f"⚠️ Could not resolve institution name (non-fatal): {e}")

    # ── Resolve admin display name for emails ───────────────
    # The institutions table has admin_name + contact_person_name columns.
    # Verified admin row also returned by get_authed (so we already have it).
    admin_name = "Institution Admin"
    try:
        inst_lookup = db.table("institutions")\
            .select("admin_name, contact_person_name")\
            .eq("id", request.institution_id)\
            .execute()
        if inst_lookup.data and len(inst_lookup.data) > 0:
            row = inst_lookup.data[0]
            admin_name = row.get("admin_name") or row.get("contact_person_name") or admin_name
    except Exception:
        pass

    # ── Process each student ─────────────────────────────────
    results = {"created": [], "skipped": [], "failed": []}
    now_iso = datetime.utcnow().isoformat()

    for s in request.students:
        try:
            name_clean = (s.name or "").strip()
            admission_clean = (s.admission_number or "").strip()
            email_clean = (s.email or "").strip().lower()

            if not name_clean or not admission_clean or not email_clean:
                results["failed"].append({"email": s.email, "reason": "Missing required fields"})
                continue

            # Check for existing row for this email at this institution
            existing = db.table("institution_students")\
                .select("id, application_status, student_email")\
                .eq("institution_id", request.institution_id)\
                .eq("student_email", email_clean)\
                .execute()

            if existing.data and len(existing.data) > 0:
                row = existing.data[0]
                results["skipped"].append({
                    "email": email_clean,
                    "reason": f"Already exists with status '{row.get('application_status')}'"
                })
                continue

            # Check for roll number collision at this institution
            roll_existing = db.table("institution_students")\
                .select("id")\
                .eq("institution_id", request.institution_id)\
                .eq("student_roll_number", admission_clean)\
                .execute()
            if roll_existing.data and len(roll_existing.data) > 0:
                results["skipped"].append({
                    "email": email_clean,
                    "reason": f"Roll number {admission_clean} already exists at this institution"
                })
                continue

            # Generate invite token (URL-safe)
            invite_token = secrets.token_urlsafe(32)

            # Insert invite row
            insert_data = {
                "institution_id": request.institution_id,
                "student_name": name_clean,
                "student_email": email_clean,
                "student_roll_number": admission_clean,
                "validity_period_years": request.validity_period_years,
                "application_status": "pending",  # becomes 'approved' on claim
                "applied_at": now_iso,
                "invite_token": invite_token,
                "invited_at": now_iso,
                "invited_by": x_user_id,
                "joined_via_invite": True,
                "is_active": False,
            }

            ins_res = db.table("institution_students").insert(insert_data).execute()
            if not ins_res.data:
                results["failed"].append({"email": email_clean, "reason": "DB insert failed"})
                continue

            # ✉️ Send invite email (non-fatal — record creation already succeeded)
            try:
                from utils.email_service import send_email
                from utils.email_templates import build_student_invite_email

                signup_url = f"https://www.firstchapter.ai/invite/{invite_token}"
                email = build_student_invite_email(
                    student_name=name_clean,
                    institution_name=inst_name,
                    admin_name=admin_name,
                    signup_url=signup_url,
                )
                send_email(
                    to=email_clean,
                    subject=email["subject"],
                    html=email["html"],
                    text=email["text"],
                    tags=email.get("tags"),
                )
            except Exception as e:
                print(f"⚠️ Invite email failed for {email_clean} (row was still created): {e}")

            results["created"].append({"email": email_clean, "name": name_clean})

        except Exception as e:
            err_str = str(e).lower()
            if "duplicate" in err_str or "unique constraint" in err_str:
                results["skipped"].append({"email": s.email, "reason": "Duplicate detected"})
            else:
                print(f"❌ Invite processing error for {s.email}: {e}")
                results["failed"].append({"email": s.email, "reason": "Processing error"})

    return {
        "success": True,
        "institution_id": request.institution_id,
        "summary": {
            "created": len(results["created"]),
            "skipped": len(results["skipped"]),
            "failed": len(results["failed"]),
            "total": len(request.students),
        },
        "details": results,
    }


# ──────────────────────────────────────────────────────────────────
# GET /institution/invites/{token}
# Public endpoint — used by the invite landing page to fetch context
# before the student signs up. Returns minimal info (no PII leaks beyond
# what the inviter already knows).
# ──────────────────────────────────────────────────────────────────
@router.get("/institution/invites/{token}")
def get_invite_details(token: str):
    if not token or len(token) < 16:
        raise HTTPException(status_code=400, detail="Invalid invite link.")

    db = get_db()
    try:
        result = db.table("institution_students")\
            .select("id, institution_id, student_name, student_email, "
                    "student_roll_number, validity_period_years, "
                    "invite_claimed_at, application_status, invited_at")\
            .eq("invite_token", token)\
            .execute()
    except Exception as e:
        print(f"❌ Invite lookup failed: {e}")
        raise HTTPException(status_code=500, detail="Could not validate invite link.")

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="This invite link is invalid or has expired.")

    invite = result.data[0]

    if invite.get("invite_claimed_at"):
        raise HTTPException(status_code=410, detail="This invite has already been claimed.")

    # Resolve institution name for display
    inst_name = "the institution"
    try:
        inst_res = db.table("institutions")\
            .select("name")\
            .eq("id", invite["institution_id"])\
            .execute()
        if inst_res.data and len(inst_res.data) > 0:
            inst_name = inst_res.data[0].get("name") or inst_name
    except Exception:
        pass

    return {
        "invite_token": token,
        "institution_id": invite["institution_id"],
        "institution_name": inst_name,
        "student_name": invite["student_name"],
        "student_email": invite["student_email"],
        "student_roll_number": invite["student_roll_number"],
        "validity_period_years": invite["validity_period_years"],
        "status": invite["application_status"],
    }


# ──────────────────────────────────────────────────────────────────
# POST /institution/students/claim-invite
# Called by the post-signup finalize page. Verifies:
#   - The token exists and is unclaimed
#   - The Clerk user's email matches the invited email (strict)
# Then activates the student, links Clerk user_id, fires admin notification.
# ──────────────────────────────────────────────────────────────────
class ClaimInviteRequest(BaseModel):
    invite_token: str
    clerk_email: EmailStr      # the email from the just-completed Clerk signup
    # Optional extra fields the student may fill on the finalize page
    student_year: Optional[str] = None
    student_department: Optional[str] = None
    student_course: Optional[str] = None


@router.post("/institution/students/claim-invite")
def claim_invite(
    request: ClaimInviteRequest,
    x_user_id: str = Header(default="anonymous"),
):
    if not x_user_id or x_user_id == "anonymous":
        raise HTTPException(status_code=403, detail="Authentication required.")

    db = get_db()

    # ── Fetch invite ─────────────────────────────────────────
    try:
        result = db.table("institution_students")\
            .select("id, institution_id, student_name, student_email, "
                    "student_roll_number, validity_period_years, "
                    "invite_claimed_at, application_status, invited_by")\
            .eq("invite_token", request.invite_token)\
            .execute()
    except Exception as e:
        print(f"❌ Claim invite lookup failed: {e}")
        raise HTTPException(status_code=500, detail="Invite claim failed.")

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail="Invalid invite link.")

    invite = result.data[0]

    if invite.get("invite_claimed_at"):
        raise HTTPException(status_code=410, detail="This invite has already been claimed.")

    # ── Strict email match ───────────────────────────────────
    invited_email = (invite.get("student_email") or "").strip().lower()
    clerk_email = (request.clerk_email or "").strip().lower()
    if invited_email != clerk_email:
        raise HTTPException(
            status_code=403,
            detail=f"This invite is for {invited_email}. Please sign in with that email address to accept it."
        )

    # ── Activate the student ─────────────────────────────────
    now_iso = datetime.utcnow().isoformat()
    update_data = {
        "user_id": x_user_id,                        # link to Clerk
        "application_status": "approved",
        "approved_at": now_iso,
        "approved_by": invite.get("invited_by") or "invite_system",
        "invite_claimed_at": now_iso,
        "is_active": True,
    }
    # Optional extra fields
    if request.student_year:
        update_data["student_year"] = request.student_year.strip()
    if request.student_department:
        update_data["student_department"] = request.student_department.strip()
    if request.student_course:
        update_data["student_course"] = request.student_course.strip()

    try:
        db.table("institution_students").update(update_data).eq("id", invite["id"]).execute()
    except Exception as e:
        print(f"❌ Claim activation failed: {e}")
        raise HTTPException(status_code=500, detail="Could not activate your account.")

    # ── Upsert the users table (so this student exists in public.users) ──
    try:
        existing_user = db.table("users").select("id").eq("id", x_user_id).execute()
        user_payload = {
            "institution_id": invite["institution_id"],
            "plan_type": "institution",
            "role": "reader",
            "updated_at": now_iso,
        }
        if existing_user.data and len(existing_user.data) > 0:
            db.table("users").update(user_payload).eq("id", x_user_id).execute()
        else:
            db.table("users").insert({
                "id": x_user_id,
                "email": clerk_email,
                "queries_used": 0,
                "queries_limit": 999999,
                **user_payload,
            }).execute()
    except Exception as e:
        print(f"⚠️ Could not upsert user row (non-fatal): {e}")

    # ── Fire in-app notification to institution admin ──────
    try:
        admin_user_id = invite.get("invited_by")
        if admin_user_id:
            notif_payload = {
                "user_id": admin_user_id,
                "type": "student_invite_claimed",
                "title": "Student joined via invite",
                "body": f"{invite['student_name']} has signed up and is now active.",
                "metadata": {
                    "student_email": invited_email,
                    "student_name": invite["student_name"],
                    "institution_id": invite["institution_id"],
                },
                "created_at": now_iso,
                "read": False,
            }
            try:
                db.table("notifications").insert(notif_payload).execute()
            except Exception as e:
                # Table may not exist in some envs — log and move on.
                print(f"⚠️ notifications insert skipped: {e}")
    except Exception as e:
        print(f"⚠️ Admin notification failed (non-fatal): {e}")

    return {
        "success": True,
        "institution_id": invite["institution_id"],
        "student_id": invite["id"],
        "message": "Your account is now active.",
    }
