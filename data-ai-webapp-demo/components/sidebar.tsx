"use client";

type View = "chat" | "files" | "analytics";

interface SidebarProps {
  activeView: View;
  onNavigate: (view: View) => void;
}

const demoConversations = [
  { id: "1", title: "Q1 revenue summary" },
  { id: "2", title: "Compliance policy questions" },
  { id: "3", title: "Product roadmap analysis" },
];

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
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
          {demoConversations.map((c) => (
            <div key={c.id} className="conversation-item">
              <span className="conversation-title">{c.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="demo-badge">
        <span>Demo Mode</span>
      </div>

      <div className="auth-bar">
        <span>demo@contoso.com</span>
      </div>
    </aside>
  );
}
