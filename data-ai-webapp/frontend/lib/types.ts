export interface UserInfo {
  userId: string;
  userDetails: string;
  identityProvider: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  searchMode?: string;
  searchTop?: number;
  filterFolder?: string;
  filterTags?: string[];
}

export interface ChatResponse {
  conversationId: string;
  message: string;
  sources: string[];
}

export interface FileInfo {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  status: string;
  chunkCount: number;
  folderPath: string;
  tags: string[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsOverview {
  totalFiles: number;
  totalConversations: number;
  totalMessages: number;
  indexedDocuments: number;
}
