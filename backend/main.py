"""
Firstchapter.ai Backend - Phase 3
Complete token-based revenue system with institution management
Institution Fair Usage Policy with monitoring
"""
"""
Firstchapter.ai Backend - Phase 3
Complete token-based revenue system with institution management
Institution Fair Usage Policy with monitoring
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging

# Phase 1-2 API imports
from api import books, query, history, export, share, users, admin, saved, usage
from api import subscriptions, mau_management, admin_cost_tracking, publisher_payout_management

# Phase 3 API imports
from api import colleges, packages, user_sync
from api.institution import onboarding
from api.admin import institutions as admin_institutions

from websocket_handler.websocket import router as ws_router

logging.basicConfig(level=logging.INFO)

# ... (keep the lifespan function as is)

# ... (keep the app creation as is)

# ══════════════════════════════════════════════════════════════════
# ROUTE REGISTRATIONS - NO DUPLICATES
# ══════════════════════════════════════════════════════════════════

# Phase 1-2 Routes
app.include_router(books.router, prefix="/api/books", tags=["Books"])
app.include_router(query.router, prefix="/api", tags=["Query"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(share.router, prefix="/api/share", tags=["Share"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(saved.router, prefix="/api/saved", tags=["Saved"])
app.include_router(usage.router, prefix="/api", tags=["Usage"])
app.include_router(subscriptions.router, prefix="/api", tags=["Subscriptions"])
app.include_router(mau_management.router, prefix="/api", tags=["MAU Management"])
app.include_router(admin_cost_tracking.router, prefix="/api", tags=["Admin Cost Tracking"])
app.include_router(publisher_payout_management.router, prefix="/api", tags=["Publisher Payout Management"])

# Phase 3 Routes - Institution Management
app.include_router(colleges.router, prefix="/api", tags=["Colleges"])
app.include_router(packages.router, prefix="/api", tags=["Packages"])
app.include_router(onboarding.router, prefix="/api", tags=["Institution Onboarding"])
app.include_router(user_sync.router, prefix="/api", tags=["User Sync"])
app.include_router(admin_institutions.router, prefix="/api/admin", tags=["Admin Institutions"])

# WebSocket
app.include_router(ws_router)
# ══════════════════════════════════════════════════════════════════
# ROOT ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@app.get("/")
def root():
    return {
        "status": "Firstchapter.ai is running",
        "version": "3.0.0",
        "features": [
            "Token-based revenue system",
            "OpenAI cost tracking",
            "Publisher payments (₹0.01/token)",
            "Royalty-free book support",
            "Institution subscriptions",
            "MAU tracking & management",
            "Self-service user purchases (Razorpay)",
            "Individual reader Fair Usage Policy",
            "Institution Fair Usage Policy",
            "Two-tier settings control",
            "Burn-rate monitoring",
            "Auto-throttle protection",
            "Admin cost analytics"
        ],
        "new_in_30": [
            "Institution token management",
            "Per-student caps (configurable 0.1-2%)",
            "Rate limiting (configurable 5-30 req/min)",
            "Concurrency prevention",
            "Graceful degradation (80/90/95/100%)",
            "Two-tier control (Platform + Institution admin)",
            "Burn-rate monitoring with alerts",
            "Emergency auto-throttle",
            "Complete audit trail"
        ]
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "version": "3.0.0",
        "features_enabled": {
            "token_tracking": True,
            "cost_tracking": True,
            "individual_fair_usage": True,
            "institution_fair_usage": True,
            "mau_management": True,
            "razorpay_integration": True,
            "institution_monitoring": True,
            "auto_throttle": True
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
        "institution_model": {
            "commission": "50%",
            "token_budget": "50% (34% input, 66% output)",
            "per_student_cap": "0.5% default (configurable 0.1-2%)",
            "rate_limit": "15 req/min default (configurable 5-30)",
            "concurrency": "disabled",
            "graceful_degradation": "80/90/95/100%"
        },
        "phase": "3.0 - Institution Management"
    }
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.firstchapter.ai",
        "https://firstchapter.ai",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)