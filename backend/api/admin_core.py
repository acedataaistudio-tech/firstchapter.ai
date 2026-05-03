from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from database.crud import get_db, get_all_books, delete_book_by_id
from config import settings
import httpx

router = APIRouter()

ADMIN_SECRET = "firstchapter@admin2026"

def verify_admin(x_admin_secret: str = Header(...)):
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

# ── Books ──────────────────────────────────────────────────────────────────────

@router.get("/books")
def admin_list_books(x_admin_secret: str = Header(...)):
    verify_admin(x_admin_secret)
    try:
        books = get_all_books()
        return {"books": books, "total": len(books)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/books/{book_id}")
def admin_delete_book(book_id: str, x_admin_secret: str = Header(...)):
    verify_admin(x_admin_secret)
    try:
        # Delete from Supabase
        db = get_db()
        db.table("books").delete().eq("id", book_id).execute()

        # Delete from Qdrant
        try:
            from ingestion.pipeline import get_qdrant_client
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            client = get_qdrant_client()
            client.delete(
                collection_name=settings.collection_name,
                points_selector=Filter(
                    must=[FieldCondition(key="metadata.book_id", match=MatchValue(value=book_id))]
                )
            )
        except Exception as qe:
            print(f"Qdrant delete failed (non-critical): {qe}")

        return {"success": True, "book_id": book_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class IngestBookRequest(BaseModel):
    title: str
    author: str
    category: str
    url: str
    publisher: str = "Admin"

@router.post("/books/ingest")
def admin_ingest_book(req: IngestBookRequest, x_admin_secret: str = Header(...)):
    verify_admin(x_admin_secret)
    try:
        import uuid, httpx as hx
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        from langchain_core.documents import Document
        from langchain_qdrant import QdrantVectorStore
        from ingestion.pipeline import setup_collection, get_qdrant_client, get_embeddings

        # Download
        response = hx.get(req.url, follow_redirects=True, timeout=60)
        response.raise_for_status()
        text = response.text

        # Strip Gutenberg header/footer
        for marker in ["*** START OF", "***START OF"]:
            idx = text.find(marker)
            if idx != -1:
                text = text[text.find("\n", idx) + 1:]
                break
        for marker in ["*** END OF", "***END OF"]:
            idx = text.find(marker)
            if idx != -1:
                text = text[:idx]
                break

        if len(text) < 1000:
            raise HTTPException(status_code=400, detail="Book content too short")

        book_id = str(uuid.uuid4())

        # Save to Supabase
        db = get_db()
        db.table("books").insert({
            "id": book_id,
            "title": req.title,
            "author": req.author,
            "category": req.category,
            "publisher": req.publisher,
            "url": req.url,
            "status": "active",
            "license_type": "open",
            "cover_url": "",
            "description": "",
            "isbn": "",
            "uploaded_by": "admin",
        }).execute()

        # Chunk and ingest to Qdrant
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=75)
        chunks = splitter.split_text(text)

        documents = []
        for i, chunk in enumerate(chunks):
            chunk = chunk.strip()
            if len(chunk) < 50:
                continue
            documents.append(Document(
                page_content=chunk,
                metadata={
                    "book_id": book_id,
                    "book_title": req.title,
                    "author": req.author,
                    "publisher": req.publisher,
                    "category": req.category,
                    "cover_url": "",
                    "chunk_index": i,
                    "chunk_id": f"{book_id}_chunk_{i}",
                    "chapter": "Main",
                    "chapter_number": 1,
                    "page_number": i + 1,
                }
            ))

        setup_collection()
        client = get_qdrant_client()
        embeddings = get_embeddings()

        for i in range(0, len(documents), 50):
            batch = documents[i:i+50]
            vectorstore = QdrantVectorStore(
                client=client,
                collection_name=settings.collection_name,
                embedding=embeddings,
            )
            vectorstore.add_documents(batch)

        return {"success": True, "book_id": book_id, "chunks": len(documents)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Users (via Clerk API) ──────────────────────────────────────────────────────

@router.get("/users")
def admin_list_users(x_admin_secret: str = Header(...)):
    verify_admin(x_admin_secret)
    try:
        response = httpx.get(
            "https://api.clerk.com/v1/users?limit=100",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
        )
        response.raise_for_status()
        users = response.json()
        formatted = []
        for u in users:
            # Check both 'role' and 'userType' in metadata (institutions use userType)
            unsafe_meta = u.get("unsafe_metadata", {})
            public_meta = u.get("public_metadata", {})
            role = (unsafe_meta.get("role") or unsafe_meta.get("userType") or 
                   public_meta.get("role") or public_meta.get("userType") or "reader")
            
            formatted.append({
                "id": u.get("id"),
                "name": f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() or "Unknown",
                "email": u.get("email_addresses", [{}])[0].get("email_address", ""),
                "role": role,
                "joined": u.get("created_at", ""),
                "status": "active" if not u.get("banned") else "suspended",
            })
        return {"users": formatted, "total": len(formatted)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/users/{user_id}")
def admin_delete_user(user_id: str, x_admin_secret: str = Header(...)):
    verify_admin(x_admin_secret)
    try:
        response = httpx.delete(
            f"https://api.clerk.com/v1/users/{user_id}",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
        )
        response.raise_for_status()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users/{user_id}/suspend")
def admin_suspend_user(user_id: str, x_admin_secret: str = Header(...)):
    verify_admin(x_admin_secret)
    try:
        response = httpx.post(
            f"https://api.clerk.com/v1/users/{user_id}/ban",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
        )
        response.raise_for_status()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/users/{user_id}/unsuspend")
def admin_unsuspend_user(user_id: str, x_admin_secret: str = Header(...)):
    verify_admin(x_admin_secret)
    try:
        response = httpx.post(
            f"https://api.clerk.com/v1/users/{user_id}/unban",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
        )
        response.raise_for_status()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))