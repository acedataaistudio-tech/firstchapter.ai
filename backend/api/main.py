"""
Firstchapter.ai Backend - Phase 2.5
Complete token-based revenue system with institution management
"""
from api.institution import onboarding, dashboard
from api.student import management
from api.notifications import notifications
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import books, query, history, export, share, users, admin_core, saved, usage
# NEW Phase 2.5 imports
from api import mau_management, admin_cost_tracking
from api import publisher_payout_management  # ← ADD THIS LINE
from websocket_handler.websocket import router as ws_router
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Firstchapter.ai API",
    description="AI-powered book platform with complete revenue tracking",
    version="2.5.0"  # Updated version
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ══════════════════════════════════════════════════════════════════
# Existing Routes
# ══════════════════════════════════════════════════════════════════
app.include_router(books.router,   prefix="/api/books",   tags=["Books"])
app.include_router(query.router,   prefix="/api",         tags=["Query"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(export.router,  prefix="/api/export",  tags=["Export"])
app.include_router(share.router,   prefix="/api/share",   tags=["Share"])
app.include_router(users.router,   prefix="/api/users",   tags=["Users"])
app.include_router(admin_core.router,   prefix="/api/admin",   tags=["Admin"])
app.include_router(saved.router,   prefix="/api/saved",   tags=["Saved"])
app.include_router(usage.router,   prefix="/api/usage",   tags=["Usage"])
app.include_router(onboarding.router, prefix="/api", tags=["Institution Onboarding"])
app.include_router(dashboard.router, prefix="/api", tags=["Institution Dashboard"])
app.include_router(management.router, prefix="/api", tags=["Student Management"])
app.include_router(notifications.router, prefix="/api", tags=["Notifications"])

# ══════════════════════════════════════════════════════════════════
# NEW: Phase 2.5 Routes
# ══════════════════════════════════════════════════════════════════
app.include_router(mau_management.router, prefix="/api", tags=["MAU Management"])
app.include_router(admin_cost_tracking.router, prefix="/api", tags=["Admin Cost Tracking"])
app.include_router(publisher_payout_management.router, prefix="/api", tags=["Publisher Payout Management"])  # ← ADD THIS LINE

# WebSocket
app.include_router(ws_router)

@app.get("/")
def root():
    return {
        "status": "Firstchapter.ai is running",
        "version": "2.5.0",
        "features": [
            "Token-based revenue system",
            "OpenAI cost tracking",
            "Publisher payments (₹0.01/token)",
            "Royalty-free book support",
            "Institution subscriptions",
            "MAU tracking & management",
            "Self-service user purchases (Razorpay)",
            "Fair usage enforcement",
            "Dynamic throttling",
            "Admin cost analytics"
        ],
        "new_in_25": [
            "OpenAI cost monitoring",
            "Royalty-free books",
            "Institution token budgets",
            "MAU purchase system",
            "Fair usage middleware",
            "Admin economics dashboard"
        ]
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "version": "2.5.0",
        "features_enabled": {
            "token_tracking": True,
            "cost_tracking": True,
            "fair_usage": True,
            "mau_management": True,
            "razorpay_integration": True
        }
    }

@app.get("/debug")
def debug():
    from config import settings
    import os
    
    return {
        "supabase_url": settings.supabase_url,
        "supabase_key_length": len(settings.supabase_key),
        "supabase_key_prefix": settings.supabase_key[:20] if settings.supabase_key else "EMPTY",
        "qdrant_url": settings.qdrant_url,
        "qdrant_key_length": len(settings.qdrant_api_key),
        "razorpay_configured": bool(os.getenv("RAZORPAY_KEY_ID")),
        "token_tracking": "enabled",
        "revenue_model": "₹0.01 per output token",
        "institution_model": "50% commission, 50% token budget (33% input, 67% output)",
        "phase": "2.5"
    }
