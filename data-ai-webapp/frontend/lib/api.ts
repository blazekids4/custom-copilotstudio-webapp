import type {
  UserInfo,
  ChatResponse,
  FileInfo,
  ConversationSummary,
  AnalyticsOverview,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth (SWA built-in) ──────────────────────────────────────

export async function getUser(): Promise<UserInfo | null> {
  try {
    const res = await fetch("/.auth/me");
    const data = await res.json();
    const principal = data?.clientPrincipal;
    if (!principal) return null;
    return {
      userId: principal.userId,
      userDetails: principal.userDetails,
      identityProvider: principal.identityProvider,
    };
  } catch {
    return null;
  }
}

// ── Chat ─────────────────────────────────────────────────────

export async function sendMessage(
  message: string,
  conversationId?: string
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, conversationId }),
  });
}

export async function listConversations(): Promise<ConversationSummary[]> {
  return apiFetch<ConversationSummary[]>("/api/chat/conversations");
}

export async function deleteConversation(id: string): Promise<void> {
  await apiFetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
}

// ── Files ────────────────────────────────────────────────────

export async function uploadFile(file: File): Promise<{ fileId: string; fileName: string; status: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/files`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed ${res.status}: ${body}`);
  }
  return res.json();
}

export async function listFiles(): Promise<FileInfo[]> {
  return apiFetch<FileInfo[]>("/api/files");
}

export async function deleteFile(id: string): Promise<void> {
  await apiFetch(`/api/files/${id}`, { method: "DELETE" });
}

// ── Analytics ────────────────────────────────────────────────

export async function getAnalytics(): Promise<AnalyticsOverview> {
  return apiFetch<AnalyticsOverview>("/api/analytics");
}
