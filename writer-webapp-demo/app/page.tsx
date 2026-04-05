"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import Chat from "@/components/chat";
import CorpusManager from "@/components/corpus-manager";
import Analytics from "@/components/analytics";

type View = "chat" | "corpus" | "analytics";

export default function Home() {
  const [activeView, setActiveView] = useState<View>("chat");

  return (
    <div className="app-layout">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <div className="main-content">
        {activeView === "chat" && <Chat />}
        {activeView === "corpus" && <CorpusManager />}
        {activeView === "analytics" && <Analytics />}
      </div>
    </div>
  );
}
