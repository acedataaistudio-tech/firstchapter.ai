"""
Admin publisher review — Phase 2 backend.

Endpoints for the platform admin to review pending publisher applications,
approve or reject them, and (on approval) set the payout rate.

Follows the same auth pattern as backend/api/admin_core.py:
  X-Admin-Secret header → verify_admin()

Endpoints:
  GET  /admin/publishers/pending        — list pending applications
  GET  /admin/publishers/all            — list all publishers (any status)
  POST /admin/publishers/review         — approve or reject a specific publisher
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from database.crud import get_db


router = APIRouter()


# Same secret used elsewhere in admin_core.py — keep in sync if rotated.
ADMIN_SECRET = "firstchapter@admin2026"

def verify_admin(x_admin_secret: str = Header(...)):
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ──────────────────────────────────────────────────────────────────
# GET /admin/publishers/pending
# ──────────────────────────────────────────────────────────────────
@router.get("/admin/publishers/pending")
def list_pending_publishers(x_admin_secret: str = Header(...)):
    """
    Returns all publisher applications awaiting admin review.
    Includes full publisher and payout details so admin can verify identity
    and bank/payout information before approval.
    """
    verify_admin(x_admin_secret)

    try:
        db = get_db()
        result = db.table("publishers")\
            .select(
                "id, name, contact_person, email, phone, "
                "publisher_type, clerk_user_id, "
                "bank_name, account_number, ifsc_code, pan_number, gst_number, upi_id, "
                "applied_at, agreement_accepted_at, application_status"
            )\
            .eq("application_status", "pending")\
            .order("applied_at", desc=False)\
            .execute()

        return {
            "publishers": result.data or [],
            "total": len(result.data) if result.data else 0,
        }
    except Exception as e:
        print(f"❌ list_pending_publishers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────
# GET /admin/publishers/all
# ──────────────────────────────────────────────────────────────────
@router.get("/admin/publishers/all")
def list_all_publishers(
    status: Optional[str] = None,
    x_admin_secret: str = Header(...),
):
    """
    List all publishers, optionally filtered by status.
    Useful for the admin UI's "all publishers" view.
    """
    verify_admin(x_admin_secret)

    try:
        db = get_db()
        query = db.table("publishers")\
            .select(
                "id, name, contact_person, email, publisher_type, "
                "application_status, applied_at, approved_at, rejected_at, "
                "rejection_reason, payout_rate_per_token, payment_threshold, "
                "total_books, total_tokens_generated, total_revenue_paisa, is_active"
            )

        if status in ("pending", "approved", "rejected"):
            query = query.eq("application_status", status)

        result = query.order("applied_at", desc=True).execute()

        return {
            "publishers": result.data or [],
            "total": len(result.data) if result.data else 0,
        }
    except Exception as e:
        print(f"❌ list_all_publishers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────────
# POST /admin/publishers/review
# ──────────────────────────────────────────────────────────────────
class PublisherReviewRequest(BaseModel):
    publisher_id: str
    action: Literal["approve", "reject"]

    # For approve: required — payout rate per million OUTPUT tokens (in rupees).
    # Suggested range ₹5-₹10/M, but admin can set anything ≥ 0.
    # Internally stored as rate per token: rupees per output token = payout_per_million / 1_000_000
    payout_per_million_output_tokens: Optional[float] = Field(
        default=None,
        ge=0,
        description="Royalty rate in rupees per 1M output tokens (e.g., 5.0, 7.5, 10.0)",
    )
    payment_threshold_rupees: Optional[int] = Field(
        default=500,
        ge=0,
        description="Minimum accumulated earnings before payout (in rupees)",
    )

    # For reject: optional but recommended — surfaced in the rejection email.
    rejection_reason: Optional[str] = None

    # Audit trail
    admin_user: Optional[str] = "platform_admin"


@router.post("/admin/publishers/review")
def review_publisher(
    request: PublisherReviewRequest,
    x_admin_secret: str = Header(...),
):
    """
    Approve or reject a pending publisher application.

    On approve:
      - Sets application_status = 'approved'
      - Sets payout_rate_per_token (computed from payout_per_million_output_tokens)
      - Sets payment_threshold
      - Sets is_active = true
      - Fires approval email

    On reject:
      - Sets application_status = 'rejected'
      - Sets rejection_reason (if provided)
      - Sets is_active = false
      - Fires rejection email
    """
    verify_admin(x_admin_secret)

    db = get_db()

    # ── Fetch the publisher ───────────────────────────────────
    try:
        existing = db.table("publishers")\
            .select("id, name, contact_person, email, publisher_type, application_status")\
            .eq("id", request.publisher_id)\
            .execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lookup failed: {e}")

    if not existing.data or len(existing.data) == 0:
        raise HTTPException(status_code=404, detail="Publisher not found")

    publisher = existing.data[0]
    current_status = publisher.get("application_status")

    if current_status not in ("pending", None):
        raise HTTPException(
            status_code=400,
            detail=f"Publisher is already in '{current_status}' state. Only pending applications can be reviewed."
        )

    now_iso = datetime.utcnow().isoformat()

    # ── APPROVE ──────────────────────────────────────────────
    if request.action == "approve":
        if request.payout_per_million_output_tokens is None:
            raise HTTPException(
                status_code=400,
                detail="payout_per_million_output_tokens is required for approval (suggested: 5–10)"
            )

        # Convert rupees-per-million-output-tokens to rupees-per-token
        # (matches the existing payout_rate_per_token column semantics)
        rate_per_token = request.payout_per_million_output_tokens / 1_000_000.0

        update_payload = {
            "application_status": "approved",
            "approved_at": now_iso,
            "approved_by": request.admin_user or "platform_admin",
            "is_active": True,
            "payout_rate_per_token": rate_per_token,
            "payment_threshold": int((request.payment_threshold_rupees or 500) * 100),  # store as paise
            "updated_at": now_iso,
        }

        try:
            db.table("publishers").update(update_payload).eq("id", request.publisher_id).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Approval update failed: {e}")

        # ✉️ Send approval email (non-fatal)
        try:
            from utils.email_service import send_email
            from utils.email_templates import build_publisher_approved_email

            if publisher.get("email"):
                email = build_publisher_approved_email(
                    contact_name=publisher.get("contact_person") or "Publisher",
                    publisher_name=publisher.get("name") or "your publisher account",
                    publisher_type=publisher.get("publisher_type") or "publisher",
                )
                send_email(
                    to=publisher["email"],
                    subject=email["subject"],
                    html=email["html"],
                    text=email["text"],
                    tags=email.get("tags"),
                )
        except Exception as e:
            print(f"⚠️ Publisher approval email skipped (non-fatal): {e}")

        return {
            "success": True,
            "publisher_id": request.publisher_id,
            "status": "approved",
            "payout_rate_per_token": rate_per_token,
            "payout_per_million_output_tokens": request.payout_per_million_output_tokens,
            "payment_threshold_rupees": request.payment_threshold_rupees,
            "message": f"Publisher {publisher.get('name')} approved.",
        }

    # ── REJECT ───────────────────────────────────────────────
    if request.action == "reject":
        update_payload = {
            "application_status": "rejected",
            "rejected_at": now_iso,
            "rejection_reason": request.rejection_reason,
            "is_active": False,
            "updated_at": now_iso,
        }

        try:
            db.table("publishers").update(update_payload).eq("id", request.publisher_id).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Rejection update failed: {e}")

        # ✉️ Send rejection email (non-fatal)
        try:
            from utils.email_service import send_email
            from utils.email_templates import build_publisher_rejected_email

            if publisher.get("email"):
                email = build_publisher_rejected_email(
                    contact_name=publisher.get("contact_person") or "Publisher",
                    publisher_name=publisher.get("name") or "your publisher account",
                    reason=request.rejection_reason,
                )
                send_email(
                    to=publisher["email"],
                    subject=email["subject"],
                    html=email["html"],
                    text=email["text"],
                    tags=email.get("tags"),
                )
        except Exception as e:
            print(f"⚠️ Publisher rejection email skipped (non-fatal): {e}")

        return {
            "success": True,
            "publisher_id": request.publisher_id,
            "status": "rejected",
            "rejection_reason": request.rejection_reason,
            "message": f"Publisher {publisher.get('name')} rejected.",
        }

    # Should never get here due to Literal type
    raise HTTPException(status_code=400, detail=f"Unknown action: {request.action}")
