from fastapi import APIRouter, Header
from database.crud import get_user_history, save_answer, get_saved_answers

router = APIRouter()

@router.get("/")
def get_history(x_user_id: str = Header(default="anonymous")):
    return {"history": get_user_history(x_user_id)}

@router.post("/save")
def save_to_library(query_id: str, title: str, x_user_id: str = Header(default="anonymous")):
    return {"saved": save_answer(x_user_id, query_id, title)}

@router.get("/saved")
def get_saved(x_user_id: str = Header(default="anonymous")):
    return {"saved": get_saved_answers(x_user_id)}
