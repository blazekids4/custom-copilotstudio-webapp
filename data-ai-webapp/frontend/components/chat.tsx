"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { sendMessage } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
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

    try {
      const response = await sendMessage(text, conversationId);
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
  };

  return (
    <>
      <div className="content-header">
        <h1>Chat</h1>
        <button className="btn btn-secondary btn-sm" onClick={handleNewChat}>
          + New Chat
        </button>
      </div>
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
