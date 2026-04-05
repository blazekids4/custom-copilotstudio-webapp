"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { sendMessage, getConversation } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

interface ChatProps {
  conversationId?: string;
  onNewChat: () => void;
}

export default function Chat({ conversationId: initialConversationId, onNewChat }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [sending, setSending] = useState(false);
  const [showSearchOptions, setShowSearchOptions] = useState(false);
  const [searchMode, setSearchMode] = useState<string>("hybrid");
  const [searchTop, setSearchTop] = useState<number>(5);
  const [filterFolder, setFilterFolder] = useState("");
  const [filterTags, setFilterTags] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation history when a saved conversation is selected
  useEffect(() => {
    if (initialConversationId) {
      setConversationId(initialConversationId);
      getConversation(initialConversationId)
        .then((conv) => {
          setMessages(
            conv.messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
        })
        .catch(() => {
          setMessages([]);
        });
    } else {
      setMessages([]);
      setConversationId(undefined);
    }
  }, [initialConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);

    try {
      const tagList = filterTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const response = await sendMessage(text, conversationId, {
        searchMode,
        searchTop,
        filterFolder: filterFolder || undefined,
        filterTags: tagList.length > 0 ? tagList : undefined,
      });
      setConversationId(response.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.message,
          sources: response.sources,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(undefined);
    onNewChat();
  };

  return (
    <>
      <div className="content-header">
        <h1>Chat</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowSearchOptions(!showSearchOptions)}
          >
            ⚙ Search
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleNewChat}>
            + New Chat
          </button>
        </div>
      </div>
      {showSearchOptions && (
        <div style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
          fontSize: "0.85rem",
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            Mode:
            <select
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value)}
              style={{ padding: "0.25rem 0.4rem", borderRadius: "4px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
            >
              <option value="hybrid">Hybrid (keyword + vector)</option>
              <option value="vector">Vector (broad semantic)</option>
              <option value="keyword">Keyword (exact match)</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            Results:
            <select
              value={searchTop}
              onChange={(e) => setSearchTop(Number(e.target.value))}
              style={{ padding: "0.25rem 0.4rem", borderRadius: "4px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50 (broad)</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            Folder:
            <input
              type="text"
              value={filterFolder}
              onChange={(e) => setFilterFolder(e.target.value)}
              placeholder="e.g. reports/q1"
              style={{ width: "120px", padding: "0.25rem 0.4rem", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "0.85rem" }}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            Tags:
            <input
              type="text"
              value={filterTags}
              onChange={(e) => setFilterTags(e.target.value)}
              placeholder="finance, internal"
              style={{ width: "140px", padding: "0.25rem 0.4rem", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "0.85rem" }}
            />
          </label>
        </div>
      )}
      <div className="chat-container">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="loading">
              <p>Ask a question about your uploaded documents...</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              {msg.role === "assistant" ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
              {msg.sources && msg.sources.length > 0 && (
                <div className="message-sources">
                  Sources: {msg.sources.join(", ")}
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="message assistant">
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            disabled={sending}
          />
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={sending}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
