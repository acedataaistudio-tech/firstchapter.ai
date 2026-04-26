import sys, os
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))

from ingestion.pipeline import get_qdrant_client
from config import settings
from database.crud import get_db
from collections import defaultdict
import uuid

client = get_qdrant_client()
db = get_db()

# Books to sync with their correct metadata
ORPHAN_BOOKS = [
    { "title": "Meditations",                               "author": "Marcus Aurelius",          "category": "Philosophy"      },
    { "title": "The Art of War",                            "author": "Sun Tzu",                  "category": "Strategy"        },
    { "title": "Think and Grow Rich",                       "author": "Napoleon Hill",             "category": "Business"        },
    { "title": "The Prince",                                "author": "Niccolo Machiavelli",       "category": "Politics"        },
    { "title": "The Republic",                              "author": "Plato",                    "category": "Philosophy"      },
    { "title": "Wealth of Nations",                         "author": "Adam Smith",               "category": "Economics"       },
    { "title": "Nicomachean Ethics",                        "author": "Aristotle",                "category": "Philosophy"      },
    { "title": "Beyond Good and Evil",                      "author": "Friedrich Nietzsche",      "category": "Philosophy"      },
    { "title": "Thus Spoke Zarathustra",                    "author": "Friedrich Nietzsche",      "category": "Philosophy"      },
    { "title": "The Birth of Tragedy",                      "author": "Friedrich Nietzsche",      "category": "Philosophy"      },
    { "title": "Capital Volume I",                          "author": "Karl Marx",                "category": "Economics"       },
    { "title": "The General Theory of Employment Interest and Money", "author": "John Maynard Keynes", "category": "Economics"  },
    { "title": "The Economic Consequences of the Peace",    "author": "John Maynard Keynes",      "category": "Economics"       },
    { "title": "Principles of Economics",                   "author": "Alfred Marshall",          "category": "Economics"       },
    { "title": "Political Economy for Beginners",           "author": "Millicent Garrett Fawcett","category": "Economics"       },
    { "title": "An Inquiry into the Nature of Peace",       "author": "Thorstein Veblen",         "category": "Economics"       },
    { "title": "The Theory of Business Enterprise",         "author": "Thorstein Veblen",         "category": "Business"        },
    { "title": "The Theory of the Leisure Class",           "author": "Thorstein Veblen",         "category": "Economics"       },
    { "title": "The Principles of Scientific Management",   "author": "Frederick Winslow Taylor", "category": "Management"      },
    { "title": "The Art of Getting Rich",                   "author": "Wallace D. Wattles",       "category": "Business"        },
    { "title": "The Science of Getting Rich",               "author": "Wallace D. Wattles",       "category": "Business"        },
    { "title": "How to Win Friends",                        "author": "Public Domain",            "category": "Business"        },
    { "title": "Business Adventures",                       "author": "Public Domain",            "category": "Business"        },
    { "title": "Principles Of Political Economy",           "author": "William Roscher",          "category": "Economics"       },
]

# Get Qdrant book_ids for these titles
print("Scanning Qdrant for book IDs...")
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
        if book_id not in qdrant_books:
            qdrant_books[title] = book_id
    if next_offset is None:
        break
    offset = next_offset

# Get existing Supabase titles
supabase_books = db.table("books").select("title").execute()
existing_titles = {b["title"] for b in supabase_books.data}

print(f"\nSyncing orphan books to Supabase...")
synced = 0
skipped = 0

for book in ORPHAN_BOOKS:
    title = book["title"]

    if title in existing_titles:
        print(f"  ⏭️  Already exists: {title}")
        skipped += 1
        continue

    # Get the Qdrant book_id for this title
    qdrant_id = qdrant_books.get(title)
    if not qdrant_id:
        print(f"  ❌ Not found in Qdrant: {title}")
        continue

    # Insert into Supabase
    try:
        db.table("books").insert({
            "id":           qdrant_id,
            "title":        title,
            "author":       book["author"],
            "category":     book["category"],
            "publisher":    "Public Domain",
            "cover_url":    "",
            "description":  "",
            "license_type": "open",
            "status":       "active",
            "total_queries": 0,
            "isbn":         "",
            "uploaded_by":  "system",
        }).execute()
        print(f"  ✅ Synced: {title}")
        synced += 1
    except Exception as e:
        print(f"  ❌ Failed {title}: {e}")

# Handle 27698-pdf — delete it (unknown/test file)
print(f"\nDeleting unknown '27698-pdf' from Qdrant...")
try:
    from qdrant_client.models import Filter, FieldCondition, MatchValue
    orphan_chunks = []
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
            if metadata.get("book_title") == "27698-pdf":
                orphan_chunks.append(r.id)
        if next_offset is None:
            break
        offset = next_offset

    if orphan_chunks:
        client.delete(
            collection_name=settings.collection_name,
            points_selector=orphan_chunks,
        )
        print(f"  ✅ Deleted {len(orphan_chunks)} chunks for 27698-pdf")
    else:
        print(f"  No chunks found for 27698-pdf")
except Exception as e:
    print(f"  ❌ Failed: {e}")

print(f"\n{'='*50}")
print(f"Sync complete!")
print(f"  Synced to Supabase: {synced}")
print(f"  Already existed:    {skipped}")

# Final count
supabase_final = db.table("books").select("id").execute()
print(f"  Total books in Supabase now: {len(supabase_final.data)}")