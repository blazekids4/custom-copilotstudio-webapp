"""Chat router — RAG-powered multi-turn conversations."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException

from backend.auth import get_user_from_swa_headers
from backend.models.schemas import ChatRequest, ChatResponse
from backend.services import cosmos, search, openai_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest, request: Request):
    user = get_user_from_swa_headers(request)
    user_id = user["userId"]
    now = datetime.now(timezone.utc).isoformat()

    # Load or create conversation
    if body.conversationId:
        conversation = await cosmos.get_conversation(
            body.conversationId, user_id
        )
        if not conversation:
            return ChatResponse(
                conversationId=body.conversationId,
                message="Conversation not found.",
            )
    else:
        conversation = {
            "id": str(uuid.uuid4()),
            "userId": user_id,
            "title": body.message[:80],
            "messages": [],
            "createdAt": now,
            "updatedAt": now,
        }
        await cosmos.create_conversation(conversation)

    # Retrieve relevant documents using configured search mode
    search_results = await search.search_documents(
        body.message,
        user_id,
        top=body.searchTop,
        mode=body.searchMode,
        folder_path=body.filterFolder,
        tags=body.filterTags,
    )
    context = "\n\n---\n\n".join(
        f"[{doc['fileName']}]\n{doc['content']}" for doc in search_results
    )
    source_files = list({doc["fileName"] for doc in search_results})

    # Build message history for the LLM
    history = [
        {"role": m["role"], "content": m["content"]}
        for m in conversation.get("messages", [])[-10:]  # last 10 turns
    ]
    history.append({"role": "user", "content": body.message})

    # Generate response
    answer = await openai_service.chat_completion(history, context)

    # Persist messages
    conversation["messages"].append(
        {"role": "user", "content": body.message, "timestamp": now}
    )
    conversation["messages"].append(
        {"role": "assistant", "content": answer, "timestamp": now}
    )
    conversation["updatedAt"] = now
    await cosmos.update_conversation(conversation)

    return ChatResponse(
        conversationId=conversation["id"],
        message=answer,
        sources=source_files,
    )


@router.get("/conversations")
async def list_conversations(request: Request):
    user = get_user_from_swa_headers(request)
    conversations = await cosmos.list_conversations(user["userId"])
    return [
        {
            "id": c["id"],
            "title": c.get("title", "Untitled"),
            "messageCount": len(c.get("messages", [])),
            "createdAt": c.get("createdAt"),
            "updatedAt": c.get("updatedAt"),
        }
        for c in conversations
    ]


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, request: Request):
    user = get_user_from_swa_headers(request)
    await cosmos.delete_conversation(conversation_id, user["userId"])
    return {"status": "deleted"}


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, request: Request):
    user = get_user_from_swa_headers(request)
    conversation = await cosmos.get_conversation(
        conversation_id, user["userId"]
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "id": conversation["id"],
        "title": conversation.get("title", "Untitled"),
        "messages": [
            {
                "role": m["role"],
                "content": m["content"],
                "timestamp": m.get("timestamp"),
            }
            for m in conversation.get("messages", [])
        ],
        "createdAt": conversation.get("createdAt"),
        "updatedAt": conversation.get("updatedAt"),
    }
