import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

import httpx, uuid, time, json
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_qdrant import QdrantVectorStore

# ── Book List ─────────────────────────────────────────────────────────────────
# All books from Project Gutenberg — free, public domain, no copyright issues
# Format: title, author, category, gutenberg_id (used to build URL)

BOOKS = [
    {
        "title":    "Relativity The Special and General Theory",
        "author":   "Albert Einstein",
        "category": "Science",
        "url":      "https://www.gutenberg.org/files/5001/5001-h/5001-h.htm",
    },
    {
        "title":    "Raja Yoga",
        "author":   "Swami Vivekananda",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/2204/pg2204.txt",
    },
    {
        "title":    "Karma Yoga",
        "author":   "Swami Vivekananda",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/2803/pg2803.txt",
    },
    {
        "title":    "Jnana Yoga",
        "author":   "Swami Vivekananda",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/72368/pg72368.txt",
    },
    {
        "title":    "Introduction to Mathematical Philosophy",
        "author":   "Bertrand Russell",
        "category": "Mathematics",
        "url":      "https://www.gutenberg.org/cache/epub/41654/pg41654.txt",
    },
]
# ── Core Functions ────────────────────────────────────────────────────────────

def download_text(url: str) -> str:
    print(f"  Downloading from Gutenberg...")
    response = httpx.get(url, follow_redirects=True, timeout=60)
    response.raise_for_status()
    text = response.text

    # Strip HTML tags if HTML file
    if url.endswith(".htm") or url.endswith(".html") or "<html" in text[:500].lower():
        import re
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text)

    # Strip Gutenberg header
    for marker in ["*** START OF", "***START OF"]:
        idx = text.find(marker)
        if idx != -1:
            newline = text.find("\n", idx)
            text = text[newline + 1:]
            break

    # Strip Gutenberg footer
    for marker in ["*** END OF", "***END OF"]:
        idx = text.find(marker)
        if idx != -1:
            text = text[:idx]
            break

    print(f"  Downloaded {len(text):,} characters")
    return text

def build_documents(text: str, book_metadata: dict):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=75,
        separators=["\n\n", "\n", ". ", " "],
    )
    raw_chunks = splitter.split_text(text)

    chapter     = "Introduction"
    chapter_num = 0
    documents   = []

    for i, chunk_text in enumerate(raw_chunks):
        chunk_text = chunk_text.strip()
        if not chunk_text or len(chunk_text) < 50:
            continue

        first_line = chunk_text.split("\n")[0].strip()
        if first_line.isupper() and 5 < len(first_line) < 80:
            chapter_num += 1
            chapter = first_line

        documents.append(Document(
            page_content=chunk_text,
            metadata={
                "book_id":        book_metadata["id"],
                "book_title":     book_metadata["title"],
                "author":         book_metadata["author"],
                "publisher":      "Public Domain",
                "category":       book_metadata.get("category", "General"),
                "cover_url":      "",
                "page_number":    i + 1,
                "chapter":        chapter,
                "chapter_number": chapter_num,
                "chunk_index":    i,
                "chunk_id":       f"{book_metadata['id']}_chunk_{i}",
            }
        ))

    return documents

def save_to_supabase(book_metadata: dict, chunk_count: int):
    """Save book metadata to Supabase"""
    try:
        from database.crud import save_book_metadata
        book_metadata["status"] = "active"
        save_book_metadata(book_metadata)
        print(f"  Saved to Supabase ✓")
    except Exception as e:
        print(f"  Supabase save failed (non-critical): {e}")

def ingest_book(book_metadata: dict, text: str):
    from ingestion.pipeline import setup_collection, get_qdrant_client, get_embeddings
    from config import settings

    documents = build_documents(text, book_metadata)
    print(f"  Chunks created: {len(documents)}")

    if not documents:
        print("  No valid chunks — skipping")
        return 0

    setup_collection()
    client     = get_qdrant_client()
    embeddings = get_embeddings()

    batch_size   = 50
    total_stored = 0

    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        try:
            vectorstore = QdrantVectorStore(
                client=client,
                collection_name=settings.collection_name,
                embedding=embeddings,
            )
            vectorstore.add_documents(batch)
            total_stored += len(batch)
            print(f"  Batch {i // batch_size + 1}: {total_stored}/{len(documents)} chunks stored")
        except Exception as e:
            print(f"  Batch {i // batch_size + 1} failed: {e} — retrying in 5s...")
            time.sleep(5)
            try:
                vectorstore.add_documents(batch)
                total_stored += len(batch)
                print(f"  Retry succeeded ✓")
            except Exception as e2:
                print(f"  Retry failed: {e2} — skipping batch")

    return total_stored

def load_progress(log_file: str) -> set:
    """Load list of already ingested books to allow resume"""
    if not os.path.exists(log_file):
        return set()
    with open(log_file, "r") as f:
        return set(line.strip() for line in f.readlines())

def save_progress(log_file: str, title: str):
    """Mark a book as completed"""
    with open(log_file, "a") as f:
        f.write(title + "\n")

# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    LOG_FILE = "ingestion_progress.log"
    completed = load_progress(LOG_FILE)

    print(f"\n{'='*60}")
    print(f"Firstchapter.ai — Bulk Book Ingestion")
    print(f"Total books in list: {len(BOOKS)}")
    print(f"Already completed:   {len(completed)}")
    print(f"Remaining:           {len(BOOKS) - len(completed)}")
    print(f"{'='*60}\n")

    total_chunks = 0
    success_count = 0
    fail_count = 0
    failed_books = []

    for idx, book in enumerate(BOOKS, 1):
        # Skip already completed books
        if book["title"] in completed:
            print(f"[{idx}/{len(BOOKS)}] Skipping (already done): {book['title']}")
            continue

        print(f"\n[{idx}/{len(BOOKS)}] ── {book['title']} ──")
        print(f"  Author:   {book['author']}")
        print(f"  Category: {book['category']}")

        # Add unique ID
        book["id"] = str(uuid.uuid4())
        book["isbn"] = ""
        book["description"] = ""
        book["uploaded_by"] = "system"

        try:
            # Download
            text = download_text(book["url"])

            if len(text) < 1000:
                print(f"  Too short ({len(text)} chars) — skipping")
                fail_count += 1
                failed_books.append(book["title"])
                continue

            # Ingest
            chunks = ingest_book(book, text)

            if chunks > 0:
                # Save to Supabase
                save_to_supabase(book, chunks)
                save_progress(LOG_FILE, book["title"])
                total_chunks += chunks
                success_count += 1
                print(f"  ✅ Done — {chunks} chunks stored")
            else:
                fail_count += 1
                failed_books.append(book["title"])
                print(f"  ❌ Failed — 0 chunks stored")

        except Exception as e:
            print(f"  ❌ Error: {e}")
            fail_count += 1
            failed_books.append(book["title"])

        # Small delay between books to be kind to APIs
        time.sleep(2)

    # Final summary
    print(f"\n{'='*60}")
    print(f"INGESTION COMPLETE")
    print(f"{'='*60}")
    print(f"✅ Successfully ingested: {success_count} books")
    print(f"❌ Failed:               {fail_count} books")
    print(f"📦 Total chunks stored:  {total_chunks:,}")
    if failed_books:
        print(f"\nFailed books:")
        for b in failed_books:
            print(f"  - {b}")
    print(f"\nAll books are now live and queryable on Firstchapter.ai!")
