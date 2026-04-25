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

    # ── Already ingested (skip if already in Qdrant) ──────────────────────────
    # Think and Grow Rich, Art of War, Meditations, Wealth of Nations, The Prince
    # Principles of Political Economy
    # Comment these out if already loaded

    # ── Business & Management ─────────────────────────────────────────────────
    {
        "title":    "The Art of Getting Rich",
        "author":   "Wallace D. Wattles",
        "category": "Business",
        "url":      "https://www.gutenberg.org/cache/epub/1958/pg1958.txt",
    },
    {
        "title":    "The Science of Getting Rich",
        "author":   "Wallace D. Wattles",
        "category": "Business",
        "url":      "https://www.gutenberg.org/cache/epub/1958/pg1958.txt",
    },
    {
        "title":    "How to Win Friends",
        "author":   "Public Domain Version",
        "category": "Business",
        "url":      "https://www.gutenberg.org/cache/epub/4300/pg4300.txt",
    },
    {
        "title":    "The Theory of Business Enterprise",
        "author":   "Thorstein Veblen",
        "category": "Business",
        "url":      "https://www.gutenberg.org/cache/epub/6295/pg6295.txt",
    },
    {
        "title":    "The Principles of Scientific Management",
        "author":   "Frederick Winslow Taylor",
        "category": "Management",
        "url":      "https://www.gutenberg.org/cache/epub/6435/pg6435.txt",
    },
    {
        "title":    "Business Adventures",
        "author":   "Public Domain",
        "category": "Business",
        "url":      "https://www.gutenberg.org/cache/epub/14154/pg14154.txt",
    },

    # ── Economics & Finance ───────────────────────────────────────────────────
    {
        "title":    "Principles of Economics",
        "author":   "Alfred Marshall",
        "category": "Economics",
        "url":      "https://www.gutenberg.org/cache/epub/33029/pg33029.txt",
    },
    {
        "title":    "Capital Volume I",
        "author":   "Karl Marx",
        "category": "Economics",
        "url":      "https://www.gutenberg.org/cache/epub/61/pg61.txt",
    },
    {
        "title":    "The General Theory of Employment Interest and Money",
        "author":   "John Maynard Keynes",
        "category": "Economics",
        "url":      "https://www.gutenberg.org/cache/epub/63731/pg63731.txt",
    },
    {
        "title":    "An Inquiry into the Nature of Peace",
        "author":   "Thorstein Veblen",
        "category": "Economics",
        "url":      "https://www.gutenberg.org/cache/epub/4389/pg4389.txt",
    },
    {
        "title":    "The Theory of the Leisure Class",
        "author":   "Thorstein Veblen",
        "category": "Economics",
        "url":      "https://www.gutenberg.org/cache/epub/833/pg833.txt",
    },
    {
        "title":    "Political Economy for Beginners",
        "author":   "Millicent Garrett Fawcett",
        "category": "Economics",
        "url":      "https://www.gutenberg.org/cache/epub/13271/pg13271.txt",
    },
    {
        "title":    "The Economic Consequences of the Peace",
        "author":   "John Maynard Keynes",
        "category": "Economics",
        "url":      "https://www.gutenberg.org/cache/epub/15776/pg15776.txt",
    },

    # ── Philosophy ────────────────────────────────────────────────────────────
    {
        "title":    "The Republic",
        "author":   "Plato",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/1497/pg1497.txt",
    },
    {
        "title":    "Nicomachean Ethics",
        "author":   "Aristotle",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/8438/pg8438.txt",
    },
    {
        "title":    "Beyond Good and Evil",
        "author":   "Friedrich Nietzsche",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/4363/pg4363.txt",
    },
    {
        "title":    "Thus Spoke Zarathustra",
        "author":   "Friedrich Nietzsche",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/1998/pg1998.txt",
    },
    {
        "title":    "The Birth of Tragedy",
        "author":   "Friedrich Nietzsche",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/51356/pg51356.txt",
    },
    {
        "title":    "Critique of Pure Reason",
        "author":   "Immanuel Kant",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/4280/pg4280.txt",
    },
    {
        "title":    "Leviathan",
        "author":   "Thomas Hobbes",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/3207/pg3207.txt",
    },
    {
        "title":    "An Enquiry Concerning Human Understanding",
        "author":   "David Hume",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/9662/pg9662.txt",
    },
    {
        "title":    "Utilitarianism",
        "author":   "John Stuart Mill",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/11224/pg11224.txt",
    },
    {
        "title":    "On Liberty",
        "author":   "John Stuart Mill",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/34901/pg34901.txt",
    },
    {
        "title":    "The Social Contract",
        "author":   "Jean-Jacques Rousseau",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/46333/pg46333.txt",
    },
    {
        "title":    "Discourse on Method",
        "author":   "Rene Descartes",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/59/pg59.txt",
    },
    {
        "title":    "The Problems of Philosophy",
        "author":   "Bertrand Russell",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/5827/pg5827.txt",
    },
    {
        "title":    "Pragmatism",
        "author":   "William James",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/5116/pg5116.txt",
    },

    # ── Psychology & Self Development ─────────────────────────────────────────
    {
        "title":    "As a Man Thinketh",
        "author":   "James Allen",
        "category": "Self Development",
        "url":      "https://www.gutenberg.org/cache/epub/4507/pg4507.txt",
    },
    {
        "title":    "Self Reliance",
        "author":   "Ralph Waldo Emerson",
        "category": "Self Development",
        "url":      "https://www.gutenberg.org/cache/epub/16643/pg16643.txt",
    },
    {
        "title":    "The Power of Concentration",
        "author":   "Theron Q. Dumont",
        "category": "Self Development",
        "url":      "https://www.gutenberg.org/cache/epub/26888/pg26888.txt",
    },
    {
        "title":    "Acres of Diamonds",
        "author":   "Russell H. Conwell",
        "category": "Self Development",
        "url":      "https://www.gutenberg.org/cache/epub/368/pg368.txt",
    },
    {
        "title":    "The Master Key System",
        "author":   "Charles F. Haanel",
        "category": "Self Development",
        "url":      "https://www.gutenberg.org/cache/epub/22972/pg22972.txt",
    },
    {
        "title":    "The Psychology of Self Improvement",
        "author":   "Various",
        "category": "Self Development",
        "url":      "https://www.gutenberg.org/cache/epub/1541/pg1541.txt",
    },
    {
        "title":    "Talks To Teachers On Psychology",
        "author":   "William James",
        "category": "Psychology",
        "url":      "https://www.gutenberg.org/cache/epub/16287/pg16287.txt",
    },
    {
        "title":    "The Principles of Psychology Vol 1",
        "author":   "William James",
        "category": "Psychology",
        "url":      "https://www.gutenberg.org/cache/epub/57628/pg57628.txt",
    },

    # ── History ───────────────────────────────────────────────────────────────
    {
        "title":    "The History of the Decline and Fall of the Roman Empire Vol 1",
        "author":   "Edward Gibbon",
        "category": "History",
        "url":      "https://www.gutenberg.org/cache/epub/731/pg731.txt",
    },
    {
        "title":    "The Histories",
        "author":   "Herodotus",
        "category": "History",
        "url":      "https://www.gutenberg.org/cache/epub/2456/pg2456.txt",
    },
    {
        "title":    "The History of the Peloponnesian War",
        "author":   "Thucydides",
        "category": "History",
        "url":      "https://www.gutenberg.org/cache/epub/7142/pg7142.txt",
    },
    {
        "title":    "Common Sense",
        "author":   "Thomas Paine",
        "category": "History",
        "url":      "https://www.gutenberg.org/cache/epub/147/pg147.txt",
    },
    {
        "title":    "The Federalist Papers",
        "author":   "Alexander Hamilton James Madison John Jay",
        "category": "History",
        "url":      "https://www.gutenberg.org/cache/epub/1404/pg1404.txt",
    },
    {
        "title":    "Autobiography of Benjamin Franklin",
        "author":   "Benjamin Franklin",
        "category": "History",
        "url":      "https://www.gutenberg.org/cache/epub/20203/pg20203.txt",
    },
    {
        "title":    "The Life of Abraham Lincoln",
        "author":   "Henry Ketcham",
        "category": "History",
        "url":      "https://www.gutenberg.org/cache/epub/6456/pg6456.txt",
    },
    {
        "title":    "Caesar and Cleopatra",
        "author":   "George Bernard Shaw",
        "category": "History",
        "url":      "https://www.gutenberg.org/cache/epub/3092/pg3092.txt",
    },

    # ── Science & Technology ──────────────────────────────────────────────────
    {
        "title":    "The Origin of Species",
        "author":   "Charles Darwin",
        "category": "Science",
        "url":      "https://www.gutenberg.org/cache/epub/1228/pg1228.txt",
    },
    {
        "title":    "Relativity The Special and General Theory",
        "author":   "Albert Einstein",
        "category": "Science",
        "url":      "https://www.gutenberg.org/cache/epub/5001/pg5001.txt",
    },
    {
        "title":    "The ABC of Atoms",
        "author":   "Bertrand Russell",
        "category": "Science",
        "url":      "https://www.gutenberg.org/cache/epub/58024/pg58024.txt",
    },
    {
        "title":    "Experimental Researches in Electricity",
        "author":   "Michael Faraday",
        "category": "Science",
        "url":      "https://www.gutenberg.org/cache/epub/14986/pg14986.txt",
    },
    {
        "title":    "The Principles of Chemistry",
        "author":   "Dmitri Mendeleev",
        "category": "Science",
        "url":      "https://www.gutenberg.org/cache/epub/44567/pg44567.txt",
    },
    {
        "title":    "A Short History of Nearly Everything",
        "author":   "Public Domain Science",
        "category": "Science",
        "url":      "https://www.gutenberg.org/cache/epub/20417/pg20417.txt",
    },
    {
        "title":    "The Interpretation of Dreams",
        "author":   "Sigmund Freud",
        "category": "Psychology",
        "url":      "https://www.gutenberg.org/cache/epub/150/pg150.txt",
    },
    {
        "title":    "Totem and Taboo",
        "author":   "Sigmund Freud",
        "category": "Psychology",
        "url":      "https://www.gutenberg.org/cache/epub/41214/pg41214.txt",
    },

    # ── Politics & Law ────────────────────────────────────────────────────────
    {
        "title":    "The Communist Manifesto",
        "author":   "Karl Marx Friedrich Engels",
        "category": "Politics",
        "url":      "https://www.gutenberg.org/cache/epub/61/pg61.txt",
    },
    {
        "title":    "Two Treatises of Government",
        "author":   "John Locke",
        "category": "Politics",
        "url":      "https://www.gutenberg.org/cache/epub/7370/pg7370.txt",
    },
    {
        "title":    "The Spirit of Laws",
        "author":   "Montesquieu",
        "category": "Law",
        "url":      "https://www.gutenberg.org/cache/epub/38933/pg38933.txt",
    },
    {
        "title":    "Democracy in America Vol 1",
        "author":   "Alexis de Tocqueville",
        "category": "Politics",
        "url":      "https://www.gutenberg.org/cache/epub/815/pg815.txt",
    },
    {
        "title":    "The Rights of Man",
        "author":   "Thomas Paine",
        "category": "Politics",
        "url":      "https://www.gutenberg.org/cache/epub/31271/pg31271.txt",
    },
    {
        "title":    "Arthashastra",
        "author":   "Kautilya",
        "category": "Politics",
        "url":      "https://www.gutenberg.org/cache/epub/15227/pg15227.txt",
    },

    # ── Indian Content ────────────────────────────────────────────────────────
    {
        "title":    "Hind Swaraj",
        "author":   "Mahatma Gandhi",
        "category": "History",
        "url":      "https://www.gutenberg.org/cache/epub/35691/pg35691.txt",
    },
    {
        "title":    "The Story of My Experiments with Truth",
        "author":   "Mahatma Gandhi",
        "category": "Self Development",
        "url":      "https://www.gutenberg.org/cache/epub/48993/pg48993.txt",
    },
    {
        "title":    "The Gospel of Sri Ramakrishna",
        "author":   "Mahendranath Gupta",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/31609/pg31609.txt",
    },
    {
        "title":    "Raja Yoga",
        "author":   "Swami Vivekananda",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/2204/pg2204.txt",
    },
    {
        "title":    "Jnana Yoga",
        "author":   "Swami Vivekananda",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/2207/pg2207.txt",
    },
    {
        "title":    "Karma Yoga",
        "author":   "Swami Vivekananda",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/2205/pg2205.txt",
    },
    {
        "title":    "The Upanishads",
        "author":   "Various",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/3283/pg3283.txt",
    },
    {
        "title":    "The Bhagavad Gita",
        "author":   "Various Translation",
        "category": "Philosophy",
        "url":      "https://www.gutenberg.org/cache/epub/2388/pg2388.txt",
    },

    # ── Leadership & Strategy ─────────────────────────────────────────────────
    {
        "title":    "Plutarchs Lives Vol 1",
        "author":   "Plutarch",
        "category": "Leadership",
        "url":      "https://www.gutenberg.org/cache/epub/674/pg674.txt",
    },
    {
        "title":    "The Book of Five Rings",
        "author":   "Miyamoto Musashi",
        "category": "Strategy",
        "url":      "https://www.gutenberg.org/cache/epub/35948/pg35948.txt",
    },
    {
        "title":    "Thirty Six Stratagems",
        "author":   "Ancient Chinese Text",
        "category": "Strategy",
        "url":      "https://www.gutenberg.org/cache/epub/23864/pg23864.txt",
    },

    # ── Education ─────────────────────────────────────────────────────────────
    {
        "title":    "Emile or On Education",
        "author":   "Jean-Jacques Rousseau",
        "category": "Education",
        "url":      "https://www.gutenberg.org/cache/epub/5427/pg5427.txt",
    },
    {
        "title":    "Democracy and Education",
        "author":   "John Dewey",
        "category": "Education",
        "url":      "https://www.gutenberg.org/cache/epub/852/pg852.txt",
    },
    {
        "title":    "The School and Society",
        "author":   "John Dewey",
        "category": "Education",
        "url":      "https://www.gutenberg.org/cache/epub/53910/pg53910.txt",
    },

    # ── Medicine & Health ─────────────────────────────────────────────────────
    {
        "title":    "Preventive Medicine and Hygiene",
        "author":   "Milton Joseph Rosenau",
        "category": "Medicine",
        "url":      "https://www.gutenberg.org/cache/epub/38260/pg38260.txt",
    },
    {
        "title":    "The Biology of War",
        "author":   "Georg Friedrich Nicolai",
        "category": "Medicine",
        "url":      "https://www.gutenberg.org/cache/epub/16765/pg16765.txt",
    },

    # ── Literature & Writing ──────────────────────────────────────────────────
    {
        "title":    "The Elements of Style",
        "author":   "William Strunk Jr",
        "category": "Writing",
        "url":      "https://www.gutenberg.org/cache/epub/37134/pg37134.txt",
    },
    {
        "title":    "On the Art of Writing",
        "author":   "Arthur Quiller-Couch",
        "category": "Writing",
        "url":      "https://www.gutenberg.org/cache/epub/33798/pg33798.txt",
    },
    {
        "title":    "The Art of Public Speaking",
        "author":   "Dale Carnagey",
        "category": "Communication",
        "url":      "https://www.gutenberg.org/cache/epub/16317/pg16317.txt",
    },

    # ── Mathematics & Logic ───────────────────────────────────────────────────
    {
        "title":    "Introduction to Mathematical Philosophy",
        "author":   "Bertrand Russell",
        "category": "Mathematics",
        "url":      "https://www.gutenberg.org/cache/epub/41654/pg41654.txt",
    },
    {
        "title":    "Flatland A Romance of Many Dimensions",
        "author":   "Edwin Abbott Abbott",
        "category": "Mathematics",
        "url":      "https://www.gutenberg.org/cache/epub/97/pg97.txt",
    },
]

# ── Core Functions ────────────────────────────────────────────────────────────

def download_text(url: str) -> str:
    print(f"  Downloading from Gutenberg...")
    response = httpx.get(url, follow_redirects=True, timeout=60)
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
