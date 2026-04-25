"""
Quick test to verify your RAG pipeline is working.
Run: python tests/test_rag.py
"""
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from retrieval.query import discover_books, query_books

def test_discover():
    print("\n── TEST 1: Book Discovery ──────────────────────────────────")
    print("Topic: 'leadership and success'")
    books = discover_books("leadership and success", top_k=3)
    assert isinstance(books, list), "Should return a list"
    print(f"Found {len(books)} books:")
    for b in books:
        print(f"  - {b['book_title']} by {b['author']} (score: {b['score']:.2f})")
        print(f"    Coverage: {b.get('topic_coverage', '')[:100]}...")
    print("PASSED")

def test_query():
    print("\n── TEST 2: Deep Query ──────────────────────────────────────")
    question = "What is the most important principle for achieving success?"
    print(f"Question: {question}")
    result = query_books(question=question, user_id="test_user")
    assert "answer" in result, "Should return an answer"
    assert "sources" in result, "Should return sources"
    print(f"Answer: {result['answer'][:200]}...")
    print(f"Sources: {len(result['sources'])} cited")
    for s in result["sources"]:
        print(f"  - {s['book_title']} — {s['chapter']}")
    print("PASSED")

def test_multi_book_query():
    print("\n── TEST 3: Multi-book Query ────────────────────────────────")
    books = discover_books("strategy", top_k=2)
    book_ids = [b["book_id"] for b in books]
    print(f"Querying across {len(book_ids)} books")
    result = query_books(
        question="What is the key to winning a battle?",
        book_ids=book_ids,
        user_id="test_user",
    )
    assert result["answer"], "Should return an answer"
    print(f"Answer: {result['answer'][:200]}...")
    print("PASSED")

if __name__ == "__main__":
    print("Firstchapter.ai — RAG Pipeline Tests")
    print("=" * 50)
    try:
        test_discover()
        test_query()
        test_multi_book_query()
        print("\nAll tests passed!")
    except Exception as e:
        print(f"\nTest failed: {e}")
        import traceback
        traceback.print_exc()
