import sys, os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))

from ingestion.pipeline import get_qdrant_client
from config import settings
from collections import Counter

client = get_qdrant_client()

print("Scanning all chunks...")
all_titles = []
all_book_ids = []
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
        title = metadata.get("book_title", "unknown")
        book_id = metadata.get("book_id", "unknown")
        all_titles.append(title)
        all_book_ids.append(book_id)

    if next_offset is None:
        break
    offset = next_offset

print(f"Total chunks: {len(all_titles)}")

# Check unique book_ids per title
from collections import defaultdict
title_to_ids = defaultdict(set)
for title, book_id in zip(all_titles, all_book_ids):
    title_to_ids[title].add(book_id)

print(f"\nBooks with MULTIPLE book_ids (duplicates):")
duplicates_found = False
for title, ids in sorted(title_to_ids.items()):
    if len(ids) > 1:
        print(f"  ⚠️  {title} — {len(ids)} different IDs")
        duplicates_found = True

if not duplicates_found:
    print("  No duplicates found! All books have unique IDs.")

print(f"\nTotal unique books in Qdrant: {len(title_to_ids)}")