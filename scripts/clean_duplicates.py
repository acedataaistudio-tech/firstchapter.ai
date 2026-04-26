import sys, os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))

from ingestion.pipeline import get_qdrant_client
from config import settings
from collections import defaultdict
from qdrant_client.models import Filter, FieldCondition, MatchValue

client = get_qdrant_client()

print("Scanning all chunks...")
all_data = []
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
        all_data.append({
            "id":       r.id,
            "title":    metadata.get("book_title", "unknown"),
            "book_id":  metadata.get("book_id", "unknown"),
        })
    if next_offset is None:
        break
    offset = next_offset

print(f"Total chunks scanned: {len(all_data)}")

# Group book_ids by title
title_to_ids = defaultdict(set)
for d in all_data:
    title_to_ids[d["title"]].add(d["book_id"])

# Find duplicates
duplicates = {title: ids for title, ids in title_to_ids.items() if len(ids) > 1}

if not duplicates:
    print("No duplicates found!")
    exit()

print(f"\nFound {len(duplicates)} books with duplicates:")

for title, ids in duplicates.items():
    ids_list = sorted(list(ids))
    keep_id = ids_list[0]  # Keep first ID
    remove_ids = ids_list[1:]  # Remove the rest

    print(f"\n  {title}")
    print(f"  Keeping:  {keep_id}")
    print(f"  Removing: {remove_ids}")

    for remove_id in remove_ids:
        # Count chunks to be removed
        chunks_to_remove = [d["id"] for d in all_data if d["book_id"] == remove_id]
        print(f"  Deleting {len(chunks_to_remove)} chunks for ID {remove_id}...")

        # Delete in batches
        batch_size = 100
        for i in range(0, len(chunks_to_remove), batch_size):
            batch = chunks_to_remove[i:i+batch_size]
            client.delete(
                collection_name=settings.collection_name,
                points_selector=batch,
            )
        print(f"  ✅ Deleted {len(chunks_to_remove)} chunks")

print("\nVerifying cleanup...")
info = client.get_collection(settings.collection_name)
print(f"Total vectors remaining: {info.points_count}")
print("\nCleanup complete!")