"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

type CreativeMode = "summarize" | "analyze" | "generate" | "open";

const modeLabels: Record<CreativeMode, string> = {
  summarize: "📝 Summarize",
  analyze: "🔍 Analyze",
  generate: "✨ Generate",
  open: "💬 Open Chat",
};

const demoResponses: Record<string, { content: string; sources: string[] }> = {
  default: {
    content:
      "I'm your AI writing companion. I have access to your full corpus — manuscripts, journal entries, audio transcripts, and notes. This is a **demo preview**; in the live version, responses are powered by Azure OpenAI with RAG over your indexed writings.\n\nTry asking me to:\n- **Summarize** a collection of stories or journal entries\n- **Analyze** recurring themes, tone, or character arcs across your work\n- **Generate** a new short story, poem, or novella outline inspired by your past writing\n- **Compare** voice and style across different periods of your work",
    sources: ["Journal-2019.docx", "Short-Stories-Collection.pdf"],
  },
  summarize: {
    content:
      "Here's a summary of your **2019 short story collection** (12 stories, ~48,000 words):\n\n**Dominant Themes:** Isolation, reconciliation, landscapes as emotional mirrors\n\n**Narrative Style:** Predominantly third-person limited, present tense. Average story length: 4,000 words.\n\n**Key Stories:**\n- *The Orchard Keeper* — A widow returns to her family farm; themes of generational memory\n- *Salt Water* — Two estranged siblings meet at a coastal funeral; sparse dialogue, lyrical imagery\n- *Night Shift* — A factory worker's interior monologue; Kafka-esque undertones\n\n**Overall Arc:** The collection moves from *loss* to *tentative reconnection*, with natural settings acting as catalysts for emotional revelation.",
    sources: ["Short-Stories-2019.pdf", "Writing-Notes-2019.md"],
  },
  analyze: {
    content:
      "**Thematic Analysis across your corpus (2015–2024):**\n\n| Theme | Frequency | Peak Period | Key Works |\n|-------|-----------|-------------|-----------|\n| Isolation / Solitude | 78% of works | 2018–2020 | *Night Shift*, *The Lighthouse* |\n| Nature as metaphor | 65% | Throughout | *The Orchard Keeper*, *Salt Water* |\n| Family & memory | 52% | 2019–2022 | *Bloodlines*, *What We Carry* |\n| Urban displacement | 34% | 2015–2017 | *Concrete Garden*, *Exit Row* |\n\n**Stylistic Observations:**\n- Your sentence length has decreased by ~20% since 2018 (more concise prose)\n- Dialogue-to-narration ratio shifted from 40:60 to 25:75\n- Audio transcripts from 2023 show a return to longer, more reflective cadences\n\n**Recurring Motifs:** Windows, tidal patterns, shared meals, unanswered letters",
    sources: ["Short-Stories-2019.pdf", "Novel-Draft-2022.docx", "Audio-Journal-2023.mp3", "Poetry-Collection.md"],
  },
  generate_poem: {
    content:
      "Based on the imagery and cadence found in your poetry collection and journal entries, here's a new poem in your voice:\n\n---\n\n**Low Tide**\n\nThe rocks remember what the water forgets —\neach retreat leaves salt in the crevices,\nwhite lines like sentences\nnever finished.\n\nI stood here once with someone\nwhose name the wind has taken.\nWe watched the cormorants\ndive and surface, dive and surface,\nas if practice could perfect\nthe art of disappearing.\n\nNow the tide pools hold\nsmall bright worlds entire:\nanemone, barnacle, the slow\npurple patience of a mussel\nopening to believe\nin the return of the sea.\n\n---\n\n*Style notes: Uses your characteristic nature-as-emotion-mirror pattern, spare punctuation, and the estranged-relationship motif from your 2019–2022 period.*",
    sources: ["Poetry-Collection.md", "Journal-2020.docx"],
  },
  generate_story: {
    content:
      "Here's a **short story outline** generated from patterns in your corpus:\n\n---\n\n**Title:** *The Cartographer's Daughter*\n\n**Premise:** A woman inherits her late father's study — filled with hand-drawn maps of places that don't exist. As she catalogs them, she realizes each map corresponds to a pivotal moment in their fractured relationship.\n\n**Structure:** 5 sections, ~5,000 words\n1. **The Study** — Discovery of the maps; establishing the father's absence\n2. **Coastline, Unnamed** — A map matching the beach where she last saw him; flashback to a childhood argument\n3. **Interior, with Rivers** — A map of her mother's hometown; the divorce, age 11\n4. **Elevation** — Mountain terrain matching his final letter; the words he couldn't say aloud\n5. **True North** — She draws her own map; the first place that's hers alone\n\n**Tone:** Reflective, restrained. Mirrors your *Orchard Keeper* pacing with the structural innovation of *Salt Water*.\n\n**Recommended voice:** Third-person limited, past tense (a departure from your recent present-tense work, fitting the memorial quality).\n\n---\n\n*Shall I draft the opening paragraph, or adjust the premise?*",
    sources: ["Short-Stories-2019.pdf", "Novel-Draft-2022.docx", "Writing-Notes-2019.md"],
  },
  novella: {
    content:
      "**Novella Concept** drawn from your audio journals and manuscript drafts:\n\n---\n\n**Title:** *Every Room I've Left*\n\n**Length:** ~25,000 words (target)\n\n**Synopsis:** Three interconnected narratives, each set in a different rented room across a decade. A translator in Lisbon who loses her native language. A night-shift nurse in Chicago cataloging patients' last words. A retired teacher in rural Oregon who begins writing letters to her younger self. They never meet — but their stories rhyme.\n\n**Thematic DNA from your corpus:**\n- The *rooms* motif from your 2023 audio journals (\"I keep dreaming of doorways\")\n- The *language and loss* thread from *Night Shift* and *Exit Row*\n- The *letter-writing* pattern recurring in 14 of your works\n\n**Structural Approach:**\n- Rotating POV chapters (≈3,000 words each)\n- No shared timeline — resonance through imagery, not plot\n- Final chapter weaves a single shared image: an open window at dawn\n\n---\n\n*I can draft a chapter outline, write a sample opening, or refine any part of this concept.*",
    sources: ["Audio-Journal-2023.mp3", "Novel-Draft-2022.docx", "Short-Stories-2019.pdf", "Journal-2020.docx"],
  },
};

function getDemoResponse(input: string, mode: CreativeMode) {
  const lower = input.toLowerCase();

  if (mode === "summarize" || lower.includes("summar")) {
    return demoResponses.summarize;
  }
  if (mode === "analyze" || lower.includes("theme") || lower.includes("analy") || lower.includes("pattern") || lower.includes("style")) {
    return demoResponses.analyze;
  }
  if (lower.includes("poem") || lower.includes("poetry") || lower.includes("verse")) {
    return demoResponses.generate_poem;
  }
  if (lower.includes("novella") || lower.includes("novel") || lower.includes("long")) {
    return demoResponses.novella;
  }
  if (mode === "generate" || lower.includes("story") || lower.includes("short") || lower.includes("write") || lower.includes("generate") || lower.includes("create") || lower.includes("idea")) {
    return demoResponses.generate_story;
  }
  return demoResponses.default;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [creativeMode, setCreativeMode] = useState<CreativeMode>("open");
  const [showOptions, setShowOptions] = useState(false);
  const [corpusScope, setCorpusScope] = useState("all");
  const [yearRange, setYearRange] = useState("all");
  const [genreFilter, setGenreFilter] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);

    await new Promise((r) => setTimeout(r, 1400));

    const response = getDemoResponse(text, creativeMode);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: response.content, sources: response.sources },
    ]);
    setSending(false);
  };

  const handleNewChat = () => {
    setMessages([]);
  };

  return (
    <>
      <div className="content-header">
        <h1>Writing Assistant</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div className="mode-switcher">
            {(Object.keys(modeLabels) as CreativeMode[]).map((m) => (
              <button
                key={m}
                className={`mode-btn ${creativeMode === m ? "active" : ""}`}
                onClick={() => setCreativeMode(m)}
              >
                {modeLabels[m]}
              </button>
            ))}
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowOptions(!showOptions)}
          >
            ⚙ Scope
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleNewChat}>
            + New Session
          </button>
        </div>
      </div>
      {showOptions && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
            fontSize: "0.85rem",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            Corpus:
            <select
              value={corpusScope}
              onChange={(e) => setCorpusScope(e.target.value)}
              style={{ padding: "0.25rem 0.4rem", borderRadius: "4px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
            >
              <option value="all">All works</option>
              <option value="fiction">Fiction only</option>
              <option value="poetry">Poetry only</option>
              <option value="journals">Journals & notes</option>
              <option value="audio">Audio transcripts</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            Period:
            <select
              value={yearRange}
              onChange={(e) => setYearRange(e.target.value)}
              style={{ padding: "0.25rem 0.4rem", borderRadius: "4px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
            >
              <option value="all">All years</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2020-2022">2020–2022</option>
              <option value="2015-2019">2015–2019</option>
              <option value="pre-2015">Pre-2015</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            Genre:
            <input
              type="text"
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              placeholder="e.g. thriller, literary"
              style={{ width: "140px", padding: "0.25rem 0.4rem", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "0.85rem" }}
            />
          </label>
        </div>
      )}
      <div className="chat-container">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🪶</div>
              <h2>Your AI Writing Companion</h2>
              <p>Ask me to summarize, analyze, or generate new work from your corpus.</p>
              <div className="prompt-suggestions">
                <button className="prompt-chip" onClick={() => { setInput("Summarize my 2019 short story collection"); }}>
                  Summarize my 2019 stories
                </button>
                <button className="prompt-chip" onClick={() => { setInput("What themes recur across all my writing?"); }}>
                  Analyze recurring themes
                </button>
                <button className="prompt-chip" onClick={() => { setInput("Write a poem in my voice about the ocean"); }}>
                  Generate a poem
                </button>
                <button className="prompt-chip" onClick={() => { setInput("Create a novella outline from my audio journals"); }}>
                  Novella from audio notes
                </button>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              {msg.role === "assistant" ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                msg.content
              )}
              {msg.sources && msg.sources.length > 0 && (
                <div className="message-sources">📚 Sources: {msg.sources.join(", ")}</div>
              )}
            </div>
          ))}
          {sending && (
            <div className="message assistant">
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={
              creativeMode === "summarize" ? "What would you like summarized? (e.g., my 2019 stories)" :
              creativeMode === "analyze" ? "What should I analyze? (e.g., themes, style evolution)" :
              creativeMode === "generate" ? "What should I create? (e.g., poem, short story, novella outline)" :
              "Ask anything about your writing corpus..."
            }
            disabled={sending}
          />
          <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
            Send
          </button>
        </div>
      </div>
    </>
  );
}
