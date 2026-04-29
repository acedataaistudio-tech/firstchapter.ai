from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_qdrant import QdrantVectorStore
from langchain_core.prompts import PromptTemplate
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_community.callbacks.manager import get_openai_callback  # NEW # NEW: Import for token tracking
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchAny
from generation.prompts import DISCOVERY_PROMPT
from ingestion.pipeline import get_qdrant_client, get_embeddings
from config import settings
from typing import List, Optional

def get_llm(streaming: bool = False):
    return ChatOpenAI(
        model=settings.llm_model,
        openai_api_key=settings.openai_api_key,
        temperature=0.1,
        streaming=streaming,
    )

def get_vectorstore():
    return QdrantVectorStore(
        client=get_qdrant_client(),
        collection_name=settings.collection_name,
        embedding=get_embeddings(),
    )

def extract_sources(source_documents) -> List[dict]:
    seen = set()
    sources = []
    for doc in source_documents:
        m = doc.metadata
        key = f"{m.get('book_id')}_{m.get('chapter')}"
        if key not in seen:
            seen.add(key)
            sources.append({
                "book_id":     m.get("book_id"),
                "book_title":  m.get("book_title"),
                "author":      m.get("author"),
                "cover_url":   m.get("cover_url", ""),
                "chapter":     m.get("chapter"),
                "page_number": m.get("page_number"),
            })
    return sources

def format_docs(docs):
    parts = []
    for doc in docs:
        m = doc.metadata
        parts.append(
            f"[{m.get('book_title')} — {m.get('chapter')}]\n{doc.page_content}"
        )
    return "\n\n".join(parts)

def expand_topic(topic: str) -> str:
    if len(topic.split()) >= 4:
        return topic
    llm = get_llm()
    response = llm.invoke(
        f"Expand this search topic into 2-3 sentences of related concepts "
        f"for finding relevant books. Topic: '{topic}'. "
        f"Return only the expanded text, nothing else."
    )
    return f"{topic} {response.content}"

def discover_books(topic: str, top_k: int = 8) -> List[dict]:
    vectorstore = get_vectorstore()

    search_topic = expand_topic(topic)
    print(f"Expanded topic: {search_topic[:100]}")

    results = vectorstore.similarity_search_with_score(search_topic, k=top_k * 5)

    seen_books = {}
    for doc, score in results:
        book_id = doc.metadata.get("book_id")
        if book_id not in seen_books or score > seen_books[book_id]["score"]:
            seen_books[book_id] = {
                "book_id":    book_id,
                "book_title": doc.metadata.get("book_title"),
                "author":     doc.metadata.get("author"),
                "cover_url":  doc.metadata.get("cover_url", ""),
                "category":   doc.metadata.get("category", "General"),
                "score":      float(score),
                "snippet":    doc.page_content[:400],
            }

    books = sorted(seen_books.values(), key=lambda x: x["score"], reverse=True)

    llm = get_llm()
    for book in books[:top_k]:
        prompt_text = DISCOVERY_PROMPT.format(
            topic=topic,
            context=book["snippet"]
        )
        try:
            response = llm.invoke(prompt_text)
            book["topic_coverage"] = response.content
        except Exception:
            book["topic_coverage"] = f"This book covers aspects related to {topic}."
        book.pop("snippet", None)

    return books[:top_k]

def rewrite_vague_query(question: str) -> str:
    """
    Rewrite vague queries into more specific ones
    that the RAG can answer better
    """
    vague_patterns = [
        "tell me about",
        "what is this book",
        "about this book",
        "describe this book",
        "overview of this book",
        "summarise this book",
        "summarize this book",
    ]

    question_lower = question.lower()
    is_vague = any(p in question_lower for p in vague_patterns)

    if is_vague:
        return (
            "Provide a comprehensive overview including: "
            "the main themes, key arguments, important concepts, "
            "and the most valuable insights from this book"
        )

    return question

def query_books(
    question: str,
    book_ids: Optional[List[str]] = None,
    user_id: str = "",
    chat_history: Optional[List[dict]] = None,
) -> dict:
    # Rewrite vague queries for better RAG performance
    search_question = rewrite_vague_query(question)
    vectorstore = get_vectorstore()

    search_kwargs = {"k": settings.top_k_retrieval}

    if book_ids:
        search_kwargs["filter"] = Filter(
            must=[
                FieldCondition(
                    key="metadata.book_id",
                    match=MatchAny(any=book_ids),
                )
            ]
        )

    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs=search_kwargs,
    )

    # Build conversation history string from last 4 exchanges
    history_text = ""
    if chat_history:
        recent = chat_history[-8:]  # Last 4 exchanges = 8 messages
        for msg in recent:
            role = "User" if msg.get("role") == "user" else "Assistant"
            content = msg.get("content", "")[:300]  # Truncate long messages
            history_text += f"{role}: {content}\n"

    prompt_template = """You are Firstchapter — an intelligent reading assistant.

STRICT RULES:
1. ONLY answer from the book content provided in context below
2. NEVER use general knowledge to supplement answers
3. ALWAYS cite book title and chapter for every key point [Book Title — Chapter]
4. For vague questions like "tell me about this book" or "give me an overview" —
   synthesise the available context into a helpful summary. Never refuse these.
5. Only say "This topic isn't covered" if the topic is genuinely absent from context
6. NEVER reproduce more than 2 sentences verbatim from any source
7. When multiple books selected draw insights from ALL of them
8. End with: "Want to go deeper? Read the full section in [Book Title]."

PREVIOUS CONVERSATION CONTEXT:
{history}

CONTEXT FROM SELECTED BOOKS:
{context}

CURRENT QUESTION:
{question}

YOUR ANSWER WITH CITATIONS:
"""

    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["context", "question", "history"],
    )

    llm = get_llm()

    chain = (
        {
            "context":  retriever | format_docs,
            "question": RunnablePassthrough(),
            "history":  lambda x: history_text if history_text else "No previous conversation.",
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    # ✅ NEW: Wrap the chain invocation with token tracking callback
    with get_openai_callback() as cb:
        answer = chain.invoke(search_question)  # Use rewritten query
        
        # Extract token usage from callback
        input_tokens = cb.prompt_tokens
        output_tokens = cb.completion_tokens
        total_tokens = cb.total_tokens
    
    source_docs = retriever.invoke(search_question)
    sources = extract_sources(source_docs)

    # Generate follow-up suggestions
    suggestions = []
    try:
        # ✅ UPDATED: Track tokens for suggestions too
        with get_openai_callback() as cb_suggestions:
            suggestions_response = llm.invoke(
                f"Based on this Q&A, suggest 3 short follow-up questions "
                f"a curious student might ask.\n"
                f"Question: {question}\n"
                f"Answer: {answer[:200]}\n"
                f"Return ONLY a JSON array of 3 strings. "
                f"Example: [\"question 1\", \"question 2\", \"question 3\"]"
            )
            
            # Add suggestions tokens to total
            input_tokens += cb_suggestions.prompt_tokens
            output_tokens += cb_suggestions.completion_tokens
            total_tokens += cb_suggestions.total_tokens
        
        import json
        raw = suggestions_response.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        suggestions = json.loads(raw)
    except Exception as e:
        print(f"Suggestions failed: {e}")
        suggestions = [
            "Can you explain this in more detail?",
            "What are practical examples of this?",
            "How does this compare to other theories?",
        ]

    # ✅ NEW: Return token information
    return {
        "answer":        answer,
        "sources":       sources,
        "suggestions":   suggestions,
        # ✅ NEW: Add token tracking data
        "input_tokens":  input_tokens,
        "output_tokens": output_tokens,
        "total_tokens":  total_tokens,
        "model":         settings.llm_model,  # From your settings
    }