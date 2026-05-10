"""
Publisher self-service onboarding.

Mirrors the institution onboarding pattern:
  - Public endpoint (Clerk auth, no admin secret needed)
  - Submit application → row in `publishers` with application_status='pending'
  - Admin reviews via the admin tab (Phase 2 — separate file)
  - Approval/rejection emails fire from admin actions

This file handles ONLY the apply step. Admin approval lives in admin/publishers.py
(to be added in Phase 2).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from database.crud import get_db


router = APIRouter()


# ──────────────────────────────────────────────────────────────────
# Request model
# ──────────────────────────────────────────────────────────────────
class PublisherProfile(BaseModel):
    name: str                          # Publisher / org name
    contact_person: str
    email: EmailStr
    phone: Optional[str] = None


class PublisherPayout(BaseModel):
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    pan_number: Optional[str] = None
    gst_number: Optional[str] = None
    upi_id: Optional[str] = None


class PublisherApplicationRequest(BaseModel):
    user_id: str                       # Clerk user id
    publisher_type: str                # 'author' | 'independent' | 'traditional' | 'academic'
    profile: PublisherProfile
    payout: PublisherPayout
    agreement_accepted: bool


# ──────────────────────────────────────────────────────────────────
# POST /publisher/apply
# ──────────────────────────────────────────────────────────────────
@router.post("/publisher/apply")
async def submit_publisher_application(request: PublisherApplicationRequest):
    """
    Self-service publisher signup. Creates a `publishers` row with
    application_status='pending' for admin review.
    """
    db = get_db()

    # ── Validate ──────────────────────────────────────────────
    if not request.agreement_accepted:
        raise HTTPException(
            status_code=400,
            detail="You must accept the publisher agreement to proceed"
        )

    valid_types = {"author", "independent", "traditional", "academic"}
    if request.publisher_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"publisher_type must be one of: {sorted(valid_types)}"
        )

    name_clean = (request.profile.name or "").strip()
    contact_clean = (request.profile.contact_person or "").strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Publisher name is required")
    if not contact_clean:
        raise HTTPException(status_code=400, detail="Contact person is required")

    # At least one payout method must be provided (bank OR UPI)
    has_bank = bool(
        (request.payout.bank_name or "").strip()
        and (request.payout.account_number or "").strip()
        and (request.payout.ifsc_code or "").strip()
    )
    has_upi = bool((request.payout.upi_id or "").strip())
    if not (has_bank or has_upi):
        raise HTTPException(
            status_code=400,
            detail="Provide either complete bank details (bank, account, IFSC) or UPI ID for payout"
        )

    # ── Check for existing application ────────────────────────
    try:
        existing = db.table("publishers")\
            .select("id, application_status")\
            .eq("clerk_user_id", request.user_id)\
            .execute()

        if existing.data and len(existing.data) > 0:
            row = existing.data[0]
            status = row.get("application_status")
            if status == "pending":
                raise HTTPException(
                    status_code=400,
                    detail="You already have a pending publisher application under review"
                )
            elif status == "approved":
                raise HTTPException(
                    status_code=400,
                    detail="Your publisher account is already active"
                )
            elif status == "rejected":
                # Allow re-application after rejection? For now: block.
                # Could be relaxed later by deleting the rejected row first.
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Your previous application was not approved. "
                        "Please contact support@firstchapter.ai if you'd like to re-apply."
                    )
                )
    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠️ Pre-check for existing publisher failed: {e}")

    # ── Insert publisher row ──────────────────────────────────
    now_iso = datetime.utcnow().isoformat()
    publisher_data = {
        "name": name_clean,
        "contact_person": contact_clean,
        "email": request.profile.email,
        "phone": request.profile.phone,
        "bank_name": request.payout.bank_name,
        "account_number": request.payout.account_number,
        "ifsc_code": request.payout.ifsc_code,
        "pan_number": request.payout.pan_number,
        "gst_number": request.payout.gst_number,
        "upi_id": request.payout.upi_id,
        "publisher_type": request.publisher_type,
        "clerk_user_id": request.user_id,
        "application_status": "pending",
        "applied_at": now_iso,
        "agreement_accepted_at": now_iso,
        "is_active": False,                # Activated only on admin approval
        "is_platform_publisher": False,
        "total_books": 0,
        "total_tokens_generated": 0,
        "total_revenue_paisa": 0,
    }

    try:
        result = db.table("publishers").insert(publisher_data).execute()
    except Exception as e:
        # Surface duplicate-key violations cleanly (race condition safety)
        err_str = str(e).lower()
        if "uq_publishers_clerk_user_id" in err_str or "duplicate key" in err_str:
            raise HTTPException(
                status_code=409,
                detail="An application already exists for this account."
            )
        print(f"❌ Publisher insert failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit application")

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to submit application")

    publisher_row = result.data[0]
    publisher_id = publisher_row["id"]

    # ── ✉️ Send "application received" email (non-fatal) ─────
    try:
        from utils.email_service import send_email
        from utils.email_templates import build_publisher_application_received_email

        email = build_publisher_application_received_email(
            contact_name=contact_clean,
            publisher_name=name_clean,
        )
        send_email(
            to=request.profile.email,
            subject=email["subject"],
            html=email["html"],
            text=email["text"],
            tags=email.get("tags"),
        )
    except Exception as e:
        print(f"⚠️ Publisher application-received email skipped (non-fatal): {e}")

    return {
        "success": True,
        "publisher_id": publisher_id,
        "status": "pending",
        "message": (
            f"Application submitted for {name_clean}. "
            f"Our team will review and notify you within 2 business days."
        ),
    }
