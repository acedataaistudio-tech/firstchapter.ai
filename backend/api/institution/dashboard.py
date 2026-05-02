"""
Institution Dashboard API
Provides all data needed for institution admin dashboard
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter()

# ══════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ══════════════════════════════════════════════════════════════════

class UpdateInstitutionSettingsRequest(BaseModel):
    """Institution admin updates FUP settings (within bounds)"""
    institution_id: str
    admin_user_id: str
    admin_name: str
    student_cap_percentage: Optional[float] = None  # 0.1-2.0
    max_tokens_per_request: Optional[int] = None    # 500-8000
    rate_limit_per_minute: Optional[int] = None     # 5-30
    change_reason: str

# ══════════════════════════════════════════════════════════════════
# ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@router.get("/institution/{institution_id}/dashboard")
async def get_institution_dashboard(institution_id: str):
    """
    Get complete dashboard data for institution.
    Includes: subscription, usage, students, settings, alerts
    """
    from database.crud import get_db
    db = get_db()
    
    try:
        # ═══════════════════════════════════════════════════════════
        # 1. INSTITUTION DETAILS
        # ═══════════════════════════════════════════════════════════
        institution = db.table("institutions")\
            .select("*")\
            .eq("id", institution_id)\
            .single()\
            .execute()
        
        if not institution.data:
            raise HTTPException(status_code=404, detail="Institution not found")
        
        inst = institution.data
        
        # ═══════════════════════════════════════════════════════════
        # 2. SUBSCRIPTION & PACKAGE DETAILS
        # ═══════════════════════════════════════════════════════════
        subscription = db.table("subscriptions")\
            .select("*")\
            .eq("institution_id", institution_id)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        sub_data = subscription.data if subscription.data else None
        
        if sub_data:
            # Calculate usage percentages
            input_allocated = sub_data.get("input_tokens_allocated", 0)
            output_allocated = sub_data.get("output_tokens_allocated", 0)
            total_allocated = input_allocated + output_allocated
            
            input_used = sub_data.get("input_tokens_used", 0)
            output_used = sub_data.get("output_tokens_used", 0)
            total_used = input_used + output_used
            
            usage_percent = (total_used / total_allocated * 100) if total_allocated > 0 else 0
            
            # Get current settings (considering overrides)
            settings_result = db.rpc(
                "get_effective_institution_settings",
                {"p_subscription_id": sub_data["id"]}
            ).execute()
            
            current_settings = settings_result.data[0] if settings_result.data else {
                "student_cap_percentage": sub_data.get("student_cap_percentage", 0.5),
                "max_tokens_per_request": sub_data.get("max_tokens_per_request", 4000),
                "rate_limit_per_minute": sub_data.get("rate_limit_per_minute", 15),
                "source": "subscription"
            }
        else:
            total_allocated = 0
            total_used = 0
            usage_percent = 0
            current_settings = None
        
        # ═══════════════════════════════════════════════════════════
        # 3. STUDENT STATISTICS
        # ═══════════════════════════════════════════════════════════
        students = db.table("institution_students")\
            .select("id, application_status, is_active")\
            .eq("institution_id", institution_id)\
            .execute()
        
        student_list = students.data or []
        
        student_stats = {
            "total": len(student_list),
            "pending": len([s for s in student_list if s.get("application_status") == "pending"]),
            "approved": len([s for s in student_list if s.get("application_status") == "approved"]),
            "active": len([s for s in student_list if s.get("is_active")]),
            "rejected": len([s for s in student_list if s.get("application_status") == "rejected"]),
        }
        
        # ═══════════════════════════════════════════════════════════
        # 4. RECENT ACTIVITY
        # ═══════════════════════════════════════════════════════════
        activity = db.table("institution_activity_log")\
            .select("*")\
            .eq("institution_id", institution_id)\
            .order("created_at", desc=True)\
            .limit(10)\
            .execute()
        
        # ═══════════════════════════════════════════════════════════
        # 5. USAGE TRENDS (Last 30 days)
        # ═══════════════════════════════════════════════════════════
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        usage_logs = db.table("institution_request_logs")\
            .select("tokens_used, created_at, status")\
            .eq("institution_id", institution_id)\
            .gte("created_at", thirty_days_ago.isoformat())\
            .execute()
        
        # Group by day
        daily_usage = {}
        for log in (usage_logs.data or []):
            if log.get("status") == "completed":
                day = log["created_at"][:10]  # YYYY-MM-DD
                if day not in daily_usage:
                    daily_usage[day] = 0
                daily_usage[day] += log.get("tokens_used", 0)
        
        # ═══════════════════════════════════════════════════════════
        # 6. QUOTA ALERTS
        # ═══════════════════════════════════════════════════════════
        alerts = db.table("institution_quota_alerts")\
            .select("*")\
            .eq("institution_id", institution_id)\
            .eq("is_acknowledged", False)\
            .order("created_at", desc=True)\
            .limit(5)\
            .execute()
        
        # ═══════════════════════════════════════════════════════════
        # RETURN COMPLETE DASHBOARD DATA
        # ═══════════════════════════════════════════════════════════
        
        return {
            "institution": {
                "id": inst["id"],
                "name": inst["name"],
                "full_name": inst.get("full_name"),
                "type": inst.get("type"),
                "is_active": inst.get("is_active"),
                "contact_email": inst.get("contact_email"),
            },
            "subscription": {
                "package_name": sub_data.get("package_name") if sub_data else None,
                "total_allocated": total_allocated,
                "total_used": total_used,
                "usage_percent": round(usage_percent, 1),
                "input_allocated": input_allocated if sub_data else 0,
                "output_allocated": output_allocated if sub_data else 0,
                "input_used": input_used if sub_data else 0,
                "output_used": output_used if sub_data else 0,
                "start_date": sub_data.get("start_date") if sub_data else None,
                "end_date": sub_data.get("end_date") if sub_data else None,
                "is_active": sub_data.get("is_active") if sub_data else False,
                "trial_mode": sub_data.get("trial_mode_active") if sub_data else False,
                "trial_until": sub_data.get("trial_mode_until") if sub_data else None,
            },
            "settings": current_settings,
            "students": student_stats,
            "activity": activity.data or [],
            "usage_trends": daily_usage,
            "alerts": alerts.data or [],
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dashboard: {str(e)}")

@router.post("/institution/settings/update")
async def update_institution_settings(request: UpdateInstitutionSettingsRequest):
    """
    Institution admin updates FUP settings.
    Settings are validated before applying.
    """
    from database.crud import get_db
    from api.institution.institution_settings_validation import validate_institution_settings
    
    db = get_db()
    
    try:
        # Get subscription
        subscription = db.table("subscriptions")\
            .select("*")\
            .eq("institution_id", request.institution_id)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if not subscription.data:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        sub = subscription.data
        
        # Prepare updated settings
        new_settings = {
            "student_cap_percentage": request.student_cap_percentage or sub.get("student_cap_percentage"),
            "max_tokens_per_request": request.max_tokens_per_request or sub.get("max_tokens_per_request"),
            "rate_limit_per_minute": request.rate_limit_per_minute or sub.get("rate_limit_per_minute"),
        }
        
        # Validate settings
        total_quota = (sub.get("input_tokens_allocated", 0) + 
                      sub.get("output_tokens_allocated", 0))
        
        validation = validate_institution_settings(
            student_cap_percentage=new_settings["student_cap_percentage"],
            max_tokens_per_request=new_settings["max_tokens_per_request"],
            rate_limit_per_minute=new_settings["rate_limit_per_minute"],
            total_students=sub.get("total_students", 0),
            monthly_quota=total_quota,
            is_platform_admin=False  # Institution admin (bounded)
        )
        
        if not validation.is_valid:
            return {
                "success": False,
                "errors": validation.errors,
                "warnings": validation.warnings,
                "requires_approval": validation.requires_approval
            }
        
        # If requires confirmation, return validation result
        if validation.requires_confirmation:
            return {
                "success": False,
                "requires_confirmation": True,
                "warnings": validation.warnings,
                "quota_impact": validation.quota_impact_message,
                "estimated_days": validation.estimated_days_until_exhaustion
            }
        
        # Update settings
        db.table("subscriptions").update({
            "student_cap_percentage": new_settings["student_cap_percentage"],
            "max_tokens_per_request": new_settings["max_tokens_per_request"],
            "rate_limit_per_minute": new_settings["rate_limit_per_minute"],
            "settings_last_modified_by": request.admin_user_id,
            "settings_last_modified_at": datetime.utcnow().isoformat(),
            "settings_change_reason": request.change_reason,
        }).eq("id", sub["id"]).execute()
        
        # Log activity
        db.rpc("log_institution_activity", {
            "p_institution_id": request.institution_id,
            "p_user_id": request.admin_user_id,
            "p_user_name": request.admin_name,
            "p_action_type": "settings_updated",
            "p_action_description": f"Updated FUP settings",
            "p_details": new_settings
        }).execute()
        
        # Create audit record
        db.table("institution_settings_audit").insert({
            "institution_id": request.institution_id,
            "subscription_id": sub["id"],
            "changed_by_user_id": request.admin_user_id,
            "changed_by_role": "institution_admin",
            "setting_name": "fup_settings",
            "new_value": str(new_settings),
            "change_reason": request.change_reason,
        }).execute()
        
        return {
            "success": True,
            "message": "Settings updated successfully",
            "new_settings": new_settings
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Settings update failed: {str(e)}")

@router.get("/institution/{institution_id}/activity")
async def get_institution_activity_log(
    institution_id: str,
    limit: int = 50
):
    """Get activity log for institution"""
    from database.crud import get_db
    db = get_db()
    
    try:
        result = db.table("institution_activity_log")\
            .select("*")\
            .eq("institution_id", institution_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        return {
            "activity": result.data or [],
            "count": len(result.data or [])
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch activity: {str(e)}")
