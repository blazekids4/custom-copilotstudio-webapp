"""Azure AI Foundry Agent Service — create, manage, and invoke agents."""

from azure.identity import DefaultAzureCredential
from azure.ai.agents import AgentsClient
from azure.ai.agents.models import ListSortOrder, ThreadMessageOptions, AgentThreadCreationOptions

from backend.config import settings


_credential = DefaultAzureCredential()

_agents_client: AgentsClient | None = None


def get_agents_client() -> AgentsClient:
    """Get or create a reusable AgentsClient instance."""
    global _agents_client
    if _agents_client is None:
        _agents_client = AgentsClient(
            endpoint=settings.FOUNDRY_PROJECT_ENDPOINT,
            credential=_credential,
        )
    return _agents_client


async def create_agent(
    name: str,
    instructions: str,
    model: str | None = None,
    tools: list | None = None,
) -> dict:
    """Create a Foundry agent and return its metadata."""
    client = get_agents_client()
    kwargs = {
        "model": model or settings.FOUNDRY_MODEL_DEPLOYMENT,
        "name": name,
        "instructions": instructions,
    }
    if tools:
        kwargs["tools"] = tools

    agent = client.create_agent(**kwargs)
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
    client = get_agents_client()

    if thread_id:
        # Reuse existing thread — add user message and run
        client.messages.create(
            thread_id=thread_id, role="user", content=message
        )
        run = client.runs.create_and_process(
            thread_id=thread_id, agent_id=agent_id
        )
    else:
        # Create a new thread with the user message and run in one call
        run = client.create_thread_and_process_run(
            agent_id=agent_id,
            thread=AgentThreadCreationOptions(
                messages=[ThreadMessageOptions(role="user", content=message)]
            ),
        )
        thread_id = run.thread_id

    if run.status == "failed":
        return {
            "threadId": thread_id,
            "status": "failed",
            "error": str(run.last_error),
            "response": "",
        }

    # Retrieve the latest assistant message
    messages = client.messages.list(
        thread_id=thread_id, order=ListSortOrder.DESCENDING
    )
    response_text = ""
    for msg in messages:
        if msg.role == "assistant" and msg.text_messages:
            response_text = msg.text_messages[-1].text.value
            break

    return {
        "threadId": thread_id,
        "status": "completed",
        "response": response_text,
    }


async def list_agents() -> list[dict]:
    """List all agents in the Foundry project."""
    client = get_agents_client()
    agents = client.list_agents()
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
    client = get_agents_client()
    client.delete_agent(agent_id)
