from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from database.crud import (
    get_user_history, save_answer, get_saved_answers,
    create_share_link, get_shared_content,
    create_user, get_user, get_institution_stats,
)
from typing import Optional
import uuid

# ── HISTORY ──────────────────────────────────────────────────────────────────

history_router = APIRouter()

@history_router.get("/")
def get_history(x_user_id: str = Header(default="anonymous")):
    history = get_user_history(x_user_id)
    return {"history": history}

@history_router.post("/save")
def save_to_library(
    query_id: str,
    title:    str,
    x_user_id: str = Header(default="anonymous"),
):
    saved = save_answer(x_user_id, query_id, title)
    return {"saved": saved}

@history_router.get("/saved")
def get_saved(x_user_id: str = Header(default="anonymous")):
    saved = get_saved_answers(x_user_id)
    return {"saved": saved}

# ── EXPORT ───────────────────────────────────────────────────────────────────

export_router = APIRouter()

class ExportRequest(BaseModel):
    session_id: str
    title:      str = "Firstchapter Export"
    format:     str = "doc"

@export_router.post("/doc")
def export_to_doc(request: ExportRequest, x_user_id: str = Header(default="anonymous")):
    from export.docx_export import generate_docx
    from database.crud import get_session_history
    history = get_session_history(request.session_id)
    if not history:
        raise HTTPException(status_code=404, detail="Session not found")
    file_path = generate_docx(history, request.title)
    return FileResponse(file_path, filename=f"{request.title}.docx",
                        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")

@export_router.post("/ppt")
def export_to_ppt(request: ExportRequest, x_user_id: str = Header(default="anonymous")):
    from export.pptx_export import generate_pptx
    from database.crud import get_session_history
    history = get_session_history(request.session_id)
    if not history:
        raise HTTPException(status_code=404, detail="Session not found")
    file_path = generate_pptx(history, request.title)
    return FileResponse(file_path, filename=f"{request.title}.pptx",
                        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation")

# ── SHARE ────────────────────────────────────────────────────────────────────

share_router = APIRouter()

class ShareRequest(BaseModel):
    query_id:   str
    session_id: str

@share_router.post("/")
def create_share(request: ShareRequest, x_user_id: str = Header(default="anonymous")):
    share_id = create_share_link(request.query_id, request.session_id, x_user_id)
    return {"share_id": share_id, "share_url": f"https://firstchapter.ai/shared/{share_id}"}

@share_router.get("/{share_id}")
def get_share(share_id: str):
    content = get_shared_content(share_id)
    if not content:
        raise HTTPException(status_code=404, detail="Share link not found or expired")
    return content

# ── USERS ────────────────────────────────────────────────────────────────────

users_router = APIRouter()

class CreateUserRequest(BaseModel):
    email:          str
    institution_id: Optional[str] = None

@users_router.post("/")
def create(request: CreateUserRequest, x_user_id: str = Header(...)):
    user = create_user(x_user_id, request.email, request.institution_id)
    return user

@users_router.get("/me")
def get_me(x_user_id: str = Header(default="anonymous")):
    user = get_user(x_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ── ADMIN ────────────────────────────────────────────────────────────────────

admin_router = APIRouter()

@admin_router.get("/institution/{institution_id}/stats")
def institution_stats(institution_id: str):
    stats = get_institution_stats(institution_id)
    return stats
