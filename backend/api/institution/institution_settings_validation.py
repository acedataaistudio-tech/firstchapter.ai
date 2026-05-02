"""
Institution Settings Validation & Safety Rails
Prevents dangerous configurations and calculates burn rates
"""

from typing import Dict, Tuple, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

class SettingsValidationResult(BaseModel):
    """Result of settings validation"""
    is_valid: bool
    warnings: list[str] = []
    errors: list[str] = []
    requires_confirmation: bool = False
    requires_approval: bool = False
    estimated_days_until_exhaustion: Optional[int] = None
    estimated_burn_rate_24h: Optional[float] = None
    quota_impact_message: Optional[str] = None

class InstitutionSettingsBounds:
    """Define safe ranges for institution admin configuration"""
    
    # Institution admin can configure within these ranges
    STUDENT_CAP_MIN = 0.1  # 0.1%
    STUDENT_CAP_MAX = 2.0  # 2.0%
    STUDENT_CAP_DEFAULT = 0.5
    
    MAX_TOKENS_MIN = 500
    MAX_TOKENS_MAX = 8000
    MAX_TOKENS_DEFAULT = 4000
    
    RATE_LIMIT_MIN = 5   # req/min
    RATE_LIMIT_MAX = 30  # req/min
    RATE_LIMIT_DEFAULT = 15
    
    # Safety thresholds
    DAYS_UNTIL_EXHAUSTION_WARNING = 7  # Warn if quota lasts < 7 days
    BURN_RATE_24H_WARNING = 20.0  # Warn if using > 20% quota in 24h
    BURN_RATE_24H_CRITICAL = 50.0  # Auto-throttle if > 50% in 24h

def validate_institution_settings(
    student_cap_percentage: float,
    max_tokens_per_request: int,
    rate_limit_per_minute: int,
    total_students: int,
    monthly_quota: int,
    current_usage: int = 0,
    is_platform_admin: bool = False
) -> SettingsValidationResult:
    """
    Validate institution settings and calculate impact.
    
    Args:
        student_cap_percentage: Requested per-student cap (%)
        max_tokens_per_request: Requested max tokens per request
        rate_limit_per_minute: Requested rate limit
        total_students: Number of students in institution
        monthly_quota: Total monthly token quota
        current_usage: Current token usage this month
        is_platform_admin: If True, bypass range checks
        
    Returns:
        SettingsValidationResult with validation outcome
    """
    result = SettingsValidationResult(is_valid=True)
    
    # ═══════════════════════════════════════════════════════════
    # 1. RANGE VALIDATION (Institution admins only)
    # ═══════════════════════════════════════════════════════════
    if not is_platform_admin:
        # Student cap percentage
        if student_cap_percentage < InstitutionSettingsBounds.STUDENT_CAP_MIN:
            result.errors.append(
                f"Per-student cap must be at least {InstitutionSettingsBounds.STUDENT_CAP_MIN}%"
            )
            result.is_valid = False
        
        if student_cap_percentage > InstitutionSettingsBounds.STUDENT_CAP_MAX:
            result.errors.append(
                f"Per-student cap cannot exceed {InstitutionSettingsBounds.STUDENT_CAP_MAX}%. "
                f"Request platform approval for higher limits."
            )
            result.is_valid = False
            result.requires_approval = True
        
        # Max tokens per request
        if max_tokens_per_request < InstitutionSettingsBounds.MAX_TOKENS_MIN:
            result.errors.append(
                f"Max tokens must be at least {InstitutionSettingsBounds.MAX_TOKENS_MIN}"
            )
            result.is_valid = False
        
        if max_tokens_per_request > InstitutionSettingsBounds.MAX_TOKENS_MAX:
            result.errors.append(
                f"Max tokens cannot exceed {InstitutionSettingsBounds.MAX_TOKENS_MAX}. "
                f"Request platform approval for higher limits."
            )
            result.is_valid = False
            result.requires_approval = True
        
        # Rate limit
        if rate_limit_per_minute < InstitutionSettingsBounds.RATE_LIMIT_MIN:
            result.errors.append(
                f"Rate limit must be at least {InstitutionSettingsBounds.RATE_LIMIT_MIN} requests/min"
            )
            result.is_valid = False
        
        if rate_limit_per_minute > InstitutionSettingsBounds.RATE_LIMIT_MAX:
            result.errors.append(
                f"Rate limit cannot exceed {InstitutionSettingsBounds.RATE_LIMIT_MAX} requests/min. "
                f"Request platform approval for higher limits."
            )
            result.is_valid = False
            result.requires_approval = True
    
    # ═══════════════════════════════════════════════════════════
    # 2. BURN RATE CALCULATION
    # ═══════════════════════════════════════════════════════════
    
    # Calculate maximum possible daily usage
    # Assumptions for worst-case scenario:
    # - All students use their full daily allocation
    # - Each request uses max_tokens
    # - Students make requests at full rate limit
    
    student_monthly_allocation = (monthly_quota * student_cap_percentage / 100)
    student_daily_allocation = student_monthly_allocation / 30  # Rough daily avg
    
    # Max daily usage if ALL students use full allocation
    max_daily_usage = student_daily_allocation * total_students
    
    # Estimate days until quota exhausted (worst case)
    remaining_quota = monthly_quota - current_usage
    if max_daily_usage > 0:
        days_until_exhaustion = remaining_quota / max_daily_usage
        result.estimated_days_until_exhaustion = int(days_until_exhaustion)
    else:
        result.estimated_days_until_exhaustion = 999  # Effectively unlimited
    
    # ═══════════════════════════════════════════════════════════
    # 3. SAFETY WARNINGS
    # ═══════════════════════════════════════════════════════════
    
    # Warning: Quota could be exhausted quickly
    if result.estimated_days_until_exhaustion < InstitutionSettingsBounds.DAYS_UNTIL_EXHAUSTION_WARNING:
        result.warnings.append(
            f"⚠️ At maximum usage, your quota will last only "
            f"{result.estimated_days_until_exhaustion} days. "
            f"Consider lowering per-student caps or upgrading your plan."
        )
        result.requires_confirmation = True
        result.quota_impact_message = (
            f"With {total_students} students, each using up to {student_cap_percentage}% "
            f"of quota, your monthly allocation could be exhausted in "
            f"{result.estimated_days_until_exhaustion} days at maximum usage."
        )
    
    # Warning: Very high max_tokens
    if max_tokens_per_request > 6000:
        result.warnings.append(
            f"💡 High max_tokens ({max_tokens_per_request}) may lead to expensive queries. "
            f"Most queries work well with 2000-4000 tokens."
        )
    
    # Warning: Very high rate limit
    if rate_limit_per_minute > 25:
        result.warnings.append(
            f"💡 High rate limit ({rate_limit_per_minute} req/min) may enable rapid "
            f"quota consumption. Consider monitoring usage closely."
        )
    
    # Info: Conservative settings
    if (student_cap_percentage <= 0.3 and 
        max_tokens_per_request <= 3000 and 
        rate_limit_per_minute <= 10):
        result.warnings.append(
            "✅ These conservative settings will help ensure quota lasts the full month."
        )
    
    # ═══════════════════════════════════════════════════════════
    # 4. MATHEMATICAL IMPOSSIBILITY CHECK
    # ═══════════════════════════════════════════════════════════
    
    # Check if total allocation exceeds quota
    total_possible_allocation = student_monthly_allocation * total_students
    allocation_ratio = (total_possible_allocation / monthly_quota) * 100
    
    if allocation_ratio > 100:
        result.errors.append(
            f"❌ Mathematical impossibility: {total_students} students × "
            f"{student_cap_percentage}% = {allocation_ratio:.1f}% total allocation. "
            f"This exceeds 100% of quota! Reduce per-student cap or student count."
        )
        result.is_valid = False
    
    elif allocation_ratio > 80:
        result.warnings.append(
            f"⚠️ High total allocation: {total_students} students × "
            f"{student_cap_percentage}% = {allocation_ratio:.1f}% of quota. "
            f"Consider if all students will actively use their allocation."
        )
        result.requires_confirmation = True
    
    return result


def calculate_burn_rate_24h(institution_id: str, db) -> float:
    """
    Calculate current burn rate (% of quota used in last 24 hours).
    
    Args:
        institution_id: Institution ID
        db: Supabase database client
        
    Returns:
        Percentage of monthly quota used in last 24 hours
    """
    from datetime import datetime, timedelta
    
    # Get institution subscription
    subscription = db.table("subscriptions")\
        .select("*")\
        .eq("institution_id", institution_id)\
        .eq("is_active", True)\
        .single()\
        .execute()
    
    if not subscription.data:
        return 0.0
    
    sub = subscription.data
    monthly_quota = (sub.get("input_tokens_allocated", 0) + 
                    sub.get("output_tokens_allocated", 0))
    
    if monthly_quota == 0:
        return 0.0
    
    # Get usage in last 24 hours
    yesterday = datetime.utcnow() - timedelta(hours=24)
    
    recent_usage = db.table("institution_request_logs")\
        .select("tokens_used")\
        .eq("institution_id", institution_id)\
        .eq("status", "completed")\
        .gte("created_at", yesterday.isoformat())\
        .execute()
    
    tokens_24h = sum(r.get("tokens_used", 0) for r in (recent_usage.data or []))
    
    burn_rate = (tokens_24h / monthly_quota) * 100
    return round(burn_rate, 2)


def should_trigger_auto_throttle(
    burn_rate_24h: float,
    current_usage_percent: float
) -> Tuple[bool, Optional[str]]:
    """
    Determine if auto-throttle should be applied.
    
    Args:
        burn_rate_24h: Percentage of quota used in last 24h
        current_usage_percent: Total usage percentage for the month
        
    Returns:
        Tuple of (should_throttle, reason)
    """
    if burn_rate_24h > InstitutionSettingsBounds.BURN_RATE_24H_CRITICAL:
        return (
            True,
            f"🚨 Emergency throttle: {burn_rate_24h:.1f}% of monthly quota "
            f"used in last 24 hours. Auto-throttle applied to prevent exhaustion."
        )
    
    if current_usage_percent >= 95 and burn_rate_24h > 10:
        return (
            True,
            f"🚨 Emergency throttle: At {current_usage_percent:.1f}% usage with "
            f"{burn_rate_24h:.1f}% burn rate. Protecting remaining quota."
        )
    
    return (False, None)


def get_recommended_settings(
    total_students: int,
    monthly_quota: int,
    usage_pattern: str = "balanced"  # 'conservative', 'balanced', 'aggressive'
) -> Dict[str, any]:
    """
    Recommend safe settings based on institution size and usage pattern.
    
    Args:
        total_students: Number of students
        monthly_quota: Monthly token quota
        usage_pattern: Desired usage pattern
        
    Returns:
        Dict with recommended settings
    """
    recommendations = {
        "conservative": {
            "student_cap_percentage": 0.3,
            "max_tokens_per_request": 3000,
            "rate_limit_per_minute": 10,
            "description": "Ensures quota lasts full month with buffer"
        },
        "balanced": {
            "student_cap_percentage": 0.5,
            "max_tokens_per_request": 4000,
            "rate_limit_per_minute": 15,
            "description": "Default recommended settings"
        },
        "aggressive": {
            "student_cap_percentage": 1.0,
            "max_tokens_per_request": 6000,
            "rate_limit_per_minute": 20,
            "description": "Higher limits for power users (monitor closely)"
        }
    }
    
    base_settings = recommendations.get(usage_pattern, recommendations["balanced"])
    
    # Adjust based on student count
    if total_students > 1000:
        # Large institutions need more conservative settings
        base_settings["student_cap_percentage"] *= 0.7
        base_settings["description"] += " (adjusted for large student body)"
    
    # Calculate estimated days
    student_allocation = (monthly_quota * base_settings["student_cap_percentage"] / 100)
    daily_usage = (student_allocation / 30) * total_students
    days_lasting = monthly_quota / daily_usage if daily_usage > 0 else 999
    
    base_settings["estimated_days_quota_lasts"] = int(days_lasting)
    
    return base_settings
