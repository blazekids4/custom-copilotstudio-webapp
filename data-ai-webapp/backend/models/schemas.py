from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    conversationId: str | None = None
    searchMode: str = "hybrid"  # "hybrid" | "vector" | "keyword"
    searchTop: int = 5
    filterFolder: str | None = None
    filterTags: list[str] | None = None


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatResponse(BaseModel):
    conversationId: str
    message: str
    sources: list[str] = []


class FileMetadata(BaseModel):
    id: str
    userId: str
    fileName: str
    contentType: str
    sizeBytes: int
    uploadedAt: str
    status: str  # "uploaded" | "processing" | "indexed" | "error"
    chunkCount: int = 0


class FileUploadResponse(BaseModel):
    fileId: str
    fileName: str
    status: str


class AnalyticsOverview(BaseModel):
    totalFiles: int
    totalConversations: int
    totalMessages: int
    indexedDocuments: int


class ConversationSummary(BaseModel):
    id: str
    title: str
    messageCount: int
    createdAt: str
    updatedAt: str
