import sys, os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))

from ingestion.pipeline import get_qdrant_client
from config import settings
from database.crud import get_db
from collections import defaultdict

client = get_qdrant_client()
db = get_db()

# Get all books from Supabase
supabase_books = db.table("books").select("id, title").execute()
supabase_ids = {b["id"] for b in supabase_books.data}
supabase_titles = {b["title"] for b in supabase_books.data}
print(f"Supabase books: {len(supabase_ids)}")

# Get all unique book_ids from Qdrant
print("Scanning Qdrant...")
qdrant_books = defaultdict(str)
offset = None

while True:
    results, next_offset = client.scroll(
        collection_name=settings.collection_name,
        limit=1000,
        offset=offset,
        with_payload=True,
        with_vectors=False,
    )
    if not results:
        break
    for r in results:
        payload = r.payload or {}
        metadata = payload.get("metadata", payload)
        book_id = metadata.get("book_id", "unknown")
        title = metadata.get("book_title", "unknown")
        qdrant_books[book_id] = title
    if next_offset is None:
        break
    offset = next_offset

print(f"Qdrant unique books: {len(qdrant_books)}")

# Find orphans
print(f"\nBooks in Qdrant but NOT in Supabase:")
orphan_ids = []
for book_id, title in sorted(qdrant_books.items(), key=lambda x: x[1]):
    if book_id not in supabase_ids:
        print(f"  {title} ({book_id})")
        orphan_ids.append(book_id)

print(f"\nTotal orphans: {len(orphan_ids)}")