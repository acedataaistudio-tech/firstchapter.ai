"""
Institution Quota Monitoring & Auto-Throttle
Background job that runs hourly to:
1. Calculate burn rates
2. Send alerts
3. Apply emergency throttling
4. Create quota warnings
"""

from datetime import datetime, timedelta
from typing import List, Dict
import asyncio

class InstitutionMonitor:
    """Monitor institution quota usage and apply safety measures"""
    
    def __init__(self, db):
        self.db = db
    
    async def run_monitoring_cycle(self):
        """
        Main monitoring cycle - runs every hour.
        Checks all active institutions.
        """
        print(f"[{datetime.utcnow()}] Starting institution monitoring cycle...")
        
        # Get all active institution subscriptions
        active_subs = self.db.table("subscriptions")\
            .select("*")\
            .eq("is_active", True)\
            .not_.is_("institution_id", "null")\
            .execute()
        
        if not active_subs.data:
            print("No active institution subscriptions found.")
            return
        
        for sub in active_subs.data:
            try:
                await self.monitor_institution(sub)
            except Exception as e:
                print(f"Error monitoring institution {sub.get('institution_id')}: {e}")
        
        print(f"[{datetime.utcnow()}] Monitoring cycle complete.")
    
    async def monitor_institution(self, subscription: Dict):
        """
        Monitor a single institution and take action if needed.
        
        Args:
            subscription: Subscription data dict
        """
        institution_id = subscription.get("institution_id")
        institution_name = subscription.get("institution_name", "Unknown")
        
        # Calculate current usage
        quota = (subscription.get("input_tokens_allocated", 0) + 
                subscription.get("output_tokens_allocated", 0))
        used = (subscription.get("input_tokens_used", 0) + 
               subscription.get("output_tokens_used", 0))
        
        if quota == 0:
            return  # No quota allocated, skip
        
        usage_percent = (used / quota) * 100
        
        # Calculate 24-hour burn rate
        burn_rate_24h = await self.calculate_burn_rate_24h(institution_id)
        
        # Estimate days until exhaustion
        remaining = quota - used
        if burn_rate_24h > 0:
            daily_usage = (quota * burn_rate_24h / 100)
            days_remaining = int(remaining / daily_usage) if daily_usage > 0 else 999
        else:
            days_remaining = 999
        
        print(f"Institution {institution_name}:")
        print(f"  Usage: {usage_percent:.1f}%")
        print(f"  Burn rate (24h): {burn_rate_24h:.2f}%")
        print(f"  Days remaining: {days_remaining}")
        
        # ═══════════════════════════════════════════════════════════
        # ALERT TRIGGERS
        # ═══════════════════════════════════════════════════════════
        
        # Critical burn rate (>50% in 24h)
        if burn_rate_24h > 50.0:
            await self.trigger_emergency_throttle(
                institution_id,
                subscription["id"],
                f"Extreme burn rate: {burn_rate_24h:.1f}% of monthly quota used in 24 hours"
            )
            await self.create_alert(
                institution_id,
                "burn_rate_critical",
                "emergency",
                f"🚨 CRITICAL: {burn_rate_24h:.1f}% of monthly quota used in last 24 hours!",
                usage_percent,
                burn_rate_24h,
                days_remaining
            )
        
        # High burn rate (>20% in 24h)
        elif burn_rate_24h > 20.0:
            await self.create_alert(
                institution_id,
                "burn_rate_high",
                "critical",
                f"⚠️ High usage: {burn_rate_24h:.1f}% of monthly quota used in last 24 hours",
                usage_percent,
                burn_rate_24h,
                days_remaining
            )
            await self.send_admin_email(
                subscription,
                "High Usage Alert",
                f"Your institution used {burn_rate_24h:.1f}% of monthly quota in the last 24 hours."
            )
        
        # Quota thresholds
        if usage_percent >= 95 and not self.alert_exists_recently(institution_id, "quota_95"):
            await self.create_alert(
                institution_id,
                "quota_95",
                "critical",
                "🚨 95% of monthly quota used!",
                usage_percent,
                burn_rate_24h,
                days_remaining
            )
            await self.send_admin_email(
                subscription,
                "Quota Critical - 95% Used",
                "Your institution has used 95% of monthly quota. Queries are now limited to 500 tokens."
            )
        
        elif usage_percent >= 90 and not self.alert_exists_recently(institution_id, "quota_90"):
            await self.create_alert(
                institution_id,
                "quota_90",
                "warning",
                "⚠️ 90% of monthly quota used",
                usage_percent,
                burn_rate_24h,
                days_remaining
            )
            await self.send_admin_email(
                subscription,
                "Quota Warning - 90% Used",
                "Your institution has used 90% of monthly quota. Queries are now limited to 2000 tokens."
            )
        
        elif usage_percent >= 80 and not self.alert_exists_recently(institution_id, "quota_80"):
            await self.create_alert(
                institution_id,
                "quota_80",
                "info",
                "💡 80% of monthly quota used",
                usage_percent,
                burn_rate_24h,
                days_remaining
            )
            await self.send_admin_email(
                subscription,
                "Quota Notice - 80% Used",
                "Your institution has used 80% of monthly quota. Please monitor usage."
            )
        
        # Low days remaining
        if days_remaining < 7 and days_remaining > 0:
            if not self.alert_exists_recently(institution_id, "quota_low_days"):
                await self.create_alert(
                    institution_id,
                    "quota_low_days",
                    "warning",
                    f"⏰ Quota may be exhausted in {days_remaining} days at current usage rate",
                    usage_percent,
                    burn_rate_24h,
                    days_remaining
                )
    
    async def calculate_burn_rate_24h(self, institution_id: str) -> float:
        """Calculate % of monthly quota used in last 24 hours"""
        # Get subscription quota
        sub = self.db.table("subscriptions")\
            .select("input_tokens_allocated, output_tokens_allocated")\
            .eq("institution_id", institution_id)\
            .eq("is_active", True)\
            .single()\
            .execute()
        
        if not sub.data:
            return 0.0
        
        quota = (sub.data.get("input_tokens_allocated", 0) + 
                sub.data.get("output_tokens_allocated", 0))
        
        if quota == 0:
            return 0.0
        
        # Get usage in last 24 hours
        yesterday = datetime.utcnow() - timedelta(hours=24)
        
        usage = self.db.table("institution_request_logs")\
            .select("tokens_used")\
            .eq("institution_id", institution_id)\
            .eq("status", "completed")\
            .gte("created_at", yesterday.isoformat())\
            .execute()
        
        tokens_24h = sum(r.get("tokens_used", 0) for r in (usage.data or []))
        burn_rate = (tokens_24h / quota) * 100
        
        return round(burn_rate, 2)
    
    async def trigger_emergency_throttle(
        self,
        institution_id: str,
        subscription_id: str,
        reason: str
    ):
        """
        Apply emergency throttle to institution.
        Throttle for 4 hours to prevent quota exhaustion.
        """
        throttle_until = datetime.utcnow() + timedelta(hours=4)
        
        self.db.table("subscriptions").update({
            "emergency_throttle_active": True,
            "emergency_throttle_reason": reason,
            "emergency_throttle_until": throttle_until.isoformat(),
            "settings_last_modified_by": "system_auto_throttle",
            "settings_last_modified_at": datetime.utcnow().isoformat(),
        }).eq("id", subscription_id).execute()
        
        print(f"🚨 Emergency throttle applied to {institution_id}")
        print(f"   Reason: {reason}")
        print(f"   Until: {throttle_until}")
        
        # TODO: Send urgent notification to platform admins
        await self.send_platform_admin_alert(
            institution_id,
            "Emergency Throttle Applied",
            f"Auto-throttle activated for institution {institution_id}. Reason: {reason}"
        )
    
    async def create_alert(
        self,
        institution_id: str,
        alert_type: str,
        severity: str,
        message: str,
        usage_percent: float,
        burn_rate: float,
        days_remaining: int
    ):
        """Create quota alert record"""
        self.db.table("institution_quota_alerts").insert({
            "institution_id": institution_id,
            "alert_type": alert_type,
            "severity": severity,
            "message": message,
            "current_usage_percent": usage_percent,
            "burn_rate_24h": burn_rate,
            "estimated_days_remaining": days_remaining,
            "action_taken": "email_sent",
        }).execute()
    
    def alert_exists_recently(
        self,
        institution_id: str,
        alert_type: str,
        hours: int = 24
    ) -> bool:
        """Check if alert was already sent recently"""
        since = datetime.utcnow() - timedelta(hours=hours)
        
        existing = self.db.table("institution_quota_alerts")\
            .select("id")\
            .eq("institution_id", institution_id)\
            .eq("alert_type", alert_type)\
            .gte("created_at", since.isoformat())\
            .execute()
        
        return bool(existing.data and len(existing.data) > 0)
    
    async def send_admin_email(self, subscription: Dict, subject: str, message: str):
        """Send email to institution admin (placeholder)"""
        # TODO: Implement actual email sending
        print(f"📧 Email to {subscription.get('institution_name')}:")
        print(f"   Subject: {subject}")
        print(f"   Message: {message}")
    
    async def send_platform_admin_alert(
        self,
        institution_id: str,
        subject: str,
        message: str
    ):
        """Send alert to platform administrators (placeholder)"""
        # TODO: Implement actual notification (email, Slack, etc.)
        print(f"🚨 Platform Admin Alert:")
        print(f"   Institution: {institution_id}")
        print(f"   Subject: {subject}")
        print(f"   Message: {message}")


# ═══════════════════════════════════════════════════════════════
# BACKGROUND JOB SCHEDULER
# ═══════════════════════════════════════════════════════════════

async def run_monitoring_forever(db):
    """
    Run monitoring in continuous loop (every hour).
    Deploy this as a background service or cron job.
    """
    monitor = InstitutionMonitor(db)
    
    while True:
        try:
            await monitor.run_monitoring_cycle()
        except Exception as e:
            print(f"Error in monitoring cycle: {e}")
        
        # Wait 1 hour before next cycle
        print("Waiting 1 hour until next monitoring cycle...")
        await asyncio.sleep(3600)  # 1 hour


# For FastAPI BackgroundTasks or separate service
async def monitoring_job():
    """Single monitoring cycle - can be called by scheduler"""
    from database.crud import get_db
    db = get_db()
    monitor = InstitutionMonitor(db)
    await monitor.run_monitoring_cycle()


# Add to main.py as startup event:
"""
from contextlib import asynccontextmanager
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from api.institution_monitoring import run_monitoring_forever
    from database.crud import get_db
    
    # Start monitoring in background
    monitoring_task = asyncio.create_task(run_monitoring_forever(get_db()))
    
    yield
    
    # Shutdown
    monitoring_task.cancel()

app = FastAPI(lifespan=lifespan)
"""
