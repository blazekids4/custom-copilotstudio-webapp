"use client";

import { useEffect, useState } from "react";
import Chat from "@/components/chat";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? window.location.origin : "");

interface UserSession {
  sessionId: string;
  displayName: string;
  email: string;
}

export default function Home() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // 1. Check if we already have a session in sessionStorage
    const saved = sessionStorage.getItem("copilot_session");
    if (saved) {
      setSession(JSON.parse(saved));
      setLoading(false);
      return;
    }

    // 2. Check if Entra ID redirected back with an authorization code
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      // Clean up the URL immediately (remove ?code=...&state=... etc.)
      window.history.replaceState({}, "", "/");
      exchangeCode(code);
    } else {
      setLoading(false);
    }
  }, []);

  async function exchangeCode(code: string) {
    try {
      const res = await fetch(`${API_URL}/api/auth/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.errorDescription ?? err.error ?? "Authentication failed"
        );
      }

      const data: UserSession = await res.json();
      sessionStorage.setItem("copilot_session", JSON.stringify(data));
      setSession(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`);
      const { authUrl } = await res.json();
      window.location.href = authUrl;
    } catch {
      setError("Could not reach the backend. Is the server running?");
    }
  }

  function handleLogout() {
    if (session) {
      fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
    }
    sessionStorage.removeItem("copilot_session");
    setSession(null);
  }

  if (loading) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <p>Authenticating…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>Authentication Error</h1>
          <p style={{ color: "#dc2626" }}>{error}</p>
          <button onClick={handleLogin} className="btn btn-primary btn-login">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>Custom Copilot Studio Agent</h1>
          <p>
            Sign in with your Microsoft 365 account to chat with the Copilot
            Studio agent powered by your SharePoint knowledge base.
          </p>
          <button onClick={handleLogin} className="btn btn-primary btn-login">
            Sign in with Microsoft
          </button>
        </div>
      </div>
    );
  }

  return <Chat session={session} onLogout={handleLogout} />;
}
