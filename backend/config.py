from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path

class Settings(BaseSettings):
    openai_api_key: str
    cohere_api_key: str = ""
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    supabase_url: str = ""
    supabase_key: str = ""
    redis_url: str = "redis://localhost:6379"
    clerk_secret_key: str = ""
    environment: str = "development"
    collection_name: str = "firstchapter_books"
    chunk_size: int = 500
    chunk_overlap: int = 75
    top_k_retrieval: int = 10
    top_k_rerank: int = 5
    embedding_model: str = "text-embedding-3-small"
    llm_model: str = "gpt-4o-mini"

    class Config:
        # Look for .env in backend folder regardless of where script is run from
        env_file = str(Path(__file__).parent / ".env")
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()