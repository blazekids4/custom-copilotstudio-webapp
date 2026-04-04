"use client";

import { useState, useEffect, useRef } from "react";
import { listFiles, uploadFile, deleteFile } from "@/lib/api";
import type { FileInfo } from "@/lib/types";

export default function FileBrowser() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [uploading, setUploading] = useState(false);
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

    setUploading(true);
    try {
      for (const file of Array.from(selected)) {
        await uploadFile(file);
      }
      loadFiles();
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
          onClick={() => fileInputRef.current?.click()}
        >
          <p>Click or drag files here to upload</p>
          <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
            Supports TXT, CSV, MD, JSON — up to 50 MB
          </p>
        </div>

        <div className="file-list">
          {files.map((f) => (
            <div key={f.id} className="file-item">
              <div className="file-info">
                <span className="file-name">{f.fileName}</span>
                <span className="file-meta">
                  {formatSize(f.sizeBytes)} · {f.chunkCount} chunks ·{" "}
                  {new Date(f.uploadedAt).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className={`file-status ${f.status}`}>{f.status}</span>
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
