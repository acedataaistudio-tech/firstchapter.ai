"""
Usage Statistics API Endpoint

Provides token usage statistics for users, institutions, and publishers.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from database.crud import get_db
from api.token_tracking import get_user_token_usage

router = APIRouter()


@router.get("/user")
def get_user_usage(
    x_user_id: str = Header(default="anonymous"),
    days: int = 30
):
    """
    Get current user's token usage statistics.
    
    Query params:
        days: Number of days to look back (default 30)
    
    Returns:
        {
            "total_input_tokens": 1500,
            "total_output_tokens": 1200,
            "total_tokens": 2700,
            "query_count": 15,
            "tokens_allocated": 50000,
            "tokens_used": 2700,
            "tokens_remaining": 47300,
            "days": 30,
            "subscription": {
                "package_name": "Basic",
                "type": "individual",
                "is_active": true
            }
        }
    """
    try:
        # Get basic token usage
        usage_stats = get_user_token_usage(x_user_id, days)
        
        # Get subscription details
        db = get_db()
        user_response = db.table("users")\
            .select("subscription_id")\
            .eq("id", x_user_id)\
            .execute()
        
        subscription_info = None
        if user_response.data and len(user_response.data) > 0:
            subscription_id = user_response.data[0].get("subscription_id")
            if subscription_id:
                sub_response = db.table("subscriptions")\
                    .select("package_id, type, is_active")\
                    .eq("id", subscription_id)\
                    .execute()
                
                if sub_response.data and len(sub_response.data) > 0:
                    subscription = sub_response.data[0]
                    
                    # Get package name
                    package_id = subscription.get("package_id")
                    package_name = None
                    if package_id:
                        pkg_response = db.table("packages")\
                            .select("name")\
                            .eq("id", package_id)\
                            .execute()
                        if pkg_response.data and len(pkg_response.data) > 0:
                            package_name = pkg_response.data[0]["name"]
                    
                    subscription_info = {
                        "package_name": package_name,
                        "type": subscription.get("type"),
                        "is_active": subscription.get("is_active")
                    }
        
        # Combine results
        result = {
            **usage_stats,
            "subscription": subscription_info
        }
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/institution/{institution_id}")
def get_institution_usage(
    institution_id: str,
    x_user_id: str = Header(default="anonymous"),
    days: int = 30
):
    """
    Get institution's aggregate token usage.
    
    Requires: User must be institution admin
    """
    try:
        db = get_db()
        
        # Verify user is institution admin
        user_response = db.table("users")\
            .select("role, institution_id")\
            .eq("id", x_user_id)\
            .execute()
        
        if not user_response.data or len(user_response.data) == 0:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        user = user_response.data[0]
        if user.get("role") != "institution_admin" or user.get("institution_id") != institution_id:
            raise HTTPException(status_code=403, detail="Not authorized for this institution")
        
        # Get institution's subscription
        inst_sub = db.table("subscriptions")\
            .select("tokens_allocated, tokens_used, queries_used")\
            .eq("institution_id", institution_id)\
            .eq("is_active", True)\
            .execute()
        
        if not inst_sub.data or len(inst_sub.data) == 0:
            return {
                "error": "No active subscription found for institution"
            }
        
        subscription = inst_sub.data[0]
        
        # Get all students under this institution
        students_response = db.table("institution_students")\
            .select("student_id")\
            .eq("institution_id", institution_id)\
            .eq("approval_status", "approved")\
            .execute()
        
        student_ids = [s["student_id"] for s in students_response.data] if students_response.data else []
        
        # Get aggregate token usage for all students
        total_input = 0
        total_output = 0
        total_tokens = 0
        total_queries = 0
        
        if student_ids:
            for student_id in student_ids:
                usage_response = db.table("token_usage")\
                    .select("input_tokens, output_tokens, total_tokens")\
                    .eq("user_id", student_id)\
                    .gte("created_at", f"now() - interval '{days} days'")\
                    .execute()
                
                if usage_response.data:
                    for record in usage_response.data:
                        total_input += record.get("input_tokens", 0)
                        total_output += record.get("output_tokens", 0)
                        total_tokens += record.get("total_tokens", 0)
                        total_queries += 1
        
        return {
            "institution_id": institution_id,
            "total_students": len(student_ids),
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_tokens": total_tokens,
            "query_count": total_queries,
            "tokens_allocated": subscription.get("tokens_allocated"),
            "tokens_used": subscription.get("tokens_used"),
            "tokens_remaining": subscription.get("tokens_allocated", 0) - subscription.get("tokens_used", 0),
            "queries_total": subscription.get("queries_used"),
            "days": days
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/publisher/{publisher_id}")
def get_publisher_usage(
    publisher_id: str,
    x_user_id: str = Header(default="anonymous")
):
    """
    Get publisher's total tokens generated and revenue.
    
    Requires: User must be the publisher
    """
    try:
        db = get_db()
        
        # Get publisher details
        pub_response = db.table("publishers")\
            .select("name, total_tokens_generated, total_revenue_paisa, total_books")\
            .eq("id", publisher_id)\
            .execute()
        
        if not pub_response.data or len(pub_response.data) == 0:
            raise HTTPException(status_code=404, detail="Publisher not found")
        
        publisher = pub_response.data[0]
        
        # Get breakdown by book
        books_response = db.table("books")\
            .select("id, title")\
            .eq("publisher_id", publisher_id)\
            .execute()
        
        books_breakdown = []
        if books_response.data:
            for book in books_response.data:
                # Get tokens for this book from token_usage
                # This requires querying the JSONB books_used field
                # For now, we'll leave this as TODO and just return book list
                books_breakdown.append({
                    "book_id": book["id"],
                    "book_title": book["title"],
                    # TODO: Add per-book token stats
                })
        
        return {
            "publisher_id": publisher_id,
            "publisher_name": publisher.get("name"),
            "total_tokens_generated": publisher.get("total_tokens_generated", 0),
            "total_revenue_paisa": publisher.get("total_revenue_paisa", 0),
            "total_revenue_rupees": publisher.get("total_revenue_paisa", 0) / 100,
            "total_books": publisher.get("total_books", 0),
            "books": books_breakdown
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
