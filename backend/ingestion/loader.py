import fitz
import re
from langchain_core.documents import Document
from typing import List

CHAPTER_PATTERNS = [
    r'^chapter\s+\d+',
    r'^part\s+\d+',
    r'^section\s+\d+',
    r'^\d+\.\s+[A-Z]',
]

def detect_chapter(text: str) -> str | None:
    first_line = text.strip().split('\n')[0].strip()
    for pattern in CHAPTER_PATTERNS:
        if re.match(pattern, first_line, re.IGNORECASE):
            return first_line[:80]
    return None

def load_pdf_book(pdf_path: str, book_metadata: dict) -> List[Document]:
    doc = fitz.open(pdf_path)
    documents = []
    current_chapter = "Introduction"
    chapter_number = 0

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()

        if not text.strip() or len(text.strip()) < 50:
            continue

        detected = detect_chapter(text)
        if detected:
            chapter_number += 1
            current_chapter = detected

        documents.append(Document(
            page_content=text,
            metadata={
                "book_id":        book_metadata["id"],
                "book_title":     book_metadata["title"],
                "author":         book_metadata["author"],
                "publisher":      book_metadata.get("publisher", "Unknown"),
                "category":       book_metadata.get("category", "General"),
                "cover_url":      book_metadata.get("cover_url", ""),
                "page_number":    page_num + 1,
                "chapter":        current_chapter,
                "chapter_number": chapter_number,
            }
        ))

    doc.close()
    print(f"Loaded {len(documents)} pages from {book_metadata['title']}")
    return documents
