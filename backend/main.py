from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import books, query, history, export, share, users, admin
from websocket_handler.websocket import router as ws_router
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Firstchapter.ai API",
    description="AI-powered book querying platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(books.router,   prefix="/api/books",   tags=["Books"])
app.include_router(query.router,   prefix="/api",         tags=["Query"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(export.router,  prefix="/api/export",  tags=["Export"])
app.include_router(share.router,   prefix="/api/share",   tags=["Share"])
app.include_router(users.router,   prefix="/api/users",   tags=["Users"])
app.include_router(admin.router,   prefix="/api/admin",   tags=["Admin"])
app.include_router(ws_router)

@app.get("/")
def root():
    return {"status": "Firstchapter.ai is running"}

@app.get("/health")
def health():
    return {"status": "healthy", "version": "1.0.0"}