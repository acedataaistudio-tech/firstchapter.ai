import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

import httpx, uuid
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


BOOKS = [
    {
        "id":       str(uuid.uuid4()),
        "title":    "Think and Grow Rich",
        "author":   "Napoleon Hill",
        "category": "Business",
        "url":      "https://www.gutenberg.org/cache/epub/1232/pg1232.txt",
    },
    {
        "id":       str(uuid.uuid4()),
        "title":    "The Art of War",
        "author":   "Sun Tzu",
        "category": "Strategy",
        "url":      "https://www.gutenberg.org/cache/epub/132/pg132.txt",
    },
    {
        "id":       str(uuid.uuid4()),
        "title":    "Meditations",
        "author":   "Marcus Aurelius",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/2680/pg2680.txt",
    },
    {
        "id":       str(uuid.uuid4()),
        "title":    "Wealth of Nations",
        "author":   "Adam Smith",
        "category": "Economics",
        "url":      "https://www.gutenberg.org/cache/epub/3300/pg3300.txt",
    },
    {
        "id":       str(uuid.uuid4()),
        "title":    "The Prince",
        "author":   "Niccolo Machiavelli",
        "category": "Politics",
        "url":      "https://www.gutenberg.org/cache/epub/1232/pg1232.txt",
    },
]

def download_text(url: str) -> str:
    print(f"Downloading {url}...")
    response = httpx.get(url, follow_redirects=True, timeout=30)
    response.raise_for_status()
    text = response.text

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

    return text

def build_documents(text: str, book_metadata: dict):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=75,
        separators=["\n\n", "\n", ". ", " "],
    )
    raw_chunks = splitter.split_text(text)
    print(f"Raw chunks created: {len(raw_chunks)}")

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

def ingest_book(book_metadata: dict, text: str):
    from ingestion.pipeline import setup_collection, get_qdrant_client, get_embeddings
    from langchain_qdrant import Qdrant
    from config import settings

    documents = build_documents(text, book_metadata)
    print(f"Valid documents: {len(documents)}")

    if not documents:
        print("No valid chunks — skipping")
        return 0

    setup_collection()

    client     = get_qdrant_client()
    embeddings = get_embeddings()

    # Batch into groups of 50 to avoid timeout
    batch_size  = 50
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
            print(f"  Batch {i // batch_size + 1}: stored {len(batch)} chunks ({total_stored}/{len(documents)})")
        except Exception as e:
            print(f"  Batch {i // batch_size + 1} failed: {e} — retrying...")
            import time
            time.sleep(3)
            try:
                vectorstore.add_documents(batch)
                total_stored += len(batch)
                print(f"  Retry succeeded")
            except Exception as e2:
                print(f"  Retry also failed: {e2} — skipping batch")

    print(f"Stored {total_stored} chunks in Qdrant")
    return total_stored

if __name__ == "__main__":
    total = 0
    for book in BOOKS:
        print(f"\n── {book['title']} ──────────────────────")
        try:
            text   = download_text(book["url"])
            chunks = ingest_book(book, text)
            total += chunks
            print(f"Done: {chunks} chunks stored")
        except Exception as e:
            print(f"Failed: {e}")

    print(f"\nTotal chunks ingested: {total}")
    if total > 0:
        print("Success — ready to query!")
    else:
        print("Something went wrong — check errors above")