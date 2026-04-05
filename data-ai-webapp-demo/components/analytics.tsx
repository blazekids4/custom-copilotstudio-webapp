"use client";

const demoStats = {
  totalFiles: 6,
  indexedDocuments: 4,
  totalConversations: 23,
  totalMessages: 147,
};

export default function Analytics() {
  return (
    <>
      <div className="content-header">
        <h1>Analytics</h1>
      </div>
      <div className="content-body">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Files</div>
            <div className="stat-value">{demoStats.totalFiles}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Indexed Documents</div>
            <div className="stat-value">{demoStats.indexedDocuments}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Conversations</div>
            <div className="stat-value">{demoStats.totalConversations}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Messages</div>
            <div className="stat-value">{demoStats.totalMessages}</div>
          </div>
        </div>
      </div>
    </>
  );
}
