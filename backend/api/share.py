from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from database.crud import create_share_link, get_shared_content

router = APIRouter()

class ShareRequest(BaseModel):
    query_id:   str
    session_id: str

@router.post("/")
def create_share(request: ShareRequest, x_user_id: str = Header(default="anonymous")):
    share_id = create_share_link(request.query_id, request.session_id, x_user_id)
    return {"share_id": share_id, "share_url": f"https://firstchapter.ai/shared/{share_id}"}

@router.get("/{share_id}")
def get_share(share_id: str):
    content = get_shared_content(share_id)
    if not content:
        raise HTTPException(status_code=404, detail="Share not found")
    return content
