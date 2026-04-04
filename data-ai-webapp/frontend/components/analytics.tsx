"use client";

import { useState, useEffect } from "react";
import { getAnalytics } from "@/lib/api";
import type { AnalyticsOverview } from "@/lib/types";

export default function Analytics() {
  const [stats, setStats] = useState<AnalyticsOverview | null>(null);

  useEffect(() => {
    getAnalytics().then(setStats).catch(() => {});
  }, []);

  return (
    <>
      <div className="content-header">
        <h1>Analytics</h1>
      </div>
      <div className="content-body">
        {!stats ? (
          <div className="loading">
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span className="loading-dot" />
          </div>
        ) : (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Files</div>
              <div className="stat-value">{stats.totalFiles}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Indexed Documents</div>
              <div className="stat-value">{stats.indexedDocuments}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Conversations</div>
              <div className="stat-value">{stats.totalConversations}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Messages</div>
              <div className="stat-value">{stats.totalMessages}</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
