"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AuthBar from "@/components/auth-bar";

/* ── Types ─────────────────────────────────────────────────────────────── */
type Room = "kitchen" | "living-room" | "bedroom" | "bathroom" | "laundry";
type Tool =
  | "vacuum"
  | "sponge"
  | "duster"
  | "dish-soap"
  | "washer"
  | "mop";
type Difficulty = "quick" | "normal" | "deep-clean";

interface CleanableItem {
  id: string;
  room: Room;
  name: string;
  dirtyEmoji: string;
  cleanEmoji: string;
  requiredTool: Tool;
  points: number;
  cleaned: boolean;
  cleaning: boolean; /* mid-animation */
}

/* ── Data ──────────────────────────────────────────────────────────────── */
const TOOLS: Record<Tool, { emoji: string; label: string }> = {
  vacuum:    { emoji: "🧹", label: "Vacuum" },
  sponge:    { emoji: "🧽", label: "Sponge" },
  duster:    { emoji: "🪶", label: "Duster" },
  "dish-soap": { emoji: "🫧", label: "Dish Soap" },
  washer:    { emoji: "👕", label: "Washer" },
  mop:       { emoji: "🪣", label: "Mop" },
};

const ROOMS: Record<Room, { label: string; emoji: string }> = {
  kitchen:       { label: "Kitchen",     emoji: "🍳" },
  "living-room": { label: "Living Room", emoji: "🛋️" },
  bedroom:       { label: "Bedroom",     emoji: "🛏️" },
  bathroom:      { label: "Bathroom",    emoji: "🚿" },
  laundry:       { label: "Laundry",     emoji: "🧺" },
};

const ALL_ITEMS: Omit<CleanableItem, "cleaned" | "cleaning">[] = [
  /* Kitchen */
  { id: "k1", room: "kitchen", name: "Dirty Dishes",     dirtyEmoji: "🍽️", cleanEmoji: "✨", requiredTool: "dish-soap", points: 15 },
  { id: "k2", room: "kitchen", name: "Greasy Stove",     dirtyEmoji: "♨️",  cleanEmoji: "✨", requiredTool: "sponge",    points: 20 },
  { id: "k3", room: "kitchen", name: "Crumby Counter",   dirtyEmoji: "🫓", cleanEmoji: "✨", requiredTool: "sponge",    points: 10 },
  { id: "k4", room: "kitchen", name: "Sticky Floor",     dirtyEmoji: "🟤", cleanEmoji: "✨", requiredTool: "mop",       points: 15 },
  { id: "k5", room: "kitchen", name: "Messy Fridge",     dirtyEmoji: "🧊", cleanEmoji: "✨", requiredTool: "sponge",    points: 20 },
  { id: "k6", room: "kitchen", name: "Dusty Hood",       dirtyEmoji: "🌫️", cleanEmoji: "✨", requiredTool: "duster",    points: 10 },

  /* Living Room */
  { id: "l1", room: "living-room", name: "Dusty Shelves",   dirtyEmoji: "📚", cleanEmoji: "✨", requiredTool: "duster",  points: 10 },
  { id: "l2", room: "living-room", name: "Dirty Carpet",    dirtyEmoji: "🟫", cleanEmoji: "✨", requiredTool: "vacuum",  points: 15 },
  { id: "l3", room: "living-room", name: "Smudged TV",      dirtyEmoji: "📺", cleanEmoji: "✨", requiredTool: "sponge",  points: 10 },
  { id: "l4", room: "living-room", name: "Grimy Windows",   dirtyEmoji: "🪟", cleanEmoji: "✨", requiredTool: "sponge",  points: 15 },
  { id: "l5", room: "living-room", name: "Dusty Blinds",    dirtyEmoji: "🌫️", cleanEmoji: "✨", requiredTool: "duster",  points: 10 },
  { id: "l6", room: "living-room", name: "Pet Hair on Couch", dirtyEmoji: "🐾", cleanEmoji: "✨", requiredTool: "vacuum", points: 15 },

  /* Bedroom */
  { id: "b1", room: "bedroom", name: "Unmade Bed",        dirtyEmoji: "🛏️", cleanEmoji: "✨", requiredTool: "sponge",  points: 10 },
  { id: "b2", room: "bedroom", name: "Dusty Nightstand",  dirtyEmoji: "🌫️", cleanEmoji: "✨", requiredTool: "duster",  points: 10 },
  { id: "b3", room: "bedroom", name: "Dirty Floor",       dirtyEmoji: "🟤", cleanEmoji: "✨", requiredTool: "vacuum",  points: 15 },
  { id: "b4", room: "bedroom", name: "Dirty Mirror",      dirtyEmoji: "🪞", cleanEmoji: "✨", requiredTool: "sponge",  points: 10 },
  { id: "b5", room: "bedroom", name: "Cluttered Desk",    dirtyEmoji: "🗄️", cleanEmoji: "✨", requiredTool: "sponge",  points: 15 },
  { id: "b6", room: "bedroom", name: "Dusty Ceiling Fan", dirtyEmoji: "💨", cleanEmoji: "✨", requiredTool: "duster",  points: 20 },

  /* Bathroom */
  { id: "a1", room: "bathroom", name: "Dirty Toilet",     dirtyEmoji: "🚽", cleanEmoji: "✨", requiredTool: "sponge",  points: 20 },
  { id: "a2", room: "bathroom", name: "Grimy Sink",       dirtyEmoji: "🚰", cleanEmoji: "✨", requiredTool: "sponge",  points: 10 },
  { id: "a3", room: "bathroom", name: "Dirty Floor",      dirtyEmoji: "🟤", cleanEmoji: "✨", requiredTool: "mop",     points: 15 },
  { id: "a4", room: "bathroom", name: "Scummy Shower",    dirtyEmoji: "🚿", cleanEmoji: "✨", requiredTool: "sponge",  points: 20 },
  { id: "a5", room: "bathroom", name: "Spotty Mirror",    dirtyEmoji: "🪞", cleanEmoji: "✨", requiredTool: "sponge",  points: 10 },
  { id: "a6", room: "bathroom", name: "Dusty Vent",       dirtyEmoji: "🌬️", cleanEmoji: "✨", requiredTool: "duster",  points: 10 },

  /* Laundry */
  { id: "d1", room: "laundry", name: "Dirty Clothes Pile", dirtyEmoji: "👔", cleanEmoji: "✨", requiredTool: "washer",  points: 20 },
  { id: "d2", room: "laundry", name: "Stained Towels",     dirtyEmoji: "🧖", cleanEmoji: "✨", requiredTool: "washer",  points: 15 },
  { id: "d3", room: "laundry", name: "Dusty Dryer Top",    dirtyEmoji: "🌫️", cleanEmoji: "✨", requiredTool: "duster",  points: 10 },
  { id: "d4", room: "laundry", name: "Dirty Floor",        dirtyEmoji: "🟤", cleanEmoji: "✨", requiredTool: "vacuum",  points: 15 },
  { id: "d5", room: "laundry", name: "Muddy Shoes",        dirtyEmoji: "👟", cleanEmoji: "✨", requiredTool: "sponge",  points: 10 },
  { id: "d6", room: "laundry", name: "Dirty Bed Sheets",   dirtyEmoji: "🛌", cleanEmoji: "✨", requiredTool: "washer",  points: 15 },
];

const DIFFICULTY: Record<Difficulty, { time: number; label: string }> = {
  quick:       { time: 60,  label: "Quick Clean (60 s)" },
  normal:      { time: 90,  label: "Normal (90 s)" },
  "deep-clean": { time: 120, label: "Deep Clean (120 s)" },
};

/* ── Helpers ───────────────────────────────────────────────────────────── */
function buildItems(): CleanableItem[] {
  return ALL_ITEMS.map((i) => ({ ...i, cleaned: false, cleaning: false }));
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function grade(score: number, total: number): { letter: string; message: string } {
  const pct = score / total;
  if (pct >= 0.95) return { letter: "S", message: "Spotless! You're a cleaning legend!" };
  if (pct >= 0.8)  return { letter: "A", message: "Amazing job — nearly spotless!" };
  if (pct >= 0.6)  return { letter: "B", message: "Great work — the house looks good!" };
  if (pct >= 0.4)  return { letter: "C", message: "Not bad, but there's still some mess." };
  if (pct >= 0.2)  return { letter: "D", message: "You barely made a dent..." };
  return { letter: "F", message: "The house is still a disaster!" };
}

/* ── Component ─────────────────────────────────────────────────────────── */
export default function CleaningGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [items, setItems] = useState<CleanableItem[]>(buildItems);
  const [currentRoom, setCurrentRoom] = useState<Room>("kitchen");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DIFFICULTY.normal.time);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [wrongTool, setWrongTool] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [floatingPoints, setFloatingPoints] = useState<{ id: string; points: number; x: number; y: number } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPoints = ALL_ITEMS.reduce((sum, i) => sum + i.points, 0);
  const cleanedCount = items.filter((i) => i.cleaned).length;
  const roomItems = items.filter((i) => i.room === currentRoom);

  /* ── Timer ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (started && !gameOver) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            setGameOver(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, gameOver]);

  /* ── Clean item handler ────────────────────────────────────────────── */
  const handleClean = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (gameOver) return;
      if (!selectedTool) {
        setWrongTool("Pick a tool first!");
        if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
        wrongTimerRef.current = setTimeout(() => setWrongTool(null), 1200);
        return;
      }

      const item = items.find((i) => i.id === id);
      if (!item || item.cleaned || item.cleaning) return;

      if (!started) setStarted(true);

      if (item.requiredTool !== selectedTool) {
        setWrongTool(`Wrong tool! "${item.name}" needs the ${TOOLS[item.requiredTool].label}.`);
        setCombo(0);
        if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
        wrongTimerRef.current = setTimeout(() => setWrongTool(null), 1500);
        return;
      }

      /* Start cleaning animation */
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, cleaning: true } : i))
      );

      const newCombo = combo + 1;
      setCombo(newCombo);
      const comboMultiplier = newCombo >= 5 ? 3 : newCombo >= 3 ? 2 : 1;
      const earnedPoints = item.points * comboMultiplier;

      /* Show floating points */
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setFloatingPoints({ id, points: earnedPoints, x: rect.left + rect.width / 2, y: rect.top });
      setTimeout(() => setFloatingPoints(null), 800);

      /* Complete cleaning after animation */
      setTimeout(() => {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, cleaned: true, cleaning: false } : i))
        );
        setScore((s) => s + earnedPoints);
      }, 500);
    },
    [items, selectedTool, started, gameOver, combo]
  );

  /* ── Reset ─────────────────────────────────────────────────────────── */
  const resetGame = useCallback(
    (diff?: Difficulty) => {
      const d = diff ?? difficulty;
      setDifficulty(d);
      setItems(buildItems());
      setCurrentRoom("kitchen");
      setSelectedTool(null);
      setScore(0);
      setTimeLeft(DIFFICULTY[d].time);
      setStarted(false);
      setGameOver(false);
      setWrongTool(null);
      setCombo(0);
      setFloatingPoints(null);
    },
    [difficulty]
  );

  const roomCleanedCount = roomItems.filter((i) => i.cleaned).length;
  const roomTotal = roomItems.length;
  const roomDone = roomCleanedCount === roomTotal;

  const { letter, message } = grade(score, totalPoints);

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="game-container">
      <AuthBar />

      {/* Header */}
      <div className="game-header">
        <h1>🏠 Clean Sweep!</h1>
        <p>Grab a tool and clean the house before time runs out!</p>
      </div>

      {/* Difficulty */}
      <div className="difficulty-picker">
        {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
          <button
            key={d}
            className={`btn btn-secondary ${difficulty === d ? "active" : ""}`}
            onClick={() => resetGame(d)}
          >
            {DIFFICULTY[d].label}
          </button>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="stats">
        <span>
          <span className="label">Score:</span>
          <span className="value">{score}</span>
        </span>
        <span>
          <span className="label">Cleaned:</span>
          <span className="value">
            {cleanedCount}/{ALL_ITEMS.length}
          </span>
        </span>
        <span>
          <span className="label">Time:</span>
          <span className={`value ${timeLeft <= 10 ? "time-critical" : ""}`}>
            {formatTime(timeLeft)}
          </span>
        </span>
        {combo >= 3 && (
          <span className="combo-badge">
            🔥 x{combo >= 5 ? 3 : 2} combo!
          </span>
        )}
      </div>

      {/* Room Tabs */}
      <div className="room-tabs">
        {(Object.keys(ROOMS) as Room[]).map((r) => {
          const rItems = items.filter((i) => i.room === r);
          const rCleaned = rItems.filter((i) => i.cleaned).length;
          const rDone = rCleaned === rItems.length;
          return (
            <button
              key={r}
              className={`btn btn-room ${currentRoom === r ? "active" : ""} ${rDone ? "room-done" : ""}`}
              onClick={() => setCurrentRoom(r)}
            >
              <span className="room-emoji">{ROOMS[r].emoji}</span>
              <span className="room-label">{ROOMS[r].label}</span>
              <span className="room-progress">
                {rCleaned}/{rItems.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Room Area */}
      <div className="room-area">
        <div className="room-title">
          {ROOMS[currentRoom].emoji} {ROOMS[currentRoom].label}
          {roomDone && <span className="room-complete-badge">✅ Spotless!</span>}
        </div>
        <div className="items-grid">
          {roomItems.map((item) => (
            <div
              key={item.id}
              className={`item-card ${item.cleaned ? "cleaned" : "dirty"} ${item.cleaning ? "cleaning" : ""}`}
              onClick={(e) => handleClean(item.id, e)}
            >
              <div className="item-emoji">
                {item.cleaned ? item.cleanEmoji : item.dirtyEmoji}
              </div>
              <div className="item-name">{item.name}</div>
              {!item.cleaned && (
                <div className="item-tool-hint">
                  {/* Needs: {TOOLS[item.requiredTool].emoji} */}
                </div>
              )}
              {!item.cleaned && (
                <div className="item-points">{item.points} pts</div>
              )}
              {item.cleaned && (
                <div className="item-done-label">Clean!</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tool Belt */}
      <div className="tool-belt">
        <div className="tool-belt-label">🧰 Tool Belt — click to grab:</div>
        <div className="tool-belt-items">
          {(Object.keys(TOOLS) as Tool[]).map((t) => (
            <button
              key={t}
              className={`btn btn-tool ${selectedTool === t ? "active" : ""}`}
              onClick={() => setSelectedTool(selectedTool === t ? null : t)}
            >
              <span className="tool-emoji">{TOOLS[t].emoji}</span>
              <span className="tool-label">{TOOLS[t].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Wrong tool toast */}
      {wrongTool && <div className="wrong-tool-toast">❌ {wrongTool}</div>}

      {/* Floating points */}
      {floatingPoints && (
        <div
          className="floating-points"
          style={{ left: floatingPoints.x, top: floatingPoints.y }}
        >
          +{floatingPoints.points}
        </div>
      )}

      {/* Restart */}
      <div className="button-row">
        <button className="btn btn-secondary" onClick={() => resetGame()}>
          🔄 Restart
        </button>
      </div>

      {/* Game Over Overlay */}
      {gameOver && (
        <div className="win-overlay" onClick={() => resetGame()}>
          <div className="win-card" onClick={(e) => e.stopPropagation()}>
            <div className="trophy">{letter === "S" ? "🌟" : letter === "A" ? "🏆" : letter === "F" ? "😬" : "🏠"}</div>
            <h2>Time&apos;s Up!</h2>
            <div className="grade-letter">Grade: {letter}</div>
            <p>{message}</p>
            <div className="final-stats">
              <div>
                <strong>Score:</strong> {score} / {totalPoints}
              </div>
              <div>
                <strong>Items cleaned:</strong> {cleanedCount} / {ALL_ITEMS.length}
              </div>
            </div>
            <div className="button-row">
              <button className="btn btn-primary" onClick={() => resetGame()}>
                Play Again
              </button>
              <button
                className="btn btn-secondary"
                onClick={() =>
                  resetGame(
                    difficulty === "quick"
                      ? "normal"
                      : difficulty === "normal"
                      ? "deep-clean"
                      : "deep-clean"
                  )
                }
              >
                {difficulty !== "deep-clean" ? "More Time →" : "Play Again"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
