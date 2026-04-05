"""Files router — upload, list, download, and delete files.

Files are uploaded to Blob Storage and metadata is saved to Cosmos DB.
The AI Search indexer automatically detects new blobs and runs the
extract → chunk → embed → index pipeline (configured via setup_search.py).
"""

from fastapi import APIRouter, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import Response

from backend.auth import get_user_from_swa_headers
from backend.models.schemas import FileUploadResponse
from backend.services import blob_storage, cosmos

router = APIRouter(prefix="/api/files", tags=["files"])

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("", response_model=FileUploadResponse)
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    folderPath: str = Form(""),
    tags: str = Form(""),
):
    user = get_user_from_swa_headers(request)

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 50 MB)")

    # Parse tags from comma-separated string
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    # Upload to Blob Storage — the AI Search indexer will automatically
    # detect the new blob and run the extract → chunk → embed → index pipeline.
    blob_meta = await blob_storage.upload_file(
        file_bytes=contents,
        file_name=file.filename or "unnamed",
        content_type=file.content_type or "application/octet-stream",
        user_id=user["userId"],
        folder_path=folderPath,
        tags=tag_list,
    )

    # Save metadata to Cosmos DB
    blob_meta["status"] = "processing"  # indexer will process asynchronously
    await cosmos.save_file_metadata(blob_meta)

    return FileUploadResponse(
        fileId=blob_meta["id"],
        fileName=blob_meta["fileName"],
        status=blob_meta["status"],
    )


@router.get("")
async def list_files(request: Request):
    user = get_user_from_swa_headers(request)
    files = await cosmos.list_files(user["userId"])
    return [
        {
            "id": f["id"],
            "fileName": f["fileName"],
            "contentType": f["contentType"],
            "sizeBytes": f["sizeBytes"],
            "uploadedAt": f["uploadedAt"],
            "status": f["status"],
            "chunkCount": f.get("chunkCount", 0),
            "folderPath": f.get("folderPath", "/"),
            "tags": f.get("tags", []),
        }
        for f in files
    ]


@router.delete("/{file_id}")
async def delete_file(file_id: str, request: Request):
    user = get_user_from_swa_headers(request)
    meta = await cosmos.get_file_metadata(file_id, user["userId"])
    if not meta:
        raise HTTPException(status_code=404, detail="File not found")

    await blob_storage.delete_file(meta["blobName"])
    await cosmos.delete_file_metadata(file_id, user["userId"])
    return {"status": "deleted"}


@router.get("/{file_id}/download")
async def download_file(file_id: str, request: Request):
    user = get_user_from_swa_headers(request)
    meta = await cosmos.get_file_metadata(file_id, user["userId"])
    if not meta:
        raise HTTPException(status_code=404, detail="File not found")

    content = await blob_storage.download_file(meta["blobName"])
    return Response(
        content=content,
        media_type=meta.get("contentType", "application/octet-stream"),
        headers={
            "Content-Disposition": f'attachment; filename="{meta["fileName"]}"'
        },
    )
