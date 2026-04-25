from supabase import create_client, Client
from config import settings
from typing import Optional
import uuid
from datetime import datetime

def get_db() -> Client:
    return create_client(settings.supabase_url, settings.supabase_key)

# ── USERS ────────────────────────────────────────────────────────────────────

def get_user(user_id: str) -> Optional[dict]:
    try:
        res = get_db().table("users").select("*").eq("id", user_id).single().execute()
        return res.data
    except Exception:
        return None

def create_user(user_id: str, email: str, institution_id: str = None) -> dict:
    db = get_db()
    user = {
        "id":              user_id,
        "email":           email,
        "institution_id":  institution_id,
        "queries_used":    0,
        "queries_limit":   100,
        "plan_type":       "institution" if institution_id else "free",
        "created_at":      datetime.utcnow().isoformat(),
    }
    res = db.table("users").insert(user).execute()
    return res.data[0]

def check_query_limit(user: dict) -> bool:
    return user.get("queries_used", 0) < user.get("queries_limit", 100)

def deduct_query_credit(user_id: str) -> int:
    db = get_db()
    user = get_user(user_id)
    if not user:
        return 0
    new_count = user["queries_used"] + 1
    db.table("users").update({"queries_used": new_count}).eq("id", user_id).execute()
    return user["queries_limit"] - new_count

# ── BOOKS ────────────────────────────────────────────────────────────────────

def save_book_metadata(book: dict) -> dict:
    db = get_db()
    book["created_at"] = datetime.utcnow().isoformat()
    book["status"] = "active"
    res = db.table("books").insert(book).execute()
    return res.data[0]

def get_all_books() -> list:
    res = get_db().table("books").select("*").eq("status", "active").execute()
    return res.data

def get_book(book_id: str) -> Optional[dict]:
    try:
        res = get_db().table("books").select("*").eq("id", book_id).single().execute()
        return res.data
    except Exception:
        return None

# ── QUERIES / HISTORY ────────────────────────────────────────────────────────

def log_query(
    user_id: str,
    session_id: str,
    question: str,
    answer: str,
    sources: list,
    book_ids: list = None,
) -> dict:
    db = get_db()
    record = {
        "id":           str(uuid.uuid4()),
        "user_id":      user_id,
        "session_id":   session_id,
        "question":     question,
        "answer":       answer,
        "sources":      sources,
        "book_ids":     book_ids or [],
        "created_at":   datetime.utcnow().isoformat(),
    }
    res = db.table("queries").insert(record).execute()
    return res.data[0]

def get_user_history(user_id: str, limit: int = 20) -> list:
    res = (
        get_db()
        .table("queries")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data

def get_session_history(session_id: str) -> list:
    res = (
        get_db()
        .table("queries")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", asc=True)
        .execute()
    )
    return res.data

# ── SAVED ANSWERS ────────────────────────────────────────────────────────────

def save_answer(user_id: str, query_id: str, title: str) -> dict:
    db = get_db()
    record = {
        "id":         str(uuid.uuid4()),
        "user_id":    user_id,
        "query_id":   query_id,
        "title":      title,
        "created_at": datetime.utcnow().isoformat(),
    }
    res = db.table("saved_answers").insert(record).execute()
    return res.data[0]

def get_saved_answers(user_id: str) -> list:
    res = (
        get_db()
        .table("saved_answers")
        .select("*, queries(*)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data

# ── SHARE LINKS ──────────────────────────────────────────────────────────────

def create_share_link(query_id: str, session_id: str, user_id: str) -> str:
    db = get_db()
    share_id = str(uuid.uuid4())[:8]
    record = {
        "id":         share_id,
        "query_id":   query_id,
        "session_id": session_id,
        "created_by": user_id,
        "created_at": datetime.utcnow().isoformat(),
    }
    db.table("share_links").insert(record).execute()
    return share_id

def get_shared_content(share_id: str) -> Optional[dict]:
    try:
        res = get_db().table("share_links").select("*, queries(*)").eq("id", share_id).single().execute()
        return res.data
    except Exception:
        return None

# ── INSTITUTIONS ─────────────────────────────────────────────────────────────

def get_institution(institution_id: str) -> Optional[dict]:
    try:
        res = get_db().table("institutions").select("*").eq("id", institution_id).single().execute()
        return res.data
    except Exception:
        return None

def get_institution_stats(institution_id: str) -> dict:
    db = get_db()
    users_res = db.table("users").select("id, queries_used").eq("institution_id", institution_id).execute()
    users = users_res.data
    total_queries = sum(u["queries_used"] for u in users)
    return {
        "total_users":   len(users),
        "total_queries": total_queries,
        "users":         users,
    }
