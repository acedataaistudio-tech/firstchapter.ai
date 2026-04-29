"""
Admin Cost Tracking Dashboard - Phase 2.5
Platform economics monitoring:
- OpenAI costs vs revenue
- Publisher payouts
- Platform margin
- Institution profitability
"""

from fastapi import APIRouter, HTTPException, Header
from database.crud import get_db
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()


@router.get("/admin/costs/overview")
def get_cost_overview(
    days: int = 30,
    x_user_id: str = Header(default="anonymous")
):
    """
    Platform-wide cost overview
    
    Shows:
    - Total OpenAI costs
    - Total publisher payouts
    - Total revenue
    - Net profit margin
    """
    try:
        # TODO: Verify admin role
        # For now, allow access
        
        db = get_db()
        
        # Date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get aggregate token usage with costs
        usage_stats = db.table("token_usage")\
            .select("openai_total_cost_usd, openai_total_cost_inr, total_revenue_paisa")\
            .gte("created_at", start_date.isoformat())\
            .lte("created_at", end_date.isoformat())\
            .execute()
        
        total_openai_cost_usd = 0
        total_openai_cost_inr = 0
        total_publisher_payout_paisa = 0
        query_count = 0
        
        if usage_stats.data:
            for record in usage_stats.data:
                total_openai_cost_usd += float(record.get("openai_total_cost_usd", 0) or 0)
                total_openai_cost_inr += record.get("openai_total_cost_inr", 0) or 0
                total_publisher_payout_paisa += record.get("total_revenue_paisa", 0) or 0
                query_count += 1
        
        # Get subscription revenue (simplified - actual revenue from active subscriptions)
        subscriptions = db.table("subscriptions")\
            .select("platform_commission_inr")\
            .eq("is_active", True)\
            .execute()
        
        total_revenue_inr = 0
        if subscriptions.data:
            for sub in subscriptions.data:
                commission = sub.get("platform_commission_inr", 0) or 0
                total_revenue_inr += commission
        
        # Calculate margins
        publisher_payout_inr = total_publisher_payout_paisa / 100
        
        # Platform margin = Revenue - OpenAI costs - Publisher payouts
        gross_profit = total_revenue_inr - total_openai_cost_inr - publisher_payout_inr
        margin_percent = (gross_profit / total_revenue_inr * 100) if total_revenue_inr > 0 else 0
        
        return {
            "period": {
                "start_date": start_date.date().isoformat(),
                "end_date": end_date.date().isoformat(),
                "days": days
            },
            "revenue": {
                "total_inr": total_revenue_inr,
                "from_subscriptions": len(subscriptions.data) if subscriptions.data else 0
            },
            "costs": {
                "openai_usd": round(total_openai_cost_usd, 2),
                "openai_inr": total_openai_cost_inr,
                "publisher_payouts_inr": int(publisher_payout_inr),
                "total_costs_inr": int(total_openai_cost_inr + publisher_payout_inr)
            },
            "profit": {
                "gross_profit_inr": int(gross_profit),
                "margin_percent": round(margin_percent, 2)
            },
            "metrics": {
                "total_queries": query_count,
                "avg_cost_per_query_usd": round(total_openai_cost_usd / query_count, 4) if query_count > 0 else 0,
                "avg_revenue_per_query_inr": round(publisher_payout_inr / query_count, 2) if query_count > 0 else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/costs/institutions")
def get_institution_profitability(
    x_user_id: str = Header(default="anonymous")
):
    """
    Per-institution profitability analysis
    
    Shows which institutions are most profitable
    """
    try:
        db = get_db()
        
        # Get all active institution subscriptions
        subscriptions = db.table("subscriptions")\
            .select("id, institution_id, platform_commission_inr, openai_cost_inr, publisher_payout_inr")\
            .eq("type", "institution")\
            .eq("is_active", True)\
            .execute()
        
        if not subscriptions.data:
            return {"institutions": []}
        
        results = []
        
        for sub in subscriptions.data:
            institution_id = sub.get("institution_id")
            if not institution_id:
                continue
            
            # Get institution details
            institution = db.table("colleges")\
                .select("name")\
                .eq("id", institution_id)\
                .single()\
                .execute()
            
            commission = sub.get("platform_commission_inr", 0) or 0
            openai_cost = sub.get("openai_cost_inr", 0) or 0
            publisher_payout = sub.get("publisher_payout_inr", 0) or 0
            
            # Calculate profit
            gross_profit = commission - openai_cost - publisher_payout
            margin = (gross_profit / commission * 100) if commission > 0 else 0
            
            results.append({
                "institution_id": institution_id,
                "institution_name": institution.data.get("name") if institution.data else "Unknown",
                "revenue": commission,
                "costs": {
                    "openai": openai_cost,
                    "publisher_payouts": publisher_payout,
                    "total": openai_cost + publisher_payout
                },
                "profit": gross_profit,
                "margin_percent": round(margin, 2)
            })
        
        # Sort by profit (descending)
        results.sort(key=lambda x: x['profit'], reverse=True)
        
        return {
            "institutions": results,
            "total_institutions": len(results),
            "total_profit": sum(r['profit'] for r in results),
            "avg_margin": round(sum(r['margin_percent'] for r in results) / len(results), 2) if results else 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/costs/publishers")
def get_publisher_payouts(
    days: int = 30,
    x_user_id: str = Header(default="anonymous")
):
    """
    Publisher payout statistics
    
    Shows how much each publisher has earned
    """
    try:
        db = get_db()
        
        # Get all publishers with revenue
        publishers = db.table("publishers")\
            .select("id, name, total_tokens_generated, total_revenue_paisa, total_books")\
            .order("total_revenue_paisa", desc=True)\
            .execute()
        
        if not publishers.data:
            return {"publishers": []}
        
        results = []
        total_payouts = 0
        
        for pub in publishers.data:
            revenue_paisa = pub.get("total_revenue_paisa", 0) or 0
            revenue_inr = revenue_paisa / 100
            
            # Check if payment threshold reached (₹500)
            payment_ready = revenue_inr >= 500
            
            results.append({
                "publisher_id": pub["id"],
                "publisher_name": pub.get("name", "Unknown"),
                "total_books": pub.get("total_books", 0),
                "tokens_generated": pub.get("total_tokens_generated", 0),
                "revenue_inr": revenue_inr,
                "payment_ready": payment_ready,
                "payment_threshold": 500
            })
            
            total_payouts += revenue_inr
        
        # Count publishers ready for payment
        ready_for_payment = sum(1 for p in results if p['payment_ready'])
        
        return {
            "publishers": results,
            "total_publishers": len(results),
            "total_payouts_inr": round(total_payouts, 2),
            "publishers_ready_for_payment": ready_for_payment,
            "amount_ready_for_payment": sum(p['revenue_inr'] for p in results if p['payment_ready'])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/costs/daily-breakdown")
def get_daily_cost_breakdown(
    days: int = 7,
    x_user_id: str = Header(default="anonymous")
):
    """
    Daily cost breakdown for trend analysis
    
    Shows day-by-day costs and revenue
    """
    try:
        db = get_db()
        
        results = []
        
        for i in range(days):
            date = datetime.now().date() - timedelta(days=i)
            next_date = date + timedelta(days=1)
            
            # Get token usage for this day
            usage = db.table("token_usage")\
                .select("openai_total_cost_usd, openai_total_cost_inr, total_revenue_paisa, total_tokens")\
                .gte("created_at", date.isoformat())\
                .lt("created_at", next_date.isoformat())\
                .execute()
            
            openai_cost_usd = 0
            openai_cost_inr = 0
            publisher_payout_paisa = 0
            total_tokens = 0
            query_count = 0
            
            if usage.data:
                for record in usage.data:
                    openai_cost_usd += float(record.get("openai_total_cost_usd", 0) or 0)
                    openai_cost_inr += record.get("openai_total_cost_inr", 0) or 0
                    publisher_payout_paisa += record.get("total_revenue_paisa", 0) or 0
                    total_tokens += record.get("total_tokens", 0) or 0
                    query_count += 1
            
            results.append({
                "date": date.isoformat(),
                "queries": query_count,
                "tokens": total_tokens,
                "costs": {
                    "openai_usd": round(openai_cost_usd, 2),
                    "openai_inr": openai_cost_inr,
                    "publisher_payouts_inr": int(publisher_payout_paisa / 100)
                }
            })
        
        # Reverse to show oldest to newest
        results.reverse()
        
        return {
            "daily_breakdown": results,
            "period_days": days
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/costs/roi-calculator")
def calculate_roi(
    package_price: int,  # In rupees
    expected_queries: int,
    avg_tokens_per_query: int = 2000,
    x_user_id: str = Header(default="anonymous")
):
    """
    ROI Calculator for new institution packages
    
    Helps estimate profitability of different pricing tiers
    """
    try:
        # Split package (50-50)
        platform_commission = package_price / 2
        token_budget = package_price / 2
        
        # Token allocation (33% input, 67% output)
        input_budget = token_budget * 0.33
        output_budget = token_budget * 0.67
        
        # Convert to tokens
        USD_TO_INR = 83
        input_tokens = int((input_budget / USD_TO_INR) / 0.00015 * 1_000_000)
        output_tokens = int((output_budget / USD_TO_INR) / 0.0006 * 1_000_000)
        
        # Estimate costs
        estimated_input_tokens = expected_queries * avg_tokens_per_query * 0.8  # 80% of output
        estimated_output_tokens = expected_queries * avg_tokens_per_query
        
        # OpenAI costs
        openai_input_cost_usd = (estimated_input_tokens / 1_000_000) * 0.15
        openai_output_cost_usd = (estimated_output_tokens / 1_000_000) * 0.6
        total_openai_cost_usd = openai_input_cost_usd + openai_output_cost_usd
        total_openai_cost_inr = total_openai_cost_usd * USD_TO_INR
        
        # Publisher payouts
        publisher_payout_inr = (estimated_output_tokens * 0.01)
        
        # Profit calculation
        total_costs = total_openai_cost_inr + publisher_payout_inr
        gross_profit = platform_commission - total_costs
        margin = (gross_profit / platform_commission * 100) if platform_commission > 0 else 0
        
        # Capacity checks
        input_capacity_used = (estimated_input_tokens / input_tokens * 100) if input_tokens > 0 else 0
        output_capacity_used = (estimated_output_tokens / output_tokens * 100) if output_tokens > 0 else 0
        
        return {
            "package_analysis": {
                "package_price": package_price,
                "platform_commission": int(platform_commission),
                "token_budget": int(token_budget)
            },
            "token_allocation": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "input_budget_inr": int(input_budget),
                "output_budget_inr": int(output_budget)
            },
            "usage_estimate": {
                "expected_queries": expected_queries,
                "avg_tokens_per_query": avg_tokens_per_query,
                "total_input_tokens": int(estimated_input_tokens),
                "total_output_tokens": int(estimated_output_tokens),
                "input_capacity_used_percent": round(input_capacity_used, 2),
                "output_capacity_used_percent": round(output_capacity_used, 2)
            },
            "costs": {
                "openai_usd": round(total_openai_cost_usd, 2),
                "openai_inr": int(total_openai_cost_inr),
                "publisher_payouts_inr": int(publisher_payout_inr),
                "total_costs_inr": int(total_costs)
            },
            "profitability": {
                "gross_profit_inr": int(gross_profit),
                "margin_percent": round(margin, 2),
                "profitable": gross_profit > 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
