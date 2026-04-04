"""Azure AI Search service — hybrid query against the indexer-managed index.

The index is populated automatically by the AI Search indexer pipeline
(configured via setup_search.py). This module only handles queries.
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
    query: str, user_id: str, top: int = 5
) -> list[dict]:
    """Run a hybrid (keyword + vector) search scoped to a user's files."""
    query_embedding = await generate_embedding(query)

    vector_query = VectorizedQuery(
        vector=query_embedding,
        k_nearest_neighbors=top,
        fields="contentVector",
    )

    async with _get_client() as client:
        results = await client.search(
            search_text=query,
            vector_queries=[vector_query],
            filter=f"userId eq '{user_id}'",
            top=top,
            select=["id", "content", "fileName"],
        )

        docs = []
        async for result in results:
            docs.append(
                {
                    "content": result["content"],
                    "fileName": result.get("fileName", ""),
                    "score": result["@search.score"],
                }
            )
        return docs
