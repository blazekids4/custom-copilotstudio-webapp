"use client";

import { useState, useEffect } from "react";
import { getUser } from "@/lib/api";
import type { UserInfo } from "@/lib/types";
import Sidebar from "@/components/sidebar";
import Chat from "@/components/chat";
import FileBrowser from "@/components/file-browser";
import Analytics from "@/components/analytics";

type View = "chat" | "files" | "analytics";

export default function Home() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>("chat");
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();

  useEffect(() => {
    getUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setActiveView("chat");
  };

  const handleNewChat = () => {
    setSelectedConversationId(undefined);
    setActiveView("chat");
  };

  if (loading) {
    return (
      <div className="loading">
        <span className="loading-dot" />
        <span className="loading-dot" />
        <span className="loading-dot" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="loading">
        <p>Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        onSelectConversation={handleSelectConversation}
        userName={user.userDetails}
      />
      <div className="main-content">
        {activeView === "chat" && (
          <Chat
            conversationId={selectedConversationId}
            onNewChat={handleNewChat}
          />
        )}
        {activeView === "files" && <FileBrowser />}
        {activeView === "analytics" && <Analytics />}
      </div>
    </div>
  );
}
