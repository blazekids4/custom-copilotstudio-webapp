"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { sendMessage, resetConversation } from "@/lib/copilot-api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface UserSession {
  sessionId: string;
  displayName: string;
  email: string;
}

export default function Chat({
  session,
  onLogout,
}: {
  session: UserSession;
  onLogout: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const data = await sendMessage(text, session.sessionId);
      const reply = data.responses.join("\n\n") || "(no response)";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ Error: ${errorMsg}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    await resetConversation(session.sessionId);
    setMessages([]);
  }

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div>
          <h1>Custom Copilot Studio Agent</h1>
          <span className="user-info">
            Signed in as{" "}
            <strong>{session.displayName || session.email}</strong>
          </span>
        </div>
        <div className="header-actions">
          <button onClick={handleReset} className="btn btn-secondary">
            New Chat
          </button>
          <button onClick={onLogout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </header>

      <div className="messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>
              Ask a question and the Copilot Studio agent will answer using your
              SharePoint knowledge base.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-label">
              {msg.role === "user" ? "You" : "Copilot"}
            </div>
            <div className="message-content">
              {msg.role === "assistant" ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-label">Copilot</div>
            <div className="message-content typing">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question…"
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn btn-primary"
        >
          Send
        </button>
      </form>
    </div>
  );
}
