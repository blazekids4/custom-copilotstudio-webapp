"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

const demoResponses: Record<string, { content: string; sources: string[] }> = {
  default: {
    content:
      "Based on the documents in your knowledge base, I can help answer questions about your uploaded files. This is a **demo preview** — in the live version, responses are powered by Azure OpenAI with RAG over your indexed documents.\n\nTry asking about:\n- Revenue trends\n- Policy summaries\n- Document comparisons",
    sources: ["Q1-Report.pdf", "Company-Policy.docx"],
  },
  revenue: {
    content:
      "According to **Q1-Report.pdf**, total revenue for Q1 was **$4.2M**, representing a **12% increase** over the previous quarter.\n\nKey drivers:\n- Enterprise licensing grew 18%\n- Professional services remained flat\n- New customer acquisition contributed $800K",
    sources: ["Q1-Report.pdf", "Financial-Summary.xlsx"],
  },
  policy: {
    content:
      "The **Company-Policy.docx** outlines the following key areas:\n\n1. **Data Handling** — All customer data must be encrypted at rest and in transit\n2. **Access Control** — Role-based access with quarterly reviews\n3. **Incident Response** — 24-hour notification window for security incidents\n4. **Retention** — Documents retained for 7 years per regulatory requirements",
    sources: ["Company-Policy.docx"],
  },
};

function getDemoResponse(input: string) {
  const lower = input.toLowerCase();
  if (lower.includes("revenue") || lower.includes("q1") || lower.includes("financial")) {
    return demoResponses.revenue;
  }
  if (lower.includes("policy") || lower.includes("compliance") || lower.includes("security")) {
    return demoResponses.policy;
  }
  return demoResponses.default;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSearchOptions, setShowSearchOptions] = useState(false);
  const [searchMode, setSearchMode] = useState("hybrid");
  const [searchTop, setSearchTop] = useState(5);
  const [filterFolder, setFilterFolder] = useState("");
  const [filterTags, setFilterTags] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1200));

    const response = getDemoResponse(text);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: response.content, sources: response.sources },
    ]);
    setSending(false);
  };

  const handleNewChat = () => {
    setMessages([]);
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
        <div
          style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
            fontSize: "0.85rem",
          }}
        >
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
                <div className="message-sources">Sources: {msg.sources.join(", ")}</div>
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
            placeholder="Type your message... (try: revenue, policy)"
            disabled={sending}
          />
          <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
            Send
          </button>
        </div>
      </div>
    </>
  );
}
