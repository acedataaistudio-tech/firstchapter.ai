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


# ──────────────────────────────────────────────────────────────────
# POST /admin/publishers/{publisher_id}/suspend
# Suspends a publisher — removes ALL their books from Qdrant + Supabase,
# marks publisher as inactive. Destructive; reactivation requires
# re-uploading books from source PDFs.
# ──────────────────────────────────────────────────────────────────
class SuspendPublisherRequest(BaseModel):
    reason: Optional[str] = None  # Audit trail — why this publisher was suspended


@router.post("/admin/publishers/{publisher_id}/suspend")
def admin_suspend_publisher(
    publisher_id: str,
    request: SuspendPublisherRequest,
    x_admin_secret: str = Header(...),
):
    """
    Suspends a publisher: deletes all their books from BOTH Supabase and
    Qdrant, then marks the publisher row as inactive.

    This is destructive — books cannot be recovered without re-ingesting
    the original PDFs. Reactivation is a manual process.

    Returns a summary of what was deleted.
    """
    verify_admin(x_admin_secret)
    db = get_db()

    # ── 1. Resolve publisher ───────────────────────────────────
    try:
        pub_res = db.table("publishers")\
            .select("id, name, application_status, is_active")\
            .eq("id", publisher_id)\
            .execute()
    except Exception as e:
        print(f"❌ Publisher lookup failed during suspend: {e}")
        raise HTTPException(status_code=500, detail="Could not look up publisher.")

    if not pub_res.data or len(pub_res.data) == 0:
        raise HTTPException(status_code=404, detail="Publisher not found.")

    pub = pub_res.data[0]
    if not pub.get("is_active"):
        raise HTTPException(status_code=400, detail=f"Publisher {pub.get('name')} is already suspended.")

    # ── 2. Fetch all books owned by this publisher ─────────────
    try:
        books_res = db.table("books")\
            .select("id, title")\
            .eq("publisher_id", publisher_id)\
            .execute()
    except Exception as e:
        print(f"❌ Books lookup failed during publisher suspend: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch publisher's books.")

    books = books_res.data or []

    # ── 3. Delete each book from Qdrant + Supabase ─────────────
    # Same pattern as admin_core.py's admin_delete_book — Qdrant first
    # (so a partial failure leaves a recoverable trail in Supabase rather
    # than orphan chunks).
    deleted_books = []
    failed_books = []

    if books:
        try:
            from ingestion.pipeline import get_qdrant_client
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            from config import settings as cfg
            qdrant_client = get_qdrant_client()
        except Exception as e:
            print(f"❌ Qdrant client init failed: {e}")
            raise HTTPException(status_code=500, detail="Could not connect to vector store.")

        for book in books:
            book_id = book.get("id")
            book_title = book.get("title", "Untitled")
            try:
                # Delete chunks from Qdrant FIRST
                qdrant_client.delete(
                    collection_name=cfg.collection_name,
                    points_selector=Filter(
                        must=[FieldCondition(
                            key="metadata.book_id",
                            match=MatchValue(value=book_id),
                        )]
                    ),
                )
            except Exception as qe:
                # Don't abort the whole suspension if one book's Qdrant
                # delete fails — log it and keep going.
                print(f"⚠️ Qdrant delete failed for book {book_id} ({book_title}): {qe}")
                failed_books.append({"book_id": book_id, "title": book_title, "reason": "Qdrant delete failed"})
                continue

            try:
                # Then delete the Supabase row
                db.table("books").delete().eq("id", book_id).execute()
                deleted_books.append({"book_id": book_id, "title": book_title})
            except Exception as se:
                print(f"⚠️ Supabase delete failed for book {book_id} ({book_title}): {se}")
                failed_books.append({"book_id": book_id, "title": book_title, "reason": "Supabase delete failed"})
                # Chunks already gone from Qdrant; the book row remains in
                # Supabase as an orphan. Admin can retry suspending — Qdrant
                # delete is idempotent for already-empty results.

    # ── 4. Mark publisher as inactive ──────────────────────────
    now_iso = datetime.utcnow().isoformat()
    suspend_payload = {
        "is_active": False,
        "application_status": "suspended",
        "updated_at": now_iso,
    }
    # If your publishers table has a 'suspended_at' or 'suspension_reason'
    # column, set those too. Otherwise these will silently be ignored if
    # the column doesn't exist (Supabase rejects unknown columns).
    if request.reason:
        suspend_payload["rejection_reason"] = request.reason  # Reuse existing column

    try:
        db.table("publishers").update(suspend_payload).eq("id", publisher_id).execute()
    except Exception as e:
        print(f"❌ Failed to mark publisher inactive after deleting books: {e}")
        # The books are already deleted — fail loudly so admin knows the
        # state is inconsistent. They should manually verify and fix.
        raise HTTPException(
            status_code=500,
            detail=f"Books deleted ({len(deleted_books)}) but failed to mark publisher inactive. Manual cleanup needed."
        )

    print(f"✅ Suspended publisher {pub.get('name')}: {len(deleted_books)} books removed, {len(failed_books)} failed")

    return {
        "success": True,
        "publisher_id": publisher_id,
        "publisher_name": pub.get("name"),
        "summary": {
            "books_deleted": len(deleted_books),
            "books_failed": len(failed_books),
            "total_books": len(books),
        },
        "deleted_books": deleted_books,
        "failed_books": failed_books,
        "message": (
            f"Publisher {pub.get('name')} suspended. "
            f"{len(deleted_books)} of {len(books)} books removed from the platform. "
            + (f"{len(failed_books)} failed — see details." if failed_books else "")
        ),
    }
