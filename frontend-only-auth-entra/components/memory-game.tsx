"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AuthBar from "@/components/auth-bar";

/* ── Emoji pools by difficulty ─────────────────────────────────────────── */
const EMOJI_POOL = [
  "🚀", "🎸", "🌮", "🐙", "🎯", "🧊", "🔥", "🦄",
  "🍕", "🎲", "🐉", "💎", "🌈", "🎪", "🦊", "🍩",
  "⚡", "🎵",
];

type Difficulty = "easy" | "medium" | "hard";

const GRID: Record<Difficulty, { pairs: number; cols: number }> = {
  easy:   { pairs: 6,  cols: 4 },
  medium: { pairs: 8,  cols: 4 },
  hard:   { pairs: 18, cols: 6 },
};

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairs: number): Card[] {
  const emojis = shuffle(EMOJI_POOL).slice(0, pairs);
  return shuffle(
    emojis.flatMap((emoji, i) => [
      { id: i * 2,     emoji, flipped: false, matched: false },
      { id: i * 2 + 1, emoji, flipped: false, matched: false },
    ])
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ── Component ─────────────────────────────────────────────────────────── */
export default function MemoryGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [cards, setCards] = useState<Card[]>(() => buildDeck(GRID.medium.pairs));
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);
  const [bestTimes, setBestTimes] = useState<Record<Difficulty, number | null>>({
    easy: null,
    medium: null,
    hard: null,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalPairs = GRID[difficulty].pairs;

  /* ── Load best times from localStorage ─────────────────────────────── */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("emoji-match-best");
      if (stored) setBestTimes(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  /* ── Timer ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (started && !won) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, won]);

  /* ── Win detection ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (matchedCount === totalPairs && matchedCount > 0) {
      setWon(true);
      const best = bestTimes[difficulty];
      if (best === null || elapsed < best) {
        const updated = { ...bestTimes, [difficulty]: elapsed };
        setBestTimes(updated);
        try {
          localStorage.setItem("emoji-match-best", JSON.stringify(updated));
        } catch {
          /* ignore */
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedCount]);

  /* ── Card click handler ────────────────────────────────────────────── */
  const handleClick = useCallback(
    (id: number) => {
      if (won) return;
      if (selected.length === 2) return;

      const card = cards.find((c) => c.id === id);
      if (!card || card.flipped || card.matched) return;

      if (!started) setStarted(true);

      const next = cards.map((c) =>
        c.id === id ? { ...c, flipped: true } : c
      );
      setCards(next);

      const newSelected = [...selected, id];
      setSelected(newSelected);

      if (newSelected.length === 2) {
        setMoves((m) => m + 1);
        const [a, b] = newSelected.map((sid) => next.find((c) => c.id === sid)!);
        if (a.emoji === b.emoji) {
          // Match!
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === a.id || c.id === b.id
                  ? { ...c, matched: true }
                  : c
              )
            );
            setMatchedCount((mc) => mc + 1);
            setSelected([]);
          }, 400);
        } else {
          // No match — flip back
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === a.id || c.id === b.id
                  ? { ...c, flipped: false }
                  : c
              )
            );
            setSelected([]);
          }, 800);
        }
      }
    },
    [cards, selected, started, won]
  );

  /* ── Reset / new game ──────────────────────────────────────────────── */
  const resetGame = useCallback(
    (diff?: Difficulty) => {
      const d = diff ?? difficulty;
      setDifficulty(d);
      setCards(buildDeck(GRID[d].pairs));
      setSelected([]);
      setMoves(0);
      setMatchedCount(0);
      setElapsed(0);
      setStarted(false);
      setWon(false);
    },
    [difficulty]
  );

  /* ── Render ────────────────────────────────────────────────────────── */
  const cols = GRID[difficulty].cols;

  return (
    <div className="game-container">
      <AuthBar />

      <div className="game-header">
        <h1>🧠 Emoji Match</h1>
        <p>Flip cards and find all the matching pairs!</p>
      </div>

      {/* Difficulty picker */}
      <div className="difficulty-picker">
        {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
          <button
            key={d}
            className={`btn btn-secondary ${difficulty === d ? "active" : ""}`}
            onClick={() => resetGame(d)}
          >
            {d === "easy" ? "Easy (6 pairs)" : d === "medium" ? "Medium (8 pairs)" : "Hard (18 pairs)"}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="stats">
        <span>
          <span className="label">Moves:</span>
          <span className="value">{moves}</span>
        </span>
        <span>
          <span className="label">Matched:</span>
          <span className="value">
            {matchedCount}/{totalPairs}
          </span>
        </span>
        <span>
          <span className="label">Time:</span>
          <span className="value">{formatTime(elapsed)}</span>
        </span>
        {bestTimes[difficulty] !== null && (
          <span>
            <span className="label">Best:</span>
            <span className="value best-time">
              {formatTime(bestTimes[difficulty]!)}
            </span>
          </span>
        )}
      </div>

      {/* Board */}
      <div className={`board${cols === 6 ? " size-6" : ""}`}>
        {cards.map((card) => (
          <div
            key={card.id}
            className={`card${card.flipped ? " flipped" : ""}${card.matched ? " matched" : ""}`}
            onClick={() => handleClick(card.id)}
          >
            <div className="card-inner">
              <div className="card-front">?</div>
              <div className="card-back">{card.emoji}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Restart button */}
      <div className="button-row">
        <button className="btn btn-secondary" onClick={() => resetGame()}>
          🔄 Restart
        </button>
      </div>

      {/* Win overlay */}
      {won && (
        <div className="win-overlay" onClick={() => resetGame()}>
          <div className="win-card" onClick={(e) => e.stopPropagation()}>
            <div className="trophy">🏆</div>
            <h2>You Win!</h2>
            <p>
              You matched all {totalPairs} pairs in <strong>{moves} moves</strong> and{" "}
              <strong>{formatTime(elapsed)}</strong>.
              {bestTimes[difficulty] === elapsed && (
                <>
                  <br />
                  <span className="best-time">New best time! 🎉</span>
                </>
              )}
            </p>
            <div className="button-row">
              <button className="btn btn-primary" onClick={() => resetGame()}>
                Play Again
              </button>
              <button
                className="btn btn-secondary"
                onClick={() =>
                  resetGame(
                    difficulty === "easy"
                      ? "medium"
                      : difficulty === "medium"
                      ? "hard"
                      : "hard"
                  )
                }
              >
                {difficulty !== "hard" ? "Try Harder →" : "Play Hard Again"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
