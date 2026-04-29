"""
Token Tracking and Revenue Calculation - Phase 2.5
Includes:
- OpenAI cost tracking
- Royalty-free book handling
- Publisher revenue splits
- Institution token budget management
"""

from database.crud import get_db
from typing import List, Dict, Optional
import uuid


# OpenAI Pricing (stored in DB, these are defaults)
OPENAI_PRICING = {
    'gpt-4o-mini': {
        'input': 0.150,   # $0.150 per 1M tokens
        'output': 0.600   # $0.600 per 1M tokens
    },
    'gpt-4o': {
        'input': 2.500,
        'output': 10.000
    }
}

USD_TO_INR = 83  # Exchange rate


def get_openai_pricing(model: str = 'gpt-4o-mini') -> Dict:
    """Get current OpenAI pricing from database"""
    try:
        db = get_db()
        pricing = db.table("openai_pricing")\
            .select("input_price_per_1m, output_price_per_1m")\
            .eq("model_name", model)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if pricing.data:
            return {
                'input': float(pricing.data['input_price_per_1m']),
                'output': float(pricing.data['output_price_per_1m'])
            }
    except:
        pass
    
    # Fallback to defaults
    return OPENAI_PRICING.get(model, OPENAI_PRICING['gpt-4o-mini'])


def calculate_openai_cost(
    input_tokens: int,
    output_tokens: int,
    model: str = 'gpt-4o-mini'
) -> Dict:
    """
    Calculate what we pay OpenAI for this query
    
    Returns:
        {
            'input_cost_usd': 0.23,
            'output_cost_usd': 0.14,
            'total_cost_usd': 0.37,
            'total_cost_inr': 31
        }
    """
    pricing = get_openai_pricing(model)
    
    # Cost = (tokens / 1,000,000) * price_per_1m
    input_cost = (input_tokens / 1_000_000) * pricing['input']
    output_cost = (output_tokens / 1_000_000) * pricing['output']
    total_cost_usd = input_cost + output_cost
    total_cost_inr = int(total_cost_usd * USD_TO_INR)
    
    return {
        'input_cost_usd': round(input_cost, 6),
        'output_cost_usd': round(output_cost, 6),
        'total_cost_usd': round(total_cost_usd, 6),
        'total_cost_inr': total_cost_inr
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
    """
    Save token usage with OpenAI cost tracking and publisher revenue calculation
    """
    try:
        db = get_db()
        
        # Calculate OpenAI costs
        openai_costs = calculate_openai_cost(input_tokens, output_tokens, model)
        
        # Calculate publisher revenue split (handles royalty-free)
        books_used = calculate_publisher_split(
            output_tokens=output_tokens,
            sources=sources,
            book_ids=book_ids
        )
        
        # Check if any books are royalty-free
        has_royalty_free = any(book.get('is_royalty_free', False) for book in books_used)
        
        # Calculate total revenue (only for non-royalty-free books using dynamic rates)
        total_revenue_paisa = sum(
            int(book.get('tokens_attributed', 0) * book.get('payout_rate_per_token', 0.000001) * 100)  # Convert rupees to paisa
            for book in books_used 
            if not book.get('is_royalty_free', False)
        )
        
        # Save to token_usage table
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
            # NEW: OpenAI cost tracking
            "openai_input_cost_usd": openai_costs['input_cost_usd'],
            "openai_output_cost_usd": openai_costs['output_cost_usd'],
            "openai_total_cost_usd": openai_costs['total_cost_usd'],
            "openai_total_cost_inr": openai_costs['total_cost_inr'],
            "has_royalty_free_books": has_royalty_free
        }).execute()
        
        # Update publisher stats (only non-royalty-free)
        update_publisher_stats(books_used)
        
        # Update user's subscription token count
        update_subscription_tokens(user_id, input_tokens, output_tokens, openai_costs)
        
        print(f"✅ Token usage saved: {output_tokens} output tokens, ₹{total_revenue_paisa/100:.2f} revenue, OpenAI cost: ${openai_costs['total_cost_usd']}")
        
    except Exception as e:
        print(f"❌ Error saving token usage: {e}")
        raise


def calculate_publisher_split(
    output_tokens: int,
    sources: List[Dict],
    book_ids: List[str]
) -> List[Dict]:
    """
    Calculate publisher revenue split with royalty-free support
    
    Returns list of dicts with publisher attribution
    """
    try:
        db = get_db()
        
        # Get unique book IDs from sources
        unique_book_ids = set()
        for source in sources:
            if "book_id" in source:
                unique_book_ids.add(source["book_id"])
        
        if not unique_book_ids and book_ids:
            unique_book_ids = set(book_ids)
        
        if not unique_book_ids:
            return []
        
        # Get book details including royalty info
        books_data = []
        for book_id in unique_book_ids:
            try:
                book_response = db.table("books")\
                    .select("id, title, publisher_id, revenue_share_percentage, is_royalty_free, royalty_percentage")\
                    .eq("id", book_id)\
                    .execute()
                
                if book_response.data and len(book_response.data) > 0:
                    book = book_response.data[0]
                    
                    # Get publisher name and payout rate
                    publisher_name = None
                    payout_rate = 0.000001  # Default rate
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
                        "payout_rate_per_token": payout_rate,  # NEW: Dynamic rate
                        "revenue_share": book.get("revenue_share_percentage", 100),
                        "is_royalty_free": book.get("is_royalty_free", False),
                        "royalty_percentage": book.get("royalty_percentage", 100)
                    })
            except Exception as e:
                print(f"Error fetching book {book_id}: {e}")
                continue
        
        if not books_data:
            return []
        
        # Split tokens equally among books
        num_books = len(books_data)
        tokens_per_book = output_tokens // num_books
        remaining_tokens = output_tokens % num_books
        
        result = []
        for i, book in enumerate(books_data):
            # Distribute remaining tokens to first few books
            tokens = tokens_per_book + (1 if i < remaining_tokens else 0)
            
            # Apply royalty percentage
            if book["is_royalty_free"]:
                final_tokens = 0  # No payout for royalty-free
            else:
                royalty_pct = book.get("royalty_percentage", 100)
                revenue_share = book.get("revenue_share", 100)
                final_tokens = int(tokens * (royalty_pct / 100) * (revenue_share / 100))
            
            result.append({
                "book_id": book["book_id"],
                "book_title": book["book_title"],
                "publisher_id": book["publisher_id"],
                "publisher_name": book["publisher_name"],
                "tokens_attributed": final_tokens,
                "is_royalty_free": book["is_royalty_free"],
                "payout_rate_per_token": book["payout_rate_per_token"]  # NEW: Store rate used
            })
        
        return result
        
    except Exception as e:
        print(f"Error calculating publisher split: {e}")
        return []


def update_publisher_stats(books_used: List[Dict]):
    """Update publisher statistics (only for non-royalty-free books)"""
    try:
        db = get_db()
        
        # Group by publisher (exclude royalty-free)
        publisher_data = {}
        for book in books_used:
            if book.get('is_royalty_free', False):
                continue  # Skip royalty-free books
            
            pub_id = book.get("publisher_id")
            if not pub_id:
                continue
            
            tokens = book.get("tokens_attributed", 0)
            payout_rate = book.get("payout_rate_per_token", 0.000001)
            revenue = tokens * payout_rate  # Revenue in rupees
            
            if pub_id not in publisher_data:
                publisher_data[pub_id] = {"tokens": 0, "revenue_rupees": 0}
            publisher_data[pub_id]["tokens"] += tokens
            publisher_data[pub_id]["revenue_rupees"] += revenue
        
        # Update each publisher's stats
        for pub_id, data in publisher_data.items():
            tokens = data["tokens"]
            revenue_paisa = int(data["revenue_rupees"] * 100)  # Convert to paisa
            
            try:
                # Get current stats
                current = db.table("publishers")\
                    .select("total_tokens_generated, total_revenue_paisa")\
                    .eq("id", pub_id)\
                    .single()\
                    .execute()
                
                if current.data:
                    current_tokens = current.data.get("total_tokens_generated", 0) or 0
                    current_revenue = current.data.get("total_revenue_paisa", 0) or 0
                    
                    # Update with new totals
                    db.table("publishers").update({
                        "total_tokens_generated": current_tokens + tokens,
                        "total_revenue_paisa": current_revenue + revenue_paisa,
                        "updated_at": "now()"
                    }).eq("id", pub_id).execute()
            except Exception as update_err:
                print(f"Publisher stats update error for {pub_id}: {update_err}")
        
    except Exception as e:
        print(f"Error updating publisher stats: {e}")


def update_subscription_tokens(
    user_id: str, 
    input_tokens: int, 
    output_tokens: int,
    openai_costs: Dict
):
    """
    Update user/institution subscription token usage
    Tracks both token counts and costs
    """
    try:
        db = get_db()
        
        # Get user's subscription
        user_response = db.table("users")\
            .select("subscription_id, institution_id")\
            .eq("id", user_id)\
            .execute()
        
        if not user_response.data or len(user_response.data) == 0:
            return
        
        subscription_id = user_response.data[0].get("subscription_id")
        institution_id = user_response.data[0].get("institution_id")
        
        if not subscription_id:
            return
        
        # Get current subscription
        sub_response = db.table("subscriptions")\
            .select("*")\
            .eq("id", subscription_id)\
            .eq("is_active", True)\
            .execute()
        
        if not sub_response.data or len(sub_response.data) == 0:
            return
        
        subscription = sub_response.data[0]
        
        # Calculate new totals
        new_input_tokens = (subscription.get("input_tokens_used", 0) or 0) + input_tokens
        new_output_tokens = (subscription.get("output_tokens_used", 0) or 0) + output_tokens
        new_total_tokens = (subscription.get("tokens_used", 0) or 0) + input_tokens + output_tokens
        new_queries = (subscription.get("queries_used", 0) or 0) + 1
        
        # Add OpenAI costs
        new_openai_cost_usd = (subscription.get("openai_cost_usd", 0) or 0) + openai_costs['total_cost_usd']
        new_openai_cost_inr = (subscription.get("openai_cost_inr", 0) or 0) + openai_costs['total_cost_inr']
        
        # Update subscription
        db.table("subscriptions").update({
            "input_tokens_used": new_input_tokens,
            "output_tokens_used": new_output_tokens,
            "tokens_used": new_total_tokens,
            "queries_used": new_queries,
            "openai_cost_usd": new_openai_cost_usd,
            "openai_cost_inr": new_openai_cost_inr
        }).eq("id", subscription_id).execute()
        
        # Track MAU if institution
        if institution_id:
            track_mau(user_id, institution_id)
        
    except Exception as e:
        print(f"Error updating subscription tokens: {e}")


def track_mau(user_id: str, institution_id: str):
    """Track user as active for current month"""
    try:
        db = get_db()
        from datetime import datetime
        
        # First day of current month
        current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Call SQL function to track MAU
        db.rpc("track_mau", {
            "p_user_id": user_id,
            "p_institution_id": institution_id
        }).execute()
        
    except Exception as e:
        print(f"Error tracking MAU: {e}")


def get_user_token_usage(user_id: str, days: int = 30) -> Dict:
    """Get user's token usage statistics with cost breakdown"""
    try:
        db = get_db()
        
        # Get total usage
        usage_response = db.table("token_usage")\
            .select("input_tokens, output_tokens, total_tokens, openai_total_cost_usd, openai_total_cost_inr")\
            .eq("user_id", user_id)\
            .gte("created_at", f"now() - interval '{days} days'")\
            .execute()
        
        total_input = 0
        total_output = 0
        total_tokens = 0
        query_count = 0
        openai_cost_usd = 0
        openai_cost_inr = 0
        
        if usage_response.data:
            for record in usage_response.data:
                total_input += record.get("input_tokens", 0) or 0
                total_output += record.get("output_tokens", 0) or 0
                total_tokens += record.get("total_tokens", 0) or 0
                openai_cost_usd += float(record.get("openai_total_cost_usd", 0) or 0)
                openai_cost_inr += record.get("openai_total_cost_inr", 0) or 0
                query_count += 1
        
        # Get subscription details
        user_response = db.table("users")\
            .select("subscription_id")\
            .eq("id", user_id)\
            .execute()
        
        tokens_allocated = 0
        tokens_used = 0
        input_tokens_allocated = 0
        output_tokens_allocated = 0
        input_tokens_used = 0
        output_tokens_used = 0
        
        if user_response.data and len(user_response.data) > 0:
            subscription_id = user_response.data[0].get("subscription_id")
            if subscription_id:
                sub_response = db.table("subscriptions")\
                    .select("tokens_allocated, tokens_used, input_tokens_allocated, output_tokens_allocated, input_tokens_used, output_tokens_used")\
                    .eq("id", subscription_id)\
                    .execute()
                if sub_response.data and len(sub_response.data) > 0:
                    tokens_allocated = sub_response.data[0].get("tokens_allocated", 0) or 0
                    tokens_used = sub_response.data[0].get("tokens_used", 0) or 0
                    input_tokens_allocated = sub_response.data[0].get("input_tokens_allocated", 0) or 0
                    output_tokens_allocated = sub_response.data[0].get("output_tokens_allocated", 0) or 0
                    input_tokens_used = sub_response.data[0].get("input_tokens_used", 0) or 0
                    output_tokens_used = sub_response.data[0].get("output_tokens_used", 0) or 0
        
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
            "days": days
        }
        
    except Exception as e:
        print(f"Error getting user token usage: {e}")
        return {}
