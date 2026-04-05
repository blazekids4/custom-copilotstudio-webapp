"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import Chat from "@/components/chat";
import FileBrowser from "@/components/file-browser";
import Analytics from "@/components/analytics";

type View = "chat" | "files" | "analytics";

export default function Home() {
  const [activeView, setActiveView] = useState<View>("chat");

  return (
    <div className="app-layout">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <div className="main-content">
        {activeView === "chat" && <Chat />}
        {activeView === "files" && <FileBrowser />}
        {activeView === "analytics" && <Analytics />}
      </div>
    </div>
  );
}
