"""Agents router — Foundry Agent Service CRUD and invocation."""

from fastapi import APIRouter, Request
from pydantic import BaseModel

from backend.auth import get_user_from_swa_headers
from backend.services import foundry_agents

router = APIRouter(prefix="/api/agents", tags=["agents"])


class CreateAgentRequest(BaseModel):
    name: str
    instructions: str
    model: str | None = None


class AgentMessageRequest(BaseModel):
    agentId: str
    message: str
    threadId: str | None = None


@router.post("")
async def create_agent(body: CreateAgentRequest, request: Request):
    get_user_from_swa_headers(request)  # auth check
    return await foundry_agents.create_agent(
        name=body.name,
        instructions=body.instructions,
        model=body.model,
    )


@router.get("")
async def list_agents(request: Request):
    get_user_from_swa_headers(request)
    return await foundry_agents.list_agents()


@router.post("/chat")
async def chat_with_agent(body: AgentMessageRequest, request: Request):
    get_user_from_swa_headers(request)
    return await foundry_agents.run_agent_turn(
        agent_id=body.agentId,
        message=body.message,
        thread_id=body.threadId,
    )


@router.delete("/{agent_id}")
async def delete_agent(agent_id: str, request: Request):
    get_user_from_swa_headers(request)
    await foundry_agents.delete_agent(agent_id)
    return {"status": "deleted"}
