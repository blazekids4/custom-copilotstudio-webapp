"""Azure Blob Storage service — file upload, download, and listing."""

import uuid
from datetime import datetime, timezone

from azure.identity import DefaultAzureCredential
from azure.storage.blob.aio import BlobServiceClient

from backend.config import settings


_credential = DefaultAzureCredential()


async def _get_client() -> BlobServiceClient:
    return BlobServiceClient(
        account_url=settings.STORAGE_ACCOUNT_URL, credential=_credential
    )


async def upload_file(
    file_bytes: bytes, file_name: str, content_type: str, user_id: str
) -> dict:
    """Upload a file to Blob Storage and return metadata."""
    file_id = str(uuid.uuid4())
    blob_name = f"{user_id}/{file_id}/{file_name}"

    client = await _get_client()
    async with client:
        container = client.get_container_client(settings.STORAGE_CONTAINER)
        await container.upload_blob(
            name=blob_name,
            data=file_bytes,
            content_settings={"content_type": content_type},
            metadata={"userId": user_id, "fileId": file_id},
            overwrite=True,
        )

    return {
        "id": file_id,
        "userId": user_id,
        "fileName": file_name,
        "contentType": content_type,
        "sizeBytes": len(file_bytes),
        "blobName": blob_name,
        "uploadedAt": datetime.now(timezone.utc).isoformat(),
        "status": "uploaded",
    }


async def download_file(blob_name: str) -> bytes:
    """Download a file from Blob Storage."""
    client = await _get_client()
    async with client:
        blob = client.get_blob_client(
            container=settings.STORAGE_CONTAINER, blob=blob_name
        )
        stream = await blob.download_blob()
        return await stream.readall()


async def delete_file(blob_name: str) -> None:
    """Delete a file from Blob Storage."""
    client = await _get_client()
    async with client:
        blob = client.get_blob_client(
            container=settings.STORAGE_CONTAINER, blob=blob_name
        )
        await blob.delete_blob()
