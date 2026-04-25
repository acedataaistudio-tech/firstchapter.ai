from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header
from database.crud import get_all_books, get_book, save_book_metadata
from ingestion.pipeline import ingest_book
import uuid, shutil, os

router = APIRouter()

@router.get("/")
def list_books():
    return {"books": get_all_books()}

@router.get("/{book_id}")
def get_single_book(book_id: str):
    book = get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@router.post("/upload")
async def upload_book(
    file:        UploadFile = File(...),
    title:       str = Form(""),
    author:      str = Form(""),
    publisher:   str = Form(""),
    category:    str = Form("General"),
    isbn:        str = Form(""),
    description: str = Form(""),
    x_user_id:   str = Header(default="anonymous"),
):
    if not file.filename.endswith((".pdf", ".epub")):
        raise HTTPException(status_code=400, detail="Only PDF or EPUB files accepted")

    book_id  = str(uuid.uuid4())
    tmp_path = f"/tmp/{book_id}.pdf"

    # Save uploaded file
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    book_metadata = {
        "id":          book_id,
        "title":       title or file.filename.replace(".pdf", "").replace(".epub", ""),
        "author":      author,
        "publisher":   publisher,
        "category":    category,
        "isbn":        isbn,
        "description": description,
        "cover_url":   "",
        "uploaded_by": x_user_id,
    }

    # Run ingestion with moderation
    result = ingest_book(tmp_path, book_metadata)

    # Clean up temp file
    if os.path.exists(tmp_path):
        os.remove(tmp_path)

    if result["status"] == "rejected":
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Book rejected — content moderation failed",
                "reason":  result.get("reason", "Content policy violation"),
                "book_id": book_id,
            }
        )

    # Save to database only if approved
    book_metadata["status"] = "active"
    save_book_metadata(book_metadata)

    return {
        "book_id":  book_id,
        "title":    book_metadata["title"],
        "status":   "active",
        "chunks":   result["chunks"],
        "pages":    result["pages"],
        "message":  "Book successfully ingested and available for querying",
    }