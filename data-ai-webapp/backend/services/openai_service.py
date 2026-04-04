"""Azure OpenAI service — chat completions and embeddings."""

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AsyncAzureOpenAI

from backend.config import settings


_token_provider = get_bearer_token_provider(
    DefaultAzureCredential(),
    "https://cognitiveservices.azure.com/.default",
)

_client = AsyncAzureOpenAI(
    azure_endpoint=settings.OPENAI_ENDPOINT,
    azure_ad_token_provider=_token_provider,
    api_version=settings.OPENAI_API_VERSION,
)


async def generate_embedding(text: str) -> list[float]:
    """Generate an embedding vector for the given text."""
    response = await _client.embeddings.create(
        input=text,
        model=settings.OPENAI_EMBEDDING_DEPLOYMENT,
    )
    return response.data[0].embedding


async def chat_completion(
    messages: list[dict], context: str = ""
) -> str:
    """Run a chat completion with optional RAG context."""
    system_prompt = (
        "You are a helpful AI assistant. "
        "Answer the user's question based on the provided context. "
        "If the context does not contain relevant information, say so clearly.\n\n"
    )
    if context:
        system_prompt += f"Context:\n{context}\n"

    full_messages = [{"role": "system", "content": system_prompt}] + messages

    response = await _client.chat.completions.create(
        model=settings.OPENAI_CHAT_DEPLOYMENT,
        messages=full_messages,
        temperature=0.7,
        max_tokens=2048,
    )
    return response.choices[0].message.content or ""
