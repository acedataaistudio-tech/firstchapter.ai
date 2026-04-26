from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from database.crud import get_db
import uuid

router = APIRouter()

class SaveRequest(BaseModel):
    query_id:  str
    title:     str
    question:  str
    answer:    str
    book:      str
    chapter:   str

# ── Saved Answers ─────────────────────────────────────────────────────────────

@router.get("/")
def get_saved(x_user_id: str = Header(default="anonymous")):
    try:
        db = get_db()
        res = db.table("saved_answers")\
            .select("id, title, question, answer, book, chapter, created_at")\
            .eq("user_id", x_user_id)\
            .order("created_at", desc=True)\
            .execute()
        return {"saved": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
def save_answer(req: SaveRequest, x_user_id: str = Header(default="anonymous")):
    try:
        db = get_db()
        db.table("saved_answers").insert({
            "id":       str(uuid.uuid4()),
            "user_id":  x_user_id,
            "query_id": req.query_id,
            "title":    req.title,
            "question": req.question,
            "answer":   req.answer,
            "book":     req.book,
            "chapter":  req.chapter,
        }).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{saved_id}")
def delete_saved(saved_id: str, x_user_id: str = Header(default="anonymous")):
    try:
        db = get_db()
        db.table("saved_answers")\
            .delete()\
            .eq("id", saved_id)\
            .eq("user_id", x_user_id)\
            .execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))