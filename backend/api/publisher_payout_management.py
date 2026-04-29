"""
Publisher Payout Rate Management - Admin Endpoint
Allows admins to view and update payout rates per publisher
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from database.crud import get_db
from typing import Optional

router = APIRouter()


class UpdatePayoutRateRequest(BaseModel):
    payout_rate_per_token: float


@router.get("/admin/publishers/payout-rates")
def get_all_payout_rates(
    x_user_id: str = Header(default="anonymous")
):
    """
    Get payout rates for all publishers
    
    Shows:
    - Current rate per token
    - Rate per million tokens
    - Total revenue to date
    """
    try:
        # TODO: Verify admin role
        
        db = get_db()
        
        publishers = db.table("publishers")\
            .select("id, name, payout_rate_per_token, total_tokens_generated, total_revenue_paisa, total_books")\
            .order("name")\
            .execute()
        
        if not publishers.data:
            return {"publishers": []}
        
        result = []
        for pub in publishers.data:
            rate = float(pub.get("payout_rate_per_token", 0.000001))
            tokens = pub.get("total_tokens_generated", 0) or 0
            revenue_paisa = pub.get("total_revenue_paisa", 0) or 0
            
            result.append({
                "publisher_id": pub["id"],
                "publisher_name": pub.get("name", "Unknown"),
                "payout_rate_per_token": rate,
                "payout_rate_per_million_tokens": rate * 1_000_000,
                "total_tokens_generated": tokens,
                "total_revenue_paisa": revenue_paisa,
                "total_revenue_rupees": revenue_paisa / 100,
                "total_books": pub.get("total_books", 0),
                "rate_display": {
                    "per_token": f"₹{rate:.8f}",
                    "per_1k_tokens": f"₹{rate * 1000:.5f}",
                    "per_1m_tokens": f"₹{rate * 1_000_000:.2f}",
                    "in_paisa": f"{rate * 100:.6f} paisa"
                }
            })
        
        # Calculate platform totals
        total_tokens = sum(p["total_tokens_generated"] for p in result)
        total_revenue = sum(p["total_revenue_rupees"] for p in result)
        
        return {
            "publishers": result,
            "summary": {
                "total_publishers": len(result),
                "total_tokens_generated": total_tokens,
                "total_revenue_paid_rupees": round(total_revenue, 2),
                "default_rate_per_token": 0.000001
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/publishers/{publisher_id}/payout-rate")
def get_publisher_payout_rate(
    publisher_id: str,
    x_user_id: str = Header(default="anonymous")
):
    """Get payout rate for specific publisher"""
    try:
        # TODO: Verify admin role
        
        db = get_db()
        
        publisher = db.table("publishers")\
            .select("id, name, payout_rate_per_token, total_tokens_generated, total_revenue_paisa")\
            .eq("id", publisher_id)\
            .single()\
            .execute()
        
        if not publisher.data:
            raise HTTPException(status_code=404, detail="Publisher not found")
        
        pub = publisher.data
        rate = float(pub.get("payout_rate_per_token", 0.000001))
        
        return {
            "publisher_id": pub["id"],
            "publisher_name": pub.get("name"),
            "payout_rate_per_token": rate,
            "payout_rate_per_million_tokens": rate * 1_000_000,
            "total_tokens_generated": pub.get("total_tokens_generated", 0) or 0,
            "total_revenue_paisa": pub.get("total_revenue_paisa", 0) or 0,
            "total_revenue_rupees": (pub.get("total_revenue_paisa", 0) or 0) / 100,
            "rate_examples": {
                "1_token": f"₹{rate:.8f}",
                "1000_tokens": f"₹{rate * 1000:.5f}",
                "1_million_tokens": f"₹{rate * 1_000_000:.2f}",
                "1_billion_tokens": f"₹{rate * 1_000_000_000:,.2f}"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/admin/publishers/{publisher_id}/payout-rate")
def update_publisher_payout_rate(
    publisher_id: str,
    request: UpdatePayoutRateRequest,
    x_user_id: str = Header(default="anonymous")
):
    """
    Update payout rate for a specific publisher
    
    Example rates:
    - Default: 0.000001 (₹1 per 1M tokens)
    - Premium: 0.000002 (₹2 per 1M tokens)
    - Budget: 0.0000005 (₹0.50 per 1M tokens)
    """
    try:
        # TODO: Verify admin role
        
        # Validate rate
        if request.payout_rate_per_token < 0:
            raise HTTPException(status_code=400, detail="Rate cannot be negative")
        
        if request.payout_rate_per_token > 0.01:
            raise HTTPException(status_code=400, detail="Rate too high (max ₹0.01 per token)")
        
        db = get_db()
        
        # Check publisher exists
        publisher = db.table("publishers")\
            .select("id, name, payout_rate_per_token")\
            .eq("id", publisher_id)\
            .single()\
            .execute()
        
        if not publisher.data:
            raise HTTPException(status_code=404, detail="Publisher not found")
        
        old_rate = float(publisher.data.get("payout_rate_per_token", 0.000001))
        
        # Update rate
        db.table("publishers").update({
            "payout_rate_per_token": request.payout_rate_per_token,
            "updated_at": "now()"
        }).eq("id", publisher_id).execute()
        
        return {
            "success": True,
            "publisher_id": publisher_id,
            "publisher_name": publisher.data.get("name"),
            "old_rate": old_rate,
            "new_rate": request.payout_rate_per_token,
            "rate_change": {
                "per_token_difference": request.payout_rate_per_token - old_rate,
                "per_million_tokens_new": request.payout_rate_per_token * 1_000_000,
                "per_million_tokens_old": old_rate * 1_000_000
            },
            "message": f"Payout rate updated from ₹{old_rate:.8f} to ₹{request.payout_rate_per_token:.8f} per token"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/publishers/payout-rates/bulk-update")
def bulk_update_payout_rates(
    rate: float,
    x_user_id: str = Header(default="anonymous")
):
    """
    Update payout rate for ALL publishers at once
    
    Use with caution!
    """
    try:
        # TODO: Verify admin role + additional confirmation
        
        if rate < 0 or rate > 0.01:
            raise HTTPException(status_code=400, detail="Invalid rate")
        
        db = get_db()
        
        # Update all publishers
        result = db.table("publishers").update({
            "payout_rate_per_token": rate,
            "updated_at": "now()"
        }).execute()
        
        return {
            "success": True,
            "new_rate": rate,
            "publishers_updated": len(result.data) if result.data else 0,
            "message": f"All publishers updated to ₹{rate:.8f} per token"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
