"""Analytics router — usage metrics and overview stats."""

from fastapi import APIRouter, Request

from backend.auth import get_user_from_swa_headers
from backend.models.schemas import AnalyticsOverview
from backend.services import cosmos

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsOverview)
async def get_overview(request: Request):
    user = get_user_from_swa_headers(request)
    user_id = user["userId"]

    conversations = await cosmos.list_conversations(user_id)
    files = await cosmos.list_files(user_id)

    total_messages = sum(
        len(c.get("messages", [])) for c in conversations
    )
    indexed_docs = sum(1 for f in files if f.get("status") == "indexed")

    return AnalyticsOverview(
        totalFiles=len(files),
        totalConversations=len(conversations),
        totalMessages=total_messages,
        indexedDocuments=indexed_docs,
    )
