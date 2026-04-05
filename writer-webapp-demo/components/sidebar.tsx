"use client";

type View = "chat" | "corpus" | "analytics";

interface SidebarProps {
  activeView: View;
  onNavigate: (view: View) => void;
}

const recentSessions = [
  { id: "1", title: "Summarize 2019 short stories" },
  { id: "2", title: "Generate poem from journal entries" },
  { id: "3", title: "Analyze recurring themes" },
  { id: "4", title: "Novella outline from audio notes" },
];

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">✍️ Writer's Studio</div>

      <div className="nav-section">
        <div className="nav-section-label">Workspace</div>
        <div
          className={`nav-item ${activeView === "chat" ? "active" : ""}`}
          onClick={() => onNavigate("chat")}
        >
          🪶 Writing Assistant
        </div>
        <div
          className={`nav-item ${activeView === "corpus" ? "active" : ""}`}
          onClick={() => onNavigate("corpus")}
        >
          📚 Corpus Library
        </div>
        <div
          className={`nav-item ${activeView === "analytics" ? "active" : ""}`}
          onClick={() => onNavigate("analytics")}
        >
          📊 Corpus Insights
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-section-label">Recent Sessions</div>
        <div className="conversation-list">
          {recentSessions.map((s) => (
            <div key={s.id} className="conversation-item">
              <span className="conversation-title">{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="demo-badge">
        <span>Demo Mode</span>
      </div>

      <div className="auth-bar">
        <span>writer@studio.local</span>
      </div>
    </aside>
  );
}
