"use client";

import { useState, useEffect, useRef } from "react";
import { listFiles, uploadFile, deleteFile, getFileDownloadUrl } from "@/lib/api";
import type { FileInfo } from "@/lib/types";

export default function FileBrowser() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [folderPath, setFolderPath] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = () => {
    listFiles().then(setFiles).catch(() => {});
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setUploading(true);
    try {
      for (const file of Array.from(selected)) {
        await uploadFile(file, folderPath, tags);
      }
      loadFiles();
      setFolderPath("");
      setTagInput("");
      setShowUploadForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    await deleteFile(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="content-header">
        <h1>Files</h1>
        <button
          className="btn btn-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "+ Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleUpload}
          style={{ display: "none" }}
        />
      </div>
      <div className="content-body">
        <div
          className="upload-area"
          onClick={() => setShowUploadForm(!showUploadForm)}
        >
          <p>Click to upload files</p>
          <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
            Supports PDF, DOCX, TXT, CSV, MD, JSON — up to 50 MB
          </p>
        </div>

        {showUploadForm && (
          <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <label style={{ fontSize: "0.85rem", minWidth: "60px" }}>Folder:</label>
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="e.g. reports/q1 (optional)"
                style={{ flex: 1, padding: "0.4rem 0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem" }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <label style={{ fontSize: "0.85rem", minWidth: "60px" }}>Tags:</label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. finance, quarterly, internal (comma-separated)"
                style={{ flex: 1, padding: "0.4rem 0.6rem", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.85rem" }}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Choose Files"}
            </button>
          </div>
        )}

        <div className="file-list">
          {files.map((f) => (
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
                <a
                  href={getFileDownloadUrl(f.id)}
                  className="btn btn-sm btn-secondary"
                  download
                >
                  Download
                </a>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(f.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {files.length === 0 && (
            <div className="loading">
              <p>No files uploaded yet</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
