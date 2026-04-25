from fastapi import APIRouter
from database.crud import get_institution_stats, get_all_books

router = APIRouter()

@router.get("/institution/{institution_id}/stats")
def institution_stats(institution_id: str):
    return get_institution_stats(institution_id)

@router.get("/books/stats")
def book_stats():
    books = get_all_books()
    return {"total_books": len(books), "books": books}
