import sys, os
sys.path.append(os.path.dirname(__file__))

from ingestion.pipeline import get_qdrant_client
from qdrant_client.models import PayloadSchemaType
from config import settings

client = get_qdrant_client()

client.create_payload_index(
    collection_name=settings.collection_name,
    field_name="metadata.book_id",
    field_schema=PayloadSchemaType.KEYWORD,
)

print("Index created successfully for metadata.book_id")