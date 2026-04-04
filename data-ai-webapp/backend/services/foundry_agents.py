"""Azure AI Foundry Agent Service — create, manage, and invoke agents."""

from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.agents.models import ListSortOrder

from backend.config import settings


_credential = DefaultAzureCredential()

_project_client: AIProjectClient | None = None


def get_project_client() -> AIProjectClient:
    """Get or create a reusable AIProjectClient instance."""
    global _project_client
    if _project_client is None:
        _project_client = AIProjectClient(
            endpoint=settings.FOUNDRY_PROJECT_ENDPOINT,
            credential=_credential,
        )
    return _project_client


async def create_agent(
    name: str,
    instructions: str,
    model: str | None = None,
    tools: list | None = None,
) -> dict:
    """Create a Foundry agent and return its metadata."""
    client = get_project_client()
    kwargs = {
        "model": model or settings.FOUNDRY_MODEL_DEPLOYMENT,
        "name": name,
        "instructions": instructions,
    }
    if tools:
        kwargs["tools"] = tools

    agent = client.agents.create_agent(**kwargs)
    return {
        "agentId": agent.id,
        "name": agent.name,
        "model": agent.model,
    }


async def run_agent_turn(
    agent_id: str, message: str, thread_id: str | None = None
) -> dict:
    """Send a message to an agent and return the response.

    Creates a new thread if thread_id is not provided.
    """
    client = get_project_client()

    # Create or reuse thread
    if thread_id:
        thread = client.agents.threads.get(thread_id)
    else:
        thread = client.agents.threads.create()

    # Post user message
    client.agents.messages.create(
        thread_id=thread.id, role="user", content=message
    )

    # Run the agent
    run = client.agents.runs.create_and_process(
        thread_id=thread.id, agent_id=agent_id
    )

    if run.status == "failed":
        return {
            "threadId": thread.id,
            "status": "failed",
            "error": str(run.last_error),
            "response": "",
        }

    # Retrieve the latest assistant message
    messages = client.agents.messages.list(
        thread_id=thread.id, order=ListSortOrder.DESCENDING
    )
    response_text = ""
    for msg in messages:
        if msg.role == "assistant" and msg.text_messages:
            response_text = msg.text_messages[-1].text.value
            break

    return {
        "threadId": thread.id,
        "status": "completed",
        "response": response_text,
    }


async def list_agents() -> list[dict]:
    """List all agents in the Foundry project."""
    client = get_project_client()
    agents = client.agents.list_agents()
    return [
        {
            "agentId": a.id,
            "name": a.name,
            "model": a.model,
        }
        for a in agents
    ]


async def delete_agent(agent_id: str) -> None:
    """Delete an agent by ID."""
    client = get_project_client()
    client.agents.delete_agent(agent_id)
