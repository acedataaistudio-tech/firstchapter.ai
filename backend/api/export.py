from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from database.crud import get_session_history

router = APIRouter()

class ExportRequest(BaseModel):
    session_id: str
    title:      str = "Firstchapter Export"

@router.post("/doc")
def export_doc(request: ExportRequest, x_user_id: str = Header(default="anonymous")):
    from export.docx_export import generate_docx
    history = get_session_history(request.session_id)
    if not history:
        raise HTTPException(status_code=404, detail="Session not found")
    path = generate_docx(history, request.title)
    return FileResponse(path, filename=f"{request.title}.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")

@router.post("/ppt")
def export_ppt(request: ExportRequest, x_user_id: str = Header(default="anonymous")):
    from export.pptx_export import generate_pptx
    history = get_session_history(request.session_id)
    if not history:
        raise HTTPException(status_code=404, detail="Session not found")
    path = generate_pptx(history, request.title)
    return FileResponse(path, filename=f"{request.title}.pptx",
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation")
