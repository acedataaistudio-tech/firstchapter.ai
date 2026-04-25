from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
from database.crud import create_user, get_user

router = APIRouter()

class CreateUserRequest(BaseModel):
    email:          str
    institution_id: Optional[str] = None

@router.post("/")
def create(request: CreateUserRequest, x_user_id: str = Header(...)):
    return create_user(x_user_id, request.email, request.institution_id)

@router.get("/me")
def get_me(x_user_id: str = Header(default="anonymous")):
    user = get_user(x_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
