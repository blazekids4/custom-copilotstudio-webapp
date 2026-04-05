"use client";

const demoFiles = [
  { id: "1", fileName: "Q1-Report.pdf", sizeBytes: 2_450_000, chunkCount: 34, uploadedAt: "2026-03-15T10:30:00Z", status: "indexed", folderPath: "reports/q1", tags: ["finance", "quarterly"] },
  { id: "2", fileName: "Company-Policy.docx", sizeBytes: 185_000, chunkCount: 12, uploadedAt: "2026-03-10T14:20:00Z", status: "indexed", folderPath: "/", tags: ["compliance", "internal"] },
  { id: "3", fileName: "Product-Roadmap.pptx", sizeBytes: 5_100_000, chunkCount: 28, uploadedAt: "2026-03-08T09:15:00Z", status: "indexed", folderPath: "product", tags: ["roadmap"] },
  { id: "4", fileName: "Customer-Feedback.csv", sizeBytes: 340_000, chunkCount: 8, uploadedAt: "2026-04-01T16:45:00Z", status: "processing", folderPath: "data", tags: ["customers"] },
  { id: "5", fileName: "Architecture-Diagram.md", sizeBytes: 12_000, chunkCount: 3, uploadedAt: "2026-04-02T08:00:00Z", status: "indexed", folderPath: "engineering", tags: ["architecture", "docs"] },
  { id: "6", fileName: "Financial-Summary.xlsx", sizeBytes: 890_000, chunkCount: 15, uploadedAt: "2026-04-03T11:30:00Z", status: "uploaded", folderPath: "reports/q1", tags: ["finance"] },
];

export default function FileBrowser() {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="content-header">
        <h1>Files</h1>
        <button className="btn btn-primary" disabled>
          + Upload
        </button>
      </div>
      <div className="content-body">
        <div className="upload-area">
          <p>Click to upload files</p>
          <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
            Supports PDF, DOCX, TXT, CSV, MD, JSON — up to 50 MB
          </p>
        </div>

        <div className="file-list">
          {demoFiles.map((f) => (
            <div key={f.id} className="file-item">
              <div className="file-info">
                <span className="file-name">{f.fileName}</span>
                <span className="file-meta">
                  {formatSize(f.sizeBytes)} · {f.chunkCount} chunks ·{" "}
                  {new Date(f.uploadedAt).toLocaleDateString()}
                  {f.folderPath && f.folderPath !== "/" && ` · 📁 ${f.folderPath}`}
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
                  Download
                </button>
                <button className="btn btn-sm btn-danger" disabled>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
