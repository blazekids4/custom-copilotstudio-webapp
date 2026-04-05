"use client";

const corpusStats = {
  totalWorks: 11,
  indexedWorks: 8,
  totalEstimatedWords: 185_000,
  audioHours: 4.2,
  genres: 4,
  yearSpan: "2015–2024",
};

const themeData = [
  { theme: "Isolation / Solitude", percentage: 78, peakPeriod: "2018–2020" },
  { theme: "Nature as metaphor", percentage: 65, peakPeriod: "Throughout" },
  { theme: "Family & memory", percentage: 52, peakPeriod: "2019–2022" },
  { theme: "Urban displacement", percentage: 34, peakPeriod: "2015–2017" },
  { theme: "Language & communication", percentage: 28, peakPeriod: "2022–2024" },
  { theme: "Loss & grief", percentage: 45, peakPeriod: "2019–2021" },
];

const styleMetrics = [
  { label: "Avg. sentence length", value: "14.2 words", trend: "↓ shorter over time" },
  { label: "Dialogue ratio", value: "25%", trend: "↓ from 40% in 2015" },
  { label: "Point of view", value: "3rd limited (72%)", trend: "Consistent" },
  { label: "Tense preference", value: "Present (recent)", trend: "↑ shift from past tense" },
  { label: "Avg. work length", value: "4,200 words", trend: "→ stable" },
  { label: "Vocabulary richness", value: "0.72 TTR", trend: "↑ increasing" },
];

const recentActivity = [
  { action: "Generated poem", detail: "\"Low Tide\" — ocean imagery, 18 lines", date: "Apr 3" },
  { action: "Analyzed themes", detail: "Cross-corpus theme frequency report", date: "Apr 2" },
  { action: "Summarized collection", detail: "2019 short stories — 12 works", date: "Apr 1" },
  { action: "Uploaded audio", detail: "Voice-Memo-Story-Ideas.m4a (transcribing)", date: "Apr 3" },
  { action: "Created outline", detail: "Novella: \"Every Room I've Left\"", date: "Mar 30" },
];

export default function Analytics() {
  return (
    <>
      <div className="content-header">
        <h1>Corpus Insights</h1>
      </div>
      <div className="content-body">
        {/* Corpus overview stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Works</div>
            <div className="stat-value">{corpusStats.totalWorks}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Indexed</div>
            <div className="stat-value">{corpusStats.indexedWorks}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Est. Word Count</div>
            <div className="stat-value">{(corpusStats.totalEstimatedWords / 1000).toFixed(0)}K</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Audio Hours</div>
            <div className="stat-value">{corpusStats.audioHours}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Genres</div>
            <div className="stat-value">{corpusStats.genres}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Span</div>
            <div className="stat-value" style={{ fontSize: "1.4rem" }}>{corpusStats.yearSpan}</div>
          </div>
        </div>

        {/* Theme analysis */}
        <div className="insight-section">
          <h2 className="insight-title">🔍 Theme Frequency</h2>
          <div className="theme-list">
            {themeData.map((t) => (
              <div key={t.theme} className="theme-row">
                <div className="theme-label">
                  <span>{t.theme}</span>
                  <span className="theme-period">{t.peakPeriod}</span>
                </div>
                <div className="theme-bar-track">
                  <div className="theme-bar-fill" style={{ width: `${t.percentage}%` }} />
                </div>
                <span className="theme-pct">{t.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Style metrics */}
        <div className="insight-section">
          <h2 className="insight-title">✍️ Writing Style Metrics</h2>
          <div className="style-grid">
            {styleMetrics.map((s) => (
              <div key={s.label} className="style-card">
                <div className="style-label">{s.label}</div>
                <div className="style-value">{s.value}</div>
                <div className="style-trend">{s.trend}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="insight-section">
          <h2 className="insight-title">📋 Recent Activity</h2>
          <div className="activity-list">
            {recentActivity.map((a, i) => (
              <div key={i} className="activity-row">
                <div className="activity-info">
                  <span className="activity-action">{a.action}</span>
                  <span className="activity-detail">{a.detail}</span>
                </div>
                <span className="activity-date">{a.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
