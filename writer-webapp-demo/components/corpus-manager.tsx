"use client";

const corpusFiles = [
  { id: "1", fileName: "Short-Stories-2019.pdf", sizeBytes: 3_200_000, chunkCount: 48, uploadedAt: "2026-03-01T10:00:00Z", status: "indexed", folderPath: "fiction/short-stories", tags: ["fiction", "short-story", "2019"], fileType: "manuscript" },
  { id: "2", fileName: "Novel-Draft-2022.docx", sizeBytes: 12_400_000, chunkCount: 187, uploadedAt: "2026-03-02T14:30:00Z", status: "indexed", folderPath: "fiction/novels", tags: ["fiction", "novel", "draft", "2022"], fileType: "manuscript" },
  { id: "3", fileName: "Poetry-Collection.md", sizeBytes: 85_000, chunkCount: 22, uploadedAt: "2026-03-05T09:15:00Z", status: "indexed", folderPath: "poetry", tags: ["poetry", "collection"], fileType: "manuscript" },
  { id: "4", fileName: "Journal-2020.docx", sizeBytes: 420_000, chunkCount: 35, uploadedAt: "2026-03-08T11:00:00Z", status: "indexed", folderPath: "journals", tags: ["journal", "personal", "2020"], fileType: "notes" },
  { id: "5", fileName: "Writing-Notes-2019.md", sizeBytes: 62_000, chunkCount: 8, uploadedAt: "2026-03-08T11:30:00Z", status: "indexed", folderPath: "notes", tags: ["notes", "craft", "2019"], fileType: "notes" },
  { id: "6", fileName: "Audio-Journal-2023.mp3", sizeBytes: 45_600_000, chunkCount: 64, uploadedAt: "2026-03-12T16:00:00Z", status: "indexed", folderPath: "audio", tags: ["audio", "journal", "2023"], fileType: "audio" },
  { id: "7", fileName: "Workshop-Recording-Craft-Talk.wav", sizeBytes: 128_000_000, chunkCount: 95, uploadedAt: "2026-03-15T08:45:00Z", status: "indexed", folderPath: "audio", tags: ["audio", "workshop", "craft"], fileType: "audio" },
  { id: "8", fileName: "Unpublished-Essays-2021.pdf", sizeBytes: 1_800_000, chunkCount: 28, uploadedAt: "2026-03-18T13:20:00Z", status: "indexed", folderPath: "nonfiction/essays", tags: ["nonfiction", "essay", "2021"], fileType: "manuscript" },
  { id: "9", fileName: "Character-Sketches.docx", sizeBytes: 340_000, chunkCount: 14, uploadedAt: "2026-04-01T10:00:00Z", status: "processing", folderPath: "notes", tags: ["characters", "notes"], fileType: "notes" },
  { id: "10", fileName: "Voice-Memo-Story-Ideas.m4a", sizeBytes: 18_200_000, chunkCount: 0, uploadedAt: "2026-04-03T17:30:00Z", status: "transcribing", folderPath: "audio", tags: ["audio", "ideas"], fileType: "audio" },
  { id: "11", fileName: "Thesis-On-Southern-Gothic.pdf", sizeBytes: 2_100_000, chunkCount: 0, uploadedAt: "2026-04-04T09:00:00Z", status: "uploaded", folderPath: "nonfiction/academic", tags: ["nonfiction", "academic", "literary-criticism"], fileType: "manuscript" },
];

const fileTypeIcons: Record<string, string> = {
  manuscript: "📄",
  notes: "🗒️",
  audio: "🎙️",
};

export default function CorpusManager() {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const indexedCount = corpusFiles.filter((f) => f.status === "indexed").length;
  const totalWords = "~185,000";

  return (
    <>
      <div className="content-header">
        <h1>Corpus Library</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary btn-sm" disabled>
            🎙️ Record Audio
          </button>
          <button className="btn btn-primary" disabled>
            + Upload Writing
          </button>
        </div>
      </div>
      <div className="content-body">
        <div className="corpus-summary">
          <div className="corpus-stat">
            <span className="corpus-stat-value">{corpusFiles.length}</span>
            <span className="corpus-stat-label">Works</span>
          </div>
          <div className="corpus-stat">
            <span className="corpus-stat-value">{indexedCount}</span>
            <span className="corpus-stat-label">Indexed</span>
          </div>
          <div className="corpus-stat">
            <span className="corpus-stat-value">{totalWords}</span>
            <span className="corpus-stat-label">Est. Words</span>
          </div>
          <div className="corpus-stat">
            <span className="corpus-stat-value">3</span>
            <span className="corpus-stat-label">Audio Files</span>
          </div>
        </div>

        <div className="upload-area">
          <p>📥 Drop manuscripts, journals, audio files, or notes here</p>
          <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
            Supports PDF, DOCX, TXT, MD, MP3, WAV, M4A, FLAC — up to 200 MB per file
          </p>
          <p style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--text-muted)" }}>
            Audio files will be automatically transcribed and indexed
          </p>
        </div>

        <div className="file-list">
          {corpusFiles.map((f) => (
            <div key={f.id} className="file-item">
              <div className="file-info">
                <span className="file-name">
                  {fileTypeIcons[f.fileType] || "📄"} {f.fileName}
                </span>
                <span className="file-meta">
                  {formatSize(f.sizeBytes)} · {f.chunkCount > 0 ? `${f.chunkCount} chunks` : "pending"} ·{" "}
                  {new Date(f.uploadedAt).toLocaleDateString()}
                  {f.folderPath && ` · 📁 ${f.folderPath}`}
                </span>
                {f.tags && f.tags.length > 0 && (
                  <span className="file-meta">
                    {f.tags.map((tag) => `#${tag}`).join(" ")}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className={`file-status ${f.status}`}>{f.status}</span>
                <button className="btn btn-sm btn-secondary" disabled>
                  Preview
                </button>
                <button className="btn btn-sm btn-danger" disabled>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
