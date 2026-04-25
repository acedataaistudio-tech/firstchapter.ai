import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__)))

from config import settings
from qdrant_client import QdrantClient

print(f"URL: '{settings.qdrant_url}'")
print(f"KEY: '{settings.qdrant_api_key[:8]}...' (length: {len(settings.qdrant_api_key)})")

try:
    client = QdrantClient(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key,
    )
    collections = client.get_collections()
    print(f"Connected! Collections: {collections}")
except Exception as e:
    print(f"Connection failed: {e}")