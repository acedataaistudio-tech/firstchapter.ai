from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from ingestion.loader import load_pdf_book
from ingestion.chunker import chunk_documents
from config import settings
import httpx
import json

def get_qdrant_client() -> QdrantClient:
    if settings.qdrant_api_key:
        return QdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
        )
    import os
    os.makedirs("../qdrant_storage", exist_ok=True)
    return QdrantClient(path=os.path.abspath("../qdrant_storage"))

def get_embeddings():
    return OpenAIEmbeddings(
        model=settings.embedding_model,
        openai_api_key=settings.openai_api_key,
    )

def setup_collection():
    client = get_qdrant_client()
    existing = [c.name for c in client.get_collections().collections]
    if settings.collection_name not in existing:
        client.create_collection(
            collection_name=settings.collection_name,
            vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
        )
        print(f"Collection '{settings.collection_name}' created")

def moderate_content(text_sample: str) -> dict:
    """
    Check content against OpenAI moderation API.
    Returns dict with is_safe and any flagged categories.
    Free to use — no additional cost.
    """
    try:
        response = httpx.post(
            "https://api.openai.com/v1/moderations",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={"input": text_sample[:4000]},  # Sample first 4000 chars
            timeout=30,
        )
        result = response.json()
        results = result.get("results", [{}])[0]
        flagged = results.get("flagged", False)
        categories = results.get("categories", {})
        scores = results.get("category_scores", {})

        # Find which categories are flagged
        flagged_categories = [
            cat for cat, is_flagged in categories.items() if is_flagged
        ]

        return {
            "is_safe":            not flagged,
            "flagged":            flagged,
            "flagged_categories": flagged_categories,
            "scores":             scores,
        }
    except Exception as e:
        print(f"Moderation check failed: {e}")
        # If moderation fails — allow through but log
        return {"is_safe": True, "flagged": False, "flagged_categories": [], "scores": {}}

def check_book_content(pdf_path: str) -> dict:
    """
    Run content moderation on a book before ingestion.
    Samples multiple sections of the book for thorough checking.
    """
    import fitz
    doc = fitz.open(pdf_path)
    total_pages = len(doc)

    # Sample pages from beginning, middle and end
    sample_pages = []
    if total_pages > 0:
        sample_pages.append(0)
    if total_pages > 10:
        sample_pages.append(total_pages // 2)
    if total_pages > 20:
        sample_pages.append(total_pages - 1)

    combined_text = ""
    for page_num in sample_pages:
        page = doc[page_num]
        combined_text += page.get_text() + "\n"

    doc.close()

    print(f"Running content moderation on {len(sample_pages)} sample pages...")
    result = moderate_content(combined_text)

    if result["flagged"]:
        print(f"Content flagged: {result['flagged_categories']}")
    else:
        print("Content moderation passed ✓")

    return result

def ingest_book(pdf_path: str, book_metadata: dict) -> dict:
    print(f"\nIngesting: {book_metadata['title']}")

    # Step 1 — Content moderation check
    print("Checking content quality...")
    moderation = check_book_content(pdf_path)

    if not moderation["is_safe"]:
        flagged = ", ".join(moderation["flagged_categories"])
        return {
            "book_id":  book_metadata["id"],
            "title":    book_metadata["title"],
            "status":   "rejected",
            "reason":   f"Content flagged for: {flagged}",
            "chunks":   0,
        }

    # Step 2 — Load and chunk
    documents = load_pdf_book(pdf_path, book_metadata)
    chunks    = chunk_documents(documents)
    print(f"Chunks created: {len(chunks)}")


    # Step 3 — Store in Qdrant with batching
    setup_collection()
    client     = get_qdrant_client()
    embeddings = get_embeddings()

    batch_size   = 50
    total_stored = 0

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        try:
            vectorstore = QdrantVectorStore(
                client=client,
                collection_name=settings.collection_name,
                embedding=embeddings,
            )
            vectorstore.add_documents(batch)
            total_stored += len(batch)
            print(f"  Batch {i // batch_size + 1}: stored {len(batch)} chunks ({total_stored}/{len(chunks)})")
        except Exception as e:
            print(f"  Batch {i // batch_size + 1} failed: {e} — retrying...")
            import time
            time.sleep(3)
            try:
                vectorstore.add_documents(batch)
                total_stored += len(batch)
                print(f"  Retry succeeded")
            except Exception as e2:
                print(f"  Retry failed: {e2} — skipping batch")

    print(f"Stored {total_stored} chunks in Qdrant")

    return {
        "book_id": book_metadata["id"],
        "title":   book_metadata["title"],
        "chunks":  total_stored,
        "pages":   len(documents),
        "status":  "active",
    }