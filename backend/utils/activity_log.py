"""
Helper for logging institution activity via the log_institution_activity RPC.
Centralized so future schema changes only need updating in one place.
"""

from typing import Optional, Dict, Any


def log_institution_activity(
    db,
    institution_id: str,
    user_id: str,
    user_name: str,
    action_type: str,
    action_description: str,
    user_role: str = "institution_admin",
    action_details: Optional[Dict[str, Any]] = None,
):
    """
    Log an institution activity. Always non-fatal — failures are caught and
    printed so logging issues never break the calling endpoint.

    Args:
        db: Supabase client (from get_db())
        institution_id: UUID of the institution
        user_id: Clerk user ID of the actor
        user_name: Display name of the actor
        action_type: Short identifier like 'settings_updated', 'student_approved'
        action_description: Human-readable description for activity feed
        user_role: One of 'institution_admin', 'platform_admin', 'student'
        action_details: Optional JSON payload with structured detail
    """
    try:
        db.rpc("log_institution_activity", {
            "p_institution_id": institution_id,
            "p_user_id": user_id,
            "p_user_name": user_name,
            "p_user_role": user_role,
            "p_action_type": action_type,
            "p_action_description": action_description,
            "p_action_details": action_details,
        }).execute()
    except Exception as e:
        print(f"⚠️ Activity log failed (non-fatal): {e}")
