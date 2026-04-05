"use client";

import { useState, useEffect } from "react";
import { listConversations, deleteConversation } from "@/lib/api";
import type { ConversationSummary } from "@/lib/types";

type View = "chat" | "files" | "analytics";

interface SidebarProps {
  activeView: View;
  onNavigate: (view: View) => void;
  onSelectConversation: (id: string) => void;
  userName: string;
}

export default function Sidebar({ activeView, onNavigate, onSelectConversation, userName }: SidebarProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  useEffect(() => {
    listConversations().then(setConversations).catch(() => {});
  }, []);

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">Data AI App</div>

      <div className="nav-section">
        <div className="nav-section-label">Navigation</div>
        <div
          className={`nav-item ${activeView === "chat" ? "active" : ""}`}
          onClick={() => onNavigate("chat")}
        >
          💬 Chat
        </div>
        <div
          className={`nav-item ${activeView === "files" ? "active" : ""}`}
          onClick={() => onNavigate("files")}
        >
          📁 Files
        </div>
        <div
          className={`nav-item ${activeView === "analytics" ? "active" : ""}`}
          onClick={() => onNavigate("analytics")}
        >
          📊 Analytics
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-section-label">Recent Conversations</div>
        <div className="conversation-list">
          {conversations.slice(0, 10).map((c) => (
            <div
              key={c.id}
              className="conversation-item"
              onClick={() => onSelectConversation(c.id)}
            >
              <span className="conversation-title">{c.title}</span>
              <button
                className="btn btn-sm btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(c.id);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-bar">
        <span>{userName}</span>
        <a href="/.auth/logout">Sign out</a>
      </div>
    </aside>
  );
}
