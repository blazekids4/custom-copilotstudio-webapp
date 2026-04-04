"""Azure Cosmos DB service — conversations, messages, and file metadata."""

from azure.identity import DefaultAzureCredential
from azure.cosmos.aio import CosmosClient

from backend.config import settings


_credential = DefaultAzureCredential()


async def _get_container(container_name: str):
    client = CosmosClient(
        url=settings.COSMOS_ENDPOINT, credential=_credential
    )
    db = client.get_database_client(settings.COSMOS_DATABASE)
    return client, db.get_container_client(container_name)


# ── Conversations ──────────────────────────────────────────────


async def create_conversation(conversation: dict) -> dict:
    client, container = await _get_container(
        settings.COSMOS_CONTAINER_CONVERSATIONS
    )
    async with client:
        return await container.create_item(body=conversation)


async def get_conversation(conversation_id: str, user_id: str) -> dict | None:
    client, container = await _get_container(
        settings.COSMOS_CONTAINER_CONVERSATIONS
    )
    async with client:
        try:
            return await container.read_item(
                item=conversation_id, partition_key=user_id
            )
        except Exception:
            return None


async def update_conversation(conversation: dict) -> dict:
    client, container = await _get_container(
        settings.COSMOS_CONTAINER_CONVERSATIONS
    )
    async with client:
        return await container.upsert_item(body=conversation)


async def list_conversations(user_id: str) -> list[dict]:
    client, container = await _get_container(
        settings.COSMOS_CONTAINER_CONVERSATIONS
    )
    async with client:
        query = "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.updatedAt DESC"
        items = container.query_items(
            query=query,
            parameters=[{"name": "@userId", "value": user_id}],
        )
        return [item async for item in items]


async def delete_conversation(conversation_id: str, user_id: str) -> None:
    client, container = await _get_container(
        settings.COSMOS_CONTAINER_CONVERSATIONS
    )
    async with client:
        await container.delete_item(
            item=conversation_id, partition_key=user_id
        )


# ── File Metadata ──────────────────────────────────────────────


async def save_file_metadata(metadata: dict) -> dict:
    client, container = await _get_container(settings.COSMOS_CONTAINER_FILES)
    async with client:
        return await container.create_item(body=metadata)


async def get_file_metadata(file_id: str, user_id: str) -> dict | None:
    client, container = await _get_container(settings.COSMOS_CONTAINER_FILES)
    async with client:
        try:
            return await container.read_item(
                item=file_id, partition_key=user_id
            )
        except Exception:
            return None


async def list_files(user_id: str) -> list[dict]:
    client, container = await _get_container(settings.COSMOS_CONTAINER_FILES)
    async with client:
        query = "SELECT * FROM c WHERE c.userId = @userId ORDER BY c.uploadedAt DESC"
        items = container.query_items(
            query=query,
            parameters=[{"name": "@userId", "value": user_id}],
        )
        return [item async for item in items]


async def update_file_metadata(metadata: dict) -> dict:
    client, container = await _get_container(settings.COSMOS_CONTAINER_FILES)
    async with client:
        return await container.upsert_item(body=metadata)


async def delete_file_metadata(file_id: str, user_id: str) -> None:
    client, container = await _get_container(settings.COSMOS_CONTAINER_FILES)
    async with client:
        await container.delete_item(item=file_id, partition_key=user_id)
