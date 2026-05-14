"""
Publisher dashboard endpoints — scoped to the logged-in publisher.

Auth pattern: x-user-id header (Clerk user ID) → lookup in publishers.clerk_user_id.
Rejects requests if the user is not an approved + active publisher.

Endpoints:
  GET /publisher/me        — summary stats for the overview tab
  GET /publisher/books     — list of books owned by this publisher
  GET /publisher/revenue   — monthly revenue breakdown
  GET /publisher/payouts   — payout history
"""

from fastapi import APIRouter, HTTPException, Header
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict
from database.crud import get_db


router = APIRouter()


# ──────────────────────────────────────────────────────────────────
# Auth helper — verify the caller is an approved + active publisher.
# Returns the publisher row, or raises 403.
# ──────────────────────────────────────────────────────────────────
def get_authed_publisher(x_user_id: str) -> Dict[str, Any]:
    if not x_user_id or x_user_id == "anonymous":
        raise HTTPException(status_code=403, detail="Authentication required.")

    db = get_db()
    try:
        result = db.table("publishers")\
            .select(
                "id, name, clerk_user_id, application_status, is_active, "
                "payout_rate_per_token, payment_threshold, "
                "total_tokens_generated, total_revenue_paisa, total_books, "
                "approved_at, created_at, contact_person, email, publisher_type, "
                "phone, website, bio, "
                "bank_name, account_number, ifsc_code, upi_id, pan_number, gst_number"
            )\
            .eq("clerk_user_id", x_user_id)\
            .execute()
    except Exception as e:
        print(f"❌ Publisher auth lookup failed: {e}")
        raise HTTPException(status_code=500, detail="Publisher verification failed.")

    if not result.data or len(result.data) == 0:
        raise HTTPException(
            status_code=403,
            detail="No publisher account found. Please complete onboarding first."
        )

    pub = result.data[0]
    if pub.get("application_status") != "approved" or not pub.get("is_active"):
        raise HTTPException(
            status_code=403,
            detail="Your publisher account is not active."
        )
    return pub


# ──────────────────────────────────────────────────────────────────
# GET /publisher/me — overview stats card
# ──────────────────────────────────────────────────────────────────
@router.get("/publisher/me")
def publisher_me(x_user_id: str = Header(default="anonymous")):
    """
    Returns summary stats for the logged-in publisher's dashboard header.
    """
    pub = get_authed_publisher(x_user_id)
    db = get_db()

    publisher_id = pub["id"]
    rate_per_token = float(pub.get("payout_rate_per_token") or 0)

    # ── Books count + active count ─────────────────────────────
    total_books = 0
    active_books = 0
    try:
        books_res = db.table("books")\
            .select("id, status")\
            .eq("publisher_id", publisher_id)\
            .execute()
        if books_res.data:
            total_books = len(books_res.data)
            active_books = sum(1 for b in books_res.data if (b.get("status") or "").lower() == "active")
    except Exception as e:
        print(f"⚠️ books count lookup failed: {e}")

    # ── Total queries served (count of token_usage rows that include any of this publisher's books) ──
    # books_used is a JSONB array of {book_id, publisher_id, ...} objects.
    # We use a Postgres jsonb path query to filter efficiently.
    total_queries = 0
    try:
        # Simpler / portable approach: count via Python aggregation since Supabase Python client
        # doesn't directly expose jsonb @> operators in a clean way. For low-volume publishers
        # this is fine; if performance matters, replace with a SQL RPC later.
        q_res = db.table("token_usage")\
            .select("books_used", count="exact")\
            .execute()
        if q_res.data:
            for row in q_res.data:
                books_used = row.get("books_used") or []
                if any((b or {}).get("publisher_id") == publisher_id for b in books_used):
                    total_queries += 1
    except Exception as e:
        print(f"⚠️ token_usage count lookup failed: {e}")

    # ── Pending payout — earned revenue not yet paid out ───────
    # Sum of revenue_paisa from publisher_payments where payment_status != 'paid',
    # plus any accumulated revenue not yet in publisher_payments (= total_revenue_paisa - sum(all payments))
    pending_payout_paisa = 0
    last_paid_at = None
    try:
        payments_res = db.table("publisher_payments")\
            .select("revenue_paisa, payment_status, payment_date")\
            .eq("publisher_id", publisher_id)\
            .execute()

        total_paid = 0
        if payments_res.data:
            for p in payments_res.data:
                status = (p.get("payment_status") or "").lower()
                amount = int(p.get("revenue_paisa") or 0)
                if status == "paid":
                    total_paid += amount
                    payment_date = p.get("payment_date")
                    if payment_date and (not last_paid_at or payment_date > last_paid_at):
                        last_paid_at = payment_date
                else:
                    pending_payout_paisa += amount

        # Any revenue not yet bucketed into a payment row → also counts as pending
        accumulated_revenue = int(pub.get("total_revenue_paisa") or 0)
        unbucketed = accumulated_revenue - total_paid - pending_payout_paisa
        if unbucketed > 0:
            pending_payout_paisa += unbucketed
    except Exception as e:
        print(f"⚠️ payout calculation failed: {e}")

    return {
        "publisher_id": publisher_id,
        "publisher_name": pub.get("name"),
        "contact_person": pub.get("contact_person"),
        "email": pub.get("email"),
        "publisher_type": pub.get("publisher_type"),
        "approved_at": pub.get("approved_at"),

        # Editable profile (publisher can update these)
        "phone": pub.get("phone"),
        "website": pub.get("website"),
        "bio": pub.get("bio"),

        # Editable payout details (publisher can update these)
        "bank_name": pub.get("bank_name"),
        "account_number": pub.get("account_number"),
        "ifsc_code": pub.get("ifsc_code"),
        "upi_id": pub.get("upi_id"),
        "pan_number": pub.get("pan_number"),
        "gst_number": pub.get("gst_number"),

        # Headline stats
        "total_books": total_books,
        "active_books": active_books,
        "total_queries": total_queries,
        "total_revenue_paisa": int(pub.get("total_revenue_paisa") or 0),
        "total_tokens_generated": int(pub.get("total_tokens_generated") or 0),

        # Payout info
        "pending_payout_paisa": pending_payout_paisa,
        "last_payout_date": last_paid_at,
        "payment_threshold_paisa": int(pub.get("payment_threshold") or 0),
        "payout_rate_per_token": rate_per_token,
        "payout_rate_per_million_tokens": round(rate_per_token * 1_000_000, 4),
    }


# ──────────────────────────────────────────────────────────────────
# GET /publisher/books — books owned by this publisher
# ──────────────────────────────────────────────────────────────────
@router.get("/publisher/books")
def publisher_books(x_user_id: str = Header(default="anonymous")):
    """
    Returns all books owned by the logged-in publisher.
    Per-book stats (queries, revenue) aggregated from token_usage.
    """
    pub = get_authed_publisher(x_user_id)
    db = get_db()
    publisher_id = pub["id"]
    rate_per_token = float(pub.get("payout_rate_per_token") or 0)

    # ── Fetch books ───────────────────────────────────────────
    try:
        books_res = db.table("books")\
            .select("id, title, author, category, isbn, status, license_type, "
                    "is_royalty_free, total_queries, cover_url, created_at")\
            .eq("publisher_id", publisher_id)\
            .order("created_at", desc=True)\
            .execute()
    except Exception as e:
        print(f"❌ books fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch books")

    books = books_res.data or []
    if not books:
        return {"publisher_id": publisher_id, "books": [], "total": 0}

    # ── Aggregate per-book queries + revenue from token_usage ──
    # token_usage.books_used is jsonb array. We pull all rows once and aggregate in Python
    # (low query volume for v1; optimize via RPC if needed later).
    per_book_queries = defaultdict(int)
    per_book_tokens = defaultdict(int)
    per_book_revenue = defaultdict(int)
    try:
        usage_res = db.table("token_usage").select("books_used, output_tokens").execute()
        if usage_res.data:
            for row in usage_res.data:
                books_used = row.get("books_used") or []
                relevant = [b for b in books_used if (b or {}).get("publisher_id") == publisher_id]
                if not relevant:
                    continue
                for b in relevant:
                    book_id = b.get("book_id")
                    if not book_id:
                        continue
                    tokens_attributed = int(b.get("tokens_attributed") or 0)
                    revenue = int(tokens_attributed * rate_per_token * 100)  # paisa
                    per_book_queries[book_id] += 1
                    per_book_tokens[book_id] += tokens_attributed
                    per_book_revenue[book_id] += revenue
    except Exception as e:
        print(f"⚠️ per-book aggregation failed: {e}")

    # ── Build response ────────────────────────────────────────
    enriched = []
    for book in books:
        bid = book["id"]
        enriched.append({
            "id": bid,
            "title": book.get("title"),
            "author": book.get("author"),
            "category": book.get("category"),
            "isbn": book.get("isbn"),
            "status": book.get("status") or "active",
            "license_type": book.get("license_type"),
            "is_royalty_free": book.get("is_royalty_free", False),
            "cover_url": book.get("cover_url"),
            "created_at": book.get("created_at"),
            "queries": per_book_queries.get(bid, 0),
            "tokens_attributed": per_book_tokens.get(bid, 0),
            "revenue_paisa": per_book_revenue.get(bid, 0),
            "revenue_rupees": round(per_book_revenue.get(bid, 0) / 100, 2),
        })

    return {
        "publisher_id": publisher_id,
        "books": enriched,
        "total": len(enriched),
    }


# ──────────────────────────────────────────────────────────────────
# GET /publisher/revenue — monthly revenue breakdown (last 12 months)
# ──────────────────────────────────────────────────────────────────
@router.get("/publisher/revenue")
def publisher_revenue(
    months: int = 12,
    x_user_id: str = Header(default="anonymous"),
):
    """
    Returns monthly revenue breakdown for the last N months (default 12).
    Each month: total queries, tokens, revenue. Plus per-book breakdown.
    """
    pub = get_authed_publisher(x_user_id)
    db = get_db()
    publisher_id = pub["id"]
    rate_per_token = float(pub.get("payout_rate_per_token") or 0)

    months = max(1, min(months, 36))
    cutoff = (datetime.utcnow() - timedelta(days=months * 31)).isoformat()

    # ── Pull token_usage in window ────────────────────────────
    monthly_totals = defaultdict(lambda: {"queries": 0, "tokens": 0, "revenue_paisa": 0, "books": defaultdict(lambda: {"tokens": 0, "revenue_paisa": 0, "title": None})})

    try:
        usage_res = db.table("token_usage")\
            .select("books_used, output_tokens, created_at")\
            .gte("created_at", cutoff)\
            .execute()

        if usage_res.data:
            for row in usage_res.data:
                books_used = row.get("books_used") or []
                relevant = [b for b in books_used if (b or {}).get("publisher_id") == publisher_id]
                if not relevant:
                    continue

                ts = row.get("created_at")
                if not ts:
                    continue
                # Extract YYYY-MM key
                month_key = ts[:7]

                monthly_totals[month_key]["queries"] += 1

                for b in relevant:
                    book_id = b.get("book_id")
                    book_title = b.get("book_title") or "Unknown"
                    tokens_attributed = int(b.get("tokens_attributed") or 0)
                    revenue = int(tokens_attributed * rate_per_token * 100)

                    monthly_totals[month_key]["tokens"] += tokens_attributed
                    monthly_totals[month_key]["revenue_paisa"] += revenue
                    if book_id:
                        monthly_totals[month_key]["books"][book_id]["tokens"] += tokens_attributed
                        monthly_totals[month_key]["books"][book_id]["revenue_paisa"] += revenue
                        monthly_totals[month_key]["books"][book_id]["title"] = book_title
    except Exception as e:
        print(f"⚠️ revenue aggregation failed: {e}")

    # ── Format response ───────────────────────────────────────
    monthly_list = []
    for month in sorted(monthly_totals.keys(), reverse=True):
        m = monthly_totals[month]
        books_list = []
        for bid, bdata in m["books"].items():
            books_list.append({
                "book_id": bid,
                "book_title": bdata["title"],
                "tokens": bdata["tokens"],
                "revenue_paisa": bdata["revenue_paisa"],
                "revenue_rupees": round(bdata["revenue_paisa"] / 100, 2),
            })
        books_list.sort(key=lambda x: x["revenue_paisa"], reverse=True)

        monthly_list.append({
            "month": month,
            "queries": m["queries"],
            "tokens": m["tokens"],
            "revenue_paisa": m["revenue_paisa"],
            "revenue_rupees": round(m["revenue_paisa"] / 100, 2),
            "books": books_list,
        })

    return {
        "publisher_id": publisher_id,
        "months_requested": months,
        "monthly_breakdown": monthly_list,
        "payout_rate_per_million_tokens": round(rate_per_token * 1_000_000, 4),
    }


# ──────────────────────────────────────────────────────────────────
# GET /publisher/payouts — payout history
# ──────────────────────────────────────────────────────────────────
@router.get("/publisher/payouts")
def publisher_payouts(x_user_id: str = Header(default="anonymous")):
    """
    Returns the publisher's payout history from publisher_payments table.
    """
    pub = get_authed_publisher(x_user_id)
    db = get_db()
    publisher_id = pub["id"]

    try:
        result = db.table("publisher_payments")\
            .select(
                "id, period_start, period_end, total_output_tokens, revenue_paisa, "
                "payment_status, payment_date, transaction_id, payment_method, notes, "
                "books_breakdown, created_at"
            )\
            .eq("publisher_id", publisher_id)\
            .order("period_start", desc=True)\
            .execute()
    except Exception as e:
        print(f"❌ payouts fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch payouts")

    payouts = []
    for p in (result.data or []):
        revenue_paisa = int(p.get("revenue_paisa") or 0)
        payouts.append({
            "id": p.get("id"),
            "period_start": p.get("period_start"),
            "period_end": p.get("period_end"),
            "total_output_tokens": int(p.get("total_output_tokens") or 0),
            "revenue_paisa": revenue_paisa,
            "revenue_rupees": round(revenue_paisa / 100, 2),
            "payment_status": p.get("payment_status") or "pending",
            "payment_date": p.get("payment_date"),
            "transaction_id": p.get("transaction_id"),
            "payment_method": p.get("payment_method"),
            "notes": p.get("notes"),
            "books_breakdown": p.get("books_breakdown") or [],
        })

    return {
        "publisher_id": publisher_id,
        "payouts": payouts,
        "total": len(payouts),
    }


# ──────────────────────────────────────────────────────────────────
# PATCH /publisher/me — update editable profile + payout fields
# ──────────────────────────────────────────────────────────────────
from pydantic import BaseModel


class PublisherProfileUpdate(BaseModel):
    # Profile fields publisher can edit themselves
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    bio: Optional[str] = None

    # Payout fields publisher can edit (will trigger re-verification flow in future)
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    upi_id: Optional[str] = None
    pan_number: Optional[str] = None
    gst_number: Optional[str] = None

    # Note: publisher CANNOT edit name, email (Clerk-owned), publisher_type,
    # payout_rate_per_token, payment_threshold, application_status, is_active.
    # These are admin-controlled fields.


@router.patch("/publisher/me")
def update_publisher_profile(
    update: PublisherProfileUpdate,
    x_user_id: str = Header(default="anonymous"),
):
    """
    Allows the logged-in publisher to update their own profile and payout details.
    Cannot modify admin-controlled fields (name, type, rate, threshold, status).
    """
    pub = get_authed_publisher(x_user_id)
    db = get_db()
    publisher_id = pub["id"]

    # Build update payload — only include fields that were provided AND
    # passed minimal validation. Skip Nones (publisher didn't intend to update).
    payload: Dict[str, Any] = {}

    if update.contact_person is not None:
        cleaned = (update.contact_person or "").strip()
        if cleaned:
            payload["contact_person"] = cleaned

    if update.phone is not None:
        cleaned = (update.phone or "").strip()
        if cleaned and not cleaned.replace("+", "").replace("-", "").replace(" ", "").isdigit():
            raise HTTPException(status_code=400, detail="Phone number must contain only digits, spaces, + or -")
        payload["phone"] = cleaned or None

    if update.website is not None:
        cleaned = (update.website or "").strip()
        payload["website"] = cleaned or None

    if update.bio is not None:
        payload["bio"] = (update.bio or "").strip() or None

    if update.bank_name is not None:
        payload["bank_name"] = (update.bank_name or "").strip() or None

    if update.account_number is not None:
        cleaned = (update.account_number or "").strip()
        if cleaned and not cleaned.replace(" ", "").isdigit():
            raise HTTPException(status_code=400, detail="Account number must be digits only")
        payload["account_number"] = cleaned or None

    if update.ifsc_code is not None:
        cleaned = (update.ifsc_code or "").strip().upper()
        # IFSC format: 4 letters + 0 + 6 alphanumeric
        if cleaned and (len(cleaned) != 11 or not cleaned[:4].isalpha() or cleaned[4] != "0"):
            raise HTTPException(status_code=400, detail="IFSC code format invalid (expected 4 letters + 0 + 6 chars)")
        payload["ifsc_code"] = cleaned or None

    if update.upi_id is not None:
        payload["upi_id"] = (update.upi_id or "").strip() or None

    if update.pan_number is not None:
        cleaned = (update.pan_number or "").strip().upper()
        # PAN format: 5 letters + 4 digits + 1 letter
        if cleaned and (len(cleaned) != 10 or not cleaned[:5].isalpha() or not cleaned[5:9].isdigit() or not cleaned[9].isalpha()):
            raise HTTPException(status_code=400, detail="PAN format invalid (expected ABCDE1234F)")
        payload["pan_number"] = cleaned or None

    if update.gst_number is not None:
        payload["gst_number"] = (update.gst_number or "").strip().upper() or None

    # Require at least one valid bank-OR-UPI payout method to remain after update
    # (only check if user is touching payout fields)
    payout_touched = any(k in payload for k in ["bank_name", "account_number", "ifsc_code", "upi_id"])
    if payout_touched:
        # Combine with existing values to evaluate
        bank = payload.get("bank_name", pub.get("bank_name"))
        acct = payload.get("account_number", pub.get("account_number"))
        ifsc = payload.get("ifsc_code", pub.get("ifsc_code"))
        upi = payload.get("upi_id", pub.get("upi_id"))
        has_bank = bool(bank and acct and ifsc)
        has_upi = bool(upi)
        if not (has_bank or has_upi):
            raise HTTPException(
                status_code=400,
                detail="Provide either complete bank details (bank, account, IFSC) or UPI ID for payout"
            )

    if not payload:
        return {"success": True, "message": "No changes to save.", "publisher_id": publisher_id}

    payload["updated_at"] = datetime.utcnow().isoformat()

    try:
        db.table("publishers").update(payload).eq("id", publisher_id).execute()
    except Exception as e:
        print(f"❌ Publisher profile update failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")

    return {
        "success": True,
        "message": "Profile updated successfully.",
        "publisher_id": publisher_id,
        "fields_updated": [k for k in payload.keys() if k != "updated_at"],
    }


# ──────────────────────────────────────────────────────────────────
# GET /publisher/analytics — daily query/token breakdown
# ──────────────────────────────────────────────────────────────────
@router.get("/publisher/analytics")
def publisher_analytics(
    days: int = 30,
    x_user_id: str = Header(default="anonymous"),
):
    """
    Returns daily activity for the publisher's books over the last N days (default 30).

    Response shape:
      - daily_totals: [{date, queries, output_tokens, input_tokens}]  — full window with zeros
      - per_book_totals: [{book_id, book_title, queries, output_tokens, daily: [{date, queries}]}]
      - summary: {total_queries, total_output_tokens, total_input_tokens, days_with_activity}
    """
    pub = get_authed_publisher(x_user_id)
    db = get_db()
    publisher_id = pub["id"]

    days = max(1, min(days, 90))  # clamp 1..90

    # ── Resolve date window ──────────────────────────────────
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=days - 1)  # inclusive window
    cutoff_iso = datetime.combine(start_date, datetime.min.time()).isoformat()

    # ── Build the empty daily skeleton (so days with 0 activity still show) ──
    date_keys: List[str] = []
    skeleton: Dict[str, Dict[str, int]] = {}
    for i in range(days):
        d = (start_date + timedelta(days=i)).isoformat()
        date_keys.append(d)
        skeleton[d] = {"queries": 0, "output_tokens": 0, "input_tokens": 0}

    # ── Pull token_usage in window ────────────────────────────
    per_book: Dict[str, Dict[str, Any]] = {}  # book_id -> aggregate

    try:
        usage_res = db.table("token_usage")\
            .select("books_used, output_tokens, input_tokens, created_at")\
            .gte("created_at", cutoff_iso)\
            .execute()

        if usage_res.data:
            for row in usage_res.data:
                books_used = row.get("books_used") or []
                relevant = [b for b in books_used if (b or {}).get("publisher_id") == publisher_id]
                if not relevant:
                    continue

                ts = row.get("created_at") or ""
                day_key = ts[:10]  # YYYY-MM-DD
                if day_key not in skeleton:
                    # Outside our window (shouldn't happen given the .gte filter, but safe)
                    continue

                output_tokens = int(row.get("output_tokens") or 0)
                input_tokens = int(row.get("input_tokens") or 0)

                # Overall daily totals
                skeleton[day_key]["queries"] += 1
                skeleton[day_key]["output_tokens"] += output_tokens
                skeleton[day_key]["input_tokens"] += input_tokens

                # Per-book aggregation
                for b in relevant:
                    bid = b.get("book_id")
                    btitle = b.get("book_title") or "Untitled"
                    tokens_attributed = int(b.get("tokens_attributed") or 0)

                    if bid not in per_book:
                        per_book[bid] = {
                            "book_id": bid,
                            "book_title": btitle,
                            "queries": 0,
                            "output_tokens": 0,
                            "daily": {dk: 0 for dk in date_keys},
                        }
                    per_book[bid]["queries"] += 1
                    per_book[bid]["output_tokens"] += tokens_attributed
                    if day_key in per_book[bid]["daily"]:
                        per_book[bid]["daily"][day_key] += 1
    except Exception as e:
        print(f"⚠️ analytics aggregation failed: {e}")

    # ── Flatten to arrays in date order ───────────────────────
    daily_totals = [
        {
            "date": dk,
            "queries": skeleton[dk]["queries"],
            "output_tokens": skeleton[dk]["output_tokens"],
            "input_tokens": skeleton[dk]["input_tokens"],
        }
        for dk in date_keys
    ]

    per_book_list = []
    for bid, agg in per_book.items():
        per_book_list.append({
            "book_id": agg["book_id"],
            "book_title": agg["book_title"],
            "queries": agg["queries"],
            "output_tokens": agg["output_tokens"],
            "daily": [
                {"date": dk, "queries": agg["daily"].get(dk, 0)}
                for dk in date_keys
            ],
        })
    per_book_list.sort(key=lambda x: x["queries"], reverse=True)

    # ── Summary ──────────────────────────────────────────────
    total_queries = sum(d["queries"] for d in daily_totals)
    total_output = sum(d["output_tokens"] for d in daily_totals)
    total_input = sum(d["input_tokens"] for d in daily_totals)
    days_with_activity = sum(1 for d in daily_totals if d["queries"] > 0)

    return {
        "publisher_id": publisher_id,
        "window_days": days,
        "start_date": date_keys[0],
        "end_date": date_keys[-1],
        "summary": {
            "total_queries": total_queries,
            "total_output_tokens": total_output,
            "total_input_tokens": total_input,
            "days_with_activity": days_with_activity,
        },
        "daily_totals": daily_totals,
        "per_book_totals": per_book_list,
    }
