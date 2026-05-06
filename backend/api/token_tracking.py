"""
Token Tracking and Revenue Calculation
Includes:
- OpenAI cost tracking
- Royalty-free book handling
- Publisher revenue splits
- Institution token budget management (subscription + per-student counters)
"""

from database.crud import get_db
from typing import List, Dict
import uuid


OPENAI_PRICING = {
    'gpt-4o-mini': {'input': 0.150, 'output': 0.600},
    'gpt-4o': {'input': 2.500, 'output': 10.000},
}

USD_TO_INR = 83


def get_openai_pricing(model: str = 'gpt-4o-mini') -> Dict:
    """Get current OpenAI pricing from database with fallback."""
    try:
        db = get_db()
        pricing = db.table("openai_pricing")\
            .select("input_price_per_1m, output_price_per_1m")\
            .eq("model_name", model)\
            .eq("is_active", True)\
            .execute()

        if pricing.data and len(pricing.data) > 0:
            row = pricing.data[0]
            return {
                'input': float(row['input_price_per_1m']),
                'output': float(row['output_price_per_1m'])
            }
    except Exception as e:
        print(f"⚠️ openai_pricing lookup failed (using defaults): {e}")

    return OPENAI_PRICING.get(model, OPENAI_PRICING['gpt-4o-mini'])


def calculate_openai_cost(input_tokens: int, output_tokens: int, model: str = 'gpt-4o-mini') -> Dict:
    pricing = get_openai_pricing(model)
    input_cost = (input_tokens / 1_000_000) * pricing['input']
    output_cost = (output_tokens / 1_000_000) * pricing['output']
    total_cost_usd = input_cost + output_cost
    return {
        'input_cost_usd': round(input_cost, 6),
        'output_cost_usd': round(output_cost, 6),
        'total_cost_usd': round(total_cost_usd, 6),
        'total_cost_inr': int(total_cost_usd * USD_TO_INR),
    }


def save_token_usage(
    query_id: str,
    user_id: str,
    input_tokens: int,
    output_tokens: int,
    total_tokens: int,
    model: str,
    sources: List[Dict],
    book_ids: List[str]
):
    """Save token usage with cost tracking, publisher revenue, and counter updates."""
    try:
        db = get_db()
        openai_costs = calculate_openai_cost(input_tokens, output_tokens, model)
        books_used = calculate_publisher_split(output_tokens=output_tokens, sources=sources, book_ids=book_ids)
        has_royalty_free = any(book.get('is_royalty_free', False) for book in books_used)

        total_revenue_paisa = sum(
            int(book.get('tokens_attributed', 0) * book.get('payout_rate_per_token', 0.000001) * 100)
            for book in books_used if not book.get('is_royalty_free', False)
        )

        db.table("token_usage").insert({
            "id": str(uuid.uuid4()),
            "query_id": query_id,
            "user_id": user_id,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "model": model,
            "books_used": books_used,
            "total_revenue_paisa": total_revenue_paisa,
            "openai_input_cost_usd": openai_costs['input_cost_usd'],
            "openai_output_cost_usd": openai_costs['output_cost_usd'],
            "openai_total_cost_usd": openai_costs['total_cost_usd'],
            "openai_total_cost_inr": openai_costs['total_cost_inr'],
            "has_royalty_free_books": has_royalty_free
        }).execute()

        update_publisher_stats(books_used)
        update_subscription_tokens(user_id, input_tokens, output_tokens, openai_costs)

        print(f"✅ Token usage saved: {output_tokens} output tokens, ₹{total_revenue_paisa/100:.2f} revenue, OpenAI cost: ${openai_costs['total_cost_usd']}")

    except Exception as e:
        print(f"❌ Error saving token usage: {e}")
        raise


def calculate_publisher_split(output_tokens: int, sources: List[Dict], book_ids: List[str]) -> List[Dict]:
    """Calculate publisher revenue split with royalty-free support."""
    try:
        db = get_db()
        unique_book_ids = set()
        for source in sources:
            if "book_id" in source:
                unique_book_ids.add(source["book_id"])
        if not unique_book_ids and book_ids:
            unique_book_ids = set(book_ids)
        if not unique_book_ids:
            return []

        books_data = []
        for book_id in unique_book_ids:
            try:
                book_response = db.table("books")\
                    .select("id, title, publisher_id, revenue_share_percentage, is_royalty_free, royalty_percentage")\
                    .eq("id", book_id)\
                    .execute()

                if book_response.data and len(book_response.data) > 0:
                    book = book_response.data[0]
                    publisher_name = None
                    payout_rate = 0.000001
                    if book.get("publisher_id"):
                        pub_response = db.table("publishers")\
                            .select("name, payout_rate_per_token")\
                            .eq("id", book["publisher_id"])\
                            .execute()
                        if pub_response.data and len(pub_response.data) > 0:
                            publisher_name = pub_response.data[0]["name"]
                            payout_rate = float(pub_response.data[0].get("payout_rate_per_token", 0.000001))

                    books_data.append({
                        "book_id": book["id"],
                        "book_title": book.get("title", "Unknown"),
                        "publisher_id": book.get("publisher_id"),
                        "publisher_name": publisher_name or "Unknown Publisher",
                        "payout_rate_per_token": payout_rate,
                        "revenue_share": book.get("revenue_share_percentage", 100),
                        "is_royalty_free": book.get("is_royalty_free", False),
                        "royalty_percentage": book.get("royalty_percentage", 100)
                    })
            except Exception as e:
                print(f"⚠️ Error fetching book {book_id}: {e}")

        if not books_data:
            return []

        # Distribute output tokens across books equally
        tokens_per_book = output_tokens // len(books_data) if len(books_data) > 0 else 0
        for book in books_data:
            book["tokens_attributed"] = tokens_per_book

        return books_data

    except Exception as e:
        print(f"⚠️ Error in publisher split: {e}")
        return []


def update_publisher_stats(books_used: List[Dict]):
    """Update each publisher's running totals (excludes royalty-free)."""
    try:
        db = get_db()
        publisher_data = {}
        for book in books_used:
            if book.get('is_royalty_free', False):
                continue
            pub_id = book.get("publisher_id")
            if not pub_id:
                continue
            tokens = book.get("tokens_attributed", 0)
            payout_rate = book.get("payout_rate_per_token", 0.000001)
            revenue = tokens * payout_rate

            if pub_id not in publisher_data:
                publisher_data[pub_id] = {"tokens": 0, "revenue_rupees": 0}
            publisher_data[pub_id]["tokens"] += tokens
            publisher_data[pub_id]["revenue_rupees"] += revenue

        for pub_id, data in publisher_data.items():
            tokens = data["tokens"]
            revenue_paisa = int(data["revenue_rupees"] * 100)
            try:
                current = db.table("publishers")\
                    .select("total_tokens_generated, total_revenue_paisa")\
                    .eq("id", pub_id)\
                    .execute()

                if current.data and len(current.data) > 0:
                    current_tokens = current.data[0].get("total_tokens_generated", 0) or 0
                    current_revenue = current.data[0].get("total_revenue_paisa", 0) or 0
                    db.table("publishers").update({
                        "total_tokens_generated": current_tokens + tokens,
                        "total_revenue_paisa": current_revenue + revenue_paisa,
                        "updated_at": "now()"
                    }).eq("id", pub_id).execute()
            except Exception as update_err:
                print(f"⚠️ Publisher stats update error for {pub_id}: {update_err}")

    except Exception as e:
        print(f"⚠️ Error updating publisher stats: {e}")


def update_subscription_tokens(user_id: str, input_tokens: int, output_tokens: int, openai_costs: Dict):
    """
    Update institution-level subscription token usage AND per-student counter.
    Uses institution_id fallback if subscription_id isn't set on the user.
    """
    try:
        db = get_db()

        user_response = db.table("users")\
            .select("subscription_id, institution_id")\
            .eq("id", user_id)\
            .execute()

        if not user_response.data or len(user_response.data) == 0:
            return

        user_row = user_response.data[0]
        subscription_id = user_row.get("subscription_id")
        institution_id = user_row.get("institution_id")

        # ✅ FALLBACK: If user has institution_id but no subscription_id,
        # look up the institution's active subscription
        if not subscription_id and institution_id:
            try:
                fallback_sub = db.table("subscriptions")\
                    .select("id")\
                    .eq("institution_id", institution_id)\
                    .eq("is_active", True)\
                    .order("created_at", desc=True)\
                    .limit(1)\
                    .execute()
                if fallback_sub.data and len(fallback_sub.data) > 0:
                    subscription_id = fallback_sub.data[0]["id"]

                    # Backfill the user record so future queries don't repeat the lookup
                    db.table("users").update({"subscription_id": subscription_id}).eq("id", user_id).execute()
            except Exception as e:
                print(f"⚠️ Subscription fallback lookup failed: {e}")

        if not subscription_id:
            return

        # Increment subscription counters
        sub_response = db.table("subscriptions")\
            .select("input_tokens_used, output_tokens_used, tokens_used, queries_used, openai_cost_usd, openai_cost_inr")\
            .eq("id", subscription_id)\
            .eq("is_active", True)\
            .execute()

        if not sub_response.data or len(sub_response.data) == 0:
            return

        subscription = sub_response.data[0]
        new_input_tokens = (subscription.get("input_tokens_used") or 0) + input_tokens
        new_output_tokens = (subscription.get("output_tokens_used") or 0) + output_tokens
        new_total_tokens = (subscription.get("tokens_used") or 0) + input_tokens + output_tokens
        new_queries = (subscription.get("queries_used") or 0) + 1
        new_openai_cost_usd = float(subscription.get("openai_cost_usd") or 0) + openai_costs['total_cost_usd']
        new_openai_cost_inr = (subscription.get("openai_cost_inr") or 0) + openai_costs['total_cost_inr']

        db.table("subscriptions").update({
            "input_tokens_used": new_input_tokens,
            "output_tokens_used": new_output_tokens,
            "tokens_used": new_total_tokens,
            "queries_used": new_queries,
            "openai_cost_usd": new_openai_cost_usd,
            "openai_cost_inr": new_openai_cost_inr
        }).eq("id", subscription_id).execute()

        # ✅ NEW: Increment per-student counter for institution users (Phase 2)
        if institution_id:
            update_institution_user_tokens(user_id, institution_id, input_tokens, output_tokens)
            track_mau(user_id, institution_id)

    except Exception as e:
        print(f"⚠️ Error updating subscription tokens: {e}")


def update_institution_user_tokens(user_id: str, institution_id: str, input_tokens: int, output_tokens: int):
    """
    Increment monthly_tokens_used in institution_users for per-student soft cap tracking.
    Resets are handled by the monthly_reset job (see migration SQL).
    """
    try:
        db = get_db()
        total = (input_tokens or 0) + (output_tokens or 0)
        if total == 0:
            return

        record = db.table("institution_users")\
            .select("id, monthly_tokens_used")\
            .eq("institution_id", institution_id)\
            .eq("user_id", user_id)\
            .execute()

        if record.data and len(record.data) > 0:
            row = record.data[0]
            new_used = (row.get("monthly_tokens_used") or 0) + total
            db.table("institution_users").update({
                "monthly_tokens_used": new_used,
            }).eq("id", row["id"]).execute()

    except Exception as e:
        print(f"⚠️ Error updating institution_users counter: {e}")


def track_mau(user_id: str, institution_id: str):
    """Track user as active for current month (RPC call to existing track_mau function)."""
    try:
        db = get_db()
        db.rpc("track_mau", {"p_user_id": user_id, "p_institution_id": institution_id}).execute()
    except Exception as e:
        print(f"⚠️ Error tracking MAU: {e}")


def get_user_token_usage(user_id: str, days: int = 30) -> Dict:
    """Get user's token usage statistics with cost breakdown."""
    try:
        db = get_db()
        usage_response = db.table("token_usage")\
            .select("input_tokens, output_tokens, total_tokens, openai_total_cost_usd, openai_total_cost_inr")\
            .eq("user_id", user_id)\
            .gte("created_at", f"now() - interval '{days} days'")\
            .execute()

        total_input = total_output = total_tokens = query_count = 0
        openai_cost_usd = openai_cost_inr = 0

        if usage_response.data:
            for record in usage_response.data:
                total_input += record.get("input_tokens", 0) or 0
                total_output += record.get("output_tokens", 0) or 0
                total_tokens += record.get("total_tokens", 0) or 0
                openai_cost_usd += float(record.get("openai_total_cost_usd", 0) or 0)
                openai_cost_inr += record.get("openai_total_cost_inr", 0) or 0
                query_count += 1

        user_response = db.table("users").select("subscription_id").eq("id", user_id).execute()
        tokens_allocated = tokens_used = 0
        input_tokens_allocated = output_tokens_allocated = 0
        input_tokens_used = output_tokens_used = 0

        if user_response.data and len(user_response.data) > 0:
            subscription_id = user_response.data[0].get("subscription_id")
            if subscription_id:
                sub_response = db.table("subscriptions")\
                    .select("tokens_allocated, tokens_used, input_tokens_allocated, output_tokens_allocated, input_tokens_used, output_tokens_used")\
                    .eq("id", subscription_id)\
                    .execute()
                if sub_response.data and len(sub_response.data) > 0:
                    s = sub_response.data[0]
                    tokens_allocated = s.get("tokens_allocated", 0) or 0
                    tokens_used = s.get("tokens_used", 0) or 0
                    input_tokens_allocated = s.get("input_tokens_allocated", 0) or 0
                    output_tokens_allocated = s.get("output_tokens_allocated", 0) or 0
                    input_tokens_used = s.get("input_tokens_used", 0) or 0
                    output_tokens_used = s.get("output_tokens_used", 0) or 0

        return {
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_tokens": total_tokens,
            "query_count": query_count,
            "input_tokens_allocated": input_tokens_allocated,
            "output_tokens_allocated": output_tokens_allocated,
            "input_tokens_used": input_tokens_used,
            "output_tokens_used": output_tokens_used,
            "tokens_allocated": tokens_allocated,
            "tokens_used": tokens_used,
            "tokens_remaining": max(0, tokens_allocated - tokens_used) if tokens_allocated else None,
            "openai_cost_usd": round(openai_cost_usd, 2),
            "openai_cost_inr": openai_cost_inr,
            "days": days,
        }

    except Exception as e:
        print(f"⚠️ Error getting user token usage: {e}")
        return {}
