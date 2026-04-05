"""Azure AI Search service — multiple search modes against the indexer-managed index.

The index is populated automatically by the AI Search indexer pipeline
(configured via setup_search.py). This module handles queries only.

Search modes:
  - hybrid:   keyword + vector (default, best for targeted Q&A)
  - vector:   pure vector similarity (broad semantic sweep)
  - keyword:  pure text search (exact term matching)
"""

from azure.identity import DefaultAzureCredential
from azure.search.documents.aio import SearchClient
from azure.search.documents.models import VectorizedQuery

from backend.config import settings
from backend.services.openai_service import generate_embedding


_credential = DefaultAzureCredential()


def _get_client() -> SearchClient:
    return SearchClient(
        endpoint=settings.SEARCH_ENDPOINT,
        index_name=settings.SEARCH_INDEX,
        credential=_credential,
    )


async def search_documents(
    query: str,
    user_id: str,
    top: int = 5,
    mode: str = "hybrid",
    file_name: str | None = None,
    content_type: str | None = None,
    folder_path: str | None = None,
    tags: list[str] | None = None,
) -> list[dict]:
    """Search the index with configurable mode and filters.

    Args:
        query: The user's search query.
        user_id: Filter results to this user's documents.
        top: Number of results to return. Use 20-50 for broad sweeps.
        mode: "hybrid" (keyword+vector), "vector" (semantic only), "keyword" (text only).
        file_name: Optional — filter to a specific file.
        content_type: Optional — filter by content type (e.g. "application/pdf").
        folder_path: Optional — filter to a specific folder.
        tags: Optional — filter to documents matching ANY of these tags.
    """
    # Build OData filter (escape single quotes to prevent injection)
    def _esc(val: str) -> str:
        return val.replace("'", "''")

    filters = [f"userId eq '{_esc(user_id)}'"]
    if file_name:
        filters.append(f"fileName eq '{_esc(file_name)}'")
    if content_type:
        filters.append(f"contentType eq '{_esc(content_type)}'")
    if folder_path:
        filters.append(f"folderPath eq '{_esc(folder_path)}'")
    if tags:
        # Match documents that have ANY of the specified tags
        tag_clauses = " or ".join(
            f"tags/any(t: t eq '{_esc(tag)}')" for tag in tags
        )
        filters.append(f"({tag_clauses})")
    filter_expr = " and ".join(filters)

    # Build search params based on mode
    search_text = query if mode in ("hybrid", "keyword") else None
    vector_queries = []

    if mode in ("hybrid", "vector"):
        query_embedding = await generate_embedding(query)
        vector_queries.append(
            VectorizedQuery(
                vector=query_embedding,
                k_nearest_neighbors=top,
                fields="contentVector",
            )
        )

    async with _get_client() as client:
        results = await client.search(
            search_text=search_text,
            vector_queries=vector_queries if vector_queries else None,
            filter=filter_expr,
            top=top,
            select=["id", "content", "fileName", "fileId", "contentType", "chunkIndex"],
        )

        docs = []
        async for result in results:
            docs.append(
                {
                    "content": result["content"],
                    "fileName": result.get("fileName", ""),
                    "fileId": result.get("fileId", ""),
                    "contentType": result.get("contentType", ""),
                    "chunkIndex": result.get("chunkIndex", 0),
                    "score": result["@search.score"],
                }
            )
        return docs
