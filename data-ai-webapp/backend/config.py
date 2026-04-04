import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Azure Blob Storage
    STORAGE_ACCOUNT_URL: str = os.getenv("AZURE_STORAGE_ACCOUNT_URL", "")
    STORAGE_CONTAINER: str = os.getenv("AZURE_STORAGE_CONTAINER", "uploads")

    # Azure AI Search
    SEARCH_ENDPOINT: str = os.getenv("AZURE_SEARCH_ENDPOINT", "")
    SEARCH_INDEX: str = os.getenv("AZURE_SEARCH_INDEX", "documents")

    # Azure Cosmos DB
    COSMOS_ENDPOINT: str = os.getenv("AZURE_COSMOS_ENDPOINT", "")
    COSMOS_DATABASE: str = os.getenv("AZURE_COSMOS_DATABASE", "appdb")
    COSMOS_CONTAINER_CONVERSATIONS: str = os.getenv(
        "AZURE_COSMOS_CONTAINER_CONVERSATIONS", "conversations"
    )
    COSMOS_CONTAINER_FILES: str = os.getenv(
        "AZURE_COSMOS_CONTAINER_FILES", "files"
    )

    # Azure OpenAI
    OPENAI_ENDPOINT: str = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    OPENAI_CHAT_DEPLOYMENT: str = os.getenv(
        "AZURE_OPENAI_CHAT_DEPLOYMENT", "gpt-4-1"
    )
    OPENAI_CHAT_MINI_DEPLOYMENT: str = os.getenv(
        "AZURE_OPENAI_CHAT_MINI_DEPLOYMENT", "gpt-5-nano-dz"
    )
    OPENAI_EMBEDDING_DEPLOYMENT: str = os.getenv(
        "AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-3-large"
    )
    OPENAI_API_VERSION: str = os.getenv(
        "AZURE_OPENAI_API_VERSION", "2024-12-01-preview"
    )

    # Azure AI Foundry
    FOUNDRY_PROJECT_ENDPOINT: str = os.getenv(
        "FOUNDRY_PROJECT_ENDPOINT", ""
    )
    FOUNDRY_MODEL_DEPLOYMENT: str = os.getenv(
        "FOUNDRY_MODEL_DEPLOYMENT_NAME", "gpt-4-1"
    )

    # Server
    PORT: int = int(os.getenv("PORT", "8080"))
    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000"
    ).split(",")


settings = Settings()
