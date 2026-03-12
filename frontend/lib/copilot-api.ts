const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3978";

export interface ChatResponse {
  responses: string[];
  suggestedActions: string[];
  sessionId: string;
  conversationId: string | null;
}

/**
 * Send a chat message to the Python backend which proxies it to Copilot Studio.
 * The backend holds the user's token (acquired via auth code exchange) and uses
 * it to call the Copilot Studio agent on behalf of the user.
 */
export async function sendMessage(
  message: string,
  sessionId: string
): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Backend error ${res.status}`);
  }

  return res.json();
}

/**
 * Reset the conversation so the next message starts a fresh session.
 */
export async function resetConversation(sessionId: string): Promise<void> {
  await fetch(`${API_URL}/api/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}
