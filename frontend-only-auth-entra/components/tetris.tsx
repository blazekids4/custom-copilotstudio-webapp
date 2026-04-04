"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import AuthBar from "@/components/auth-bar";

/* ── Constants ──────────────────────────────────────────────────────────── */
const COLS = 10;
const ROWS = 20;
const TICK_MS = 500;
const FAST_TICK = 50;

type CellColor = string | null;
type Board = CellColor[][];

const PIECES = [
  { shape: [[1,1,1,1]],                          color: "#06b6d4" }, // I
  { shape: [[1,1],[1,1]],                         color: "#eab308" }, // O
  { shape: [[0,1,0],[1,1,1]],                     color: "#a855f7" }, // T
  { shape: [[1,0,0],[1,1,1]],                     color: "#3b82f6" }, // J
  { shape: [[0,0,1],[1,1,1]],                     color: "#f97316" }, // L
  { shape: [[0,1,1],[1,1,0]],                     color: "#22c55e" }, // S
  { shape: [[1,1,0],[0,1,1]],                     color: "#ef4444" }, // Z
];

interface Piece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece(): Piece {
  const p = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    shape: p.shape.map((r) => [...r]),
    color: p.color,
    x: Math.floor((COLS - p.shape[0].length) / 2),
    y: 0,
  };
}

function rotate(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      rotated[c][rows - 1 - r] = shape[r][c];
  return rotated;
}

function collides(board: Board, piece: Piece): boolean {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c]) {
        const ny = piece.y + r;
        const nx = piece.x + c;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
  return false;
}

function merge(board: Board, piece: Piece): Board {
  const b = board.map((r) => [...r]);
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c]) {
        const ny = piece.y + r;
        const nx = piece.x + c;
        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS)
          b[ny][nx] = piece.color;
      }
  return b;
}

function clearLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter((row) => row.some((c) => !c));
  const cleared = ROWS - kept.length;
  const empty = Array.from({ length: cleared }, () => Array(COLS).fill(null));
  return { board: [...empty, ...kept], cleared };
}

const POINTS = [0, 100, 300, 500, 800];

/* ── Component ─────────────────────────────────────────────────────────── */
export default function Tetris() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [piece, setPiece] = useState<Piece>(randomPiece);
  const [nextPiece, setNextPiece] = useState<Piece>(randomPiece);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);

  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  const nextRef = useRef(nextPiece);
  const overRef = useRef(gameOver);
  const pausedRef = useRef(paused);

  boardRef.current = board;
  pieceRef.current = piece;
  nextRef.current = nextPiece;
  overRef.current = gameOver;
  pausedRef.current = paused;

  /* ── Lock piece & spawn next ─────────────────────────────────────── */
  const lock = useCallback(() => {
    const merged = merge(boardRef.current, pieceRef.current);
    const { board: cleaned, cleared } = clearLines(merged);
    setBoard(cleaned);
    setScore((s) => s + POINTS[cleared]);
    setLines((l) => {
      const newL = l + cleared;
      setLevel(Math.floor(newL / 10) + 1);
      return newL;
    });

    const np = nextRef.current;
    if (collides(cleaned, np)) {
      setGameOver(true);
      return;
    }
    setPiece(np);
    setNextPiece(randomPiece());
  }, []);

  /* ── Move helpers ────────────────────────────────────────────────── */
  const moveLeft = useCallback(() => {
    const moved = { ...pieceRef.current, x: pieceRef.current.x - 1 };
    if (!collides(boardRef.current, moved)) setPiece(moved);
  }, []);

  const moveRight = useCallback(() => {
    const moved = { ...pieceRef.current, x: pieceRef.current.x + 1 };
    if (!collides(boardRef.current, moved)) setPiece(moved);
  }, []);

  const moveDown = useCallback(() => {
    const moved = { ...pieceRef.current, y: pieceRef.current.y + 1 };
    if (!collides(boardRef.current, moved)) {
      setPiece(moved);
    } else {
      lock();
    }
  }, [lock]);

  const hardDrop = useCallback(() => {
    let p = { ...pieceRef.current };
    while (!collides(boardRef.current, { ...p, y: p.y + 1 })) p.y++;
    setPiece(p);
    // lock on next tick
    const merged = merge(boardRef.current, p);
    const { board: cleaned, cleared } = clearLines(merged);
    setBoard(cleaned);
    setScore((s) => s + POINTS[cleared]);
    setLines((l) => {
      const newL = l + cleared;
      setLevel(Math.floor(newL / 10) + 1);
      return newL;
    });
    const np = nextRef.current;
    if (collides(cleaned, np)) {
      setGameOver(true);
      return;
    }
    setPiece(np);
    setNextPiece(randomPiece());
  }, []);

  const rotatePiece = useCallback(() => {
    const rotated = { ...pieceRef.current, shape: rotate(pieceRef.current.shape) };
    if (!collides(boardRef.current, rotated)) setPiece(rotated);
    // wall kick: try shifting left/right
    else {
      const kickL = { ...rotated, x: rotated.x - 1 };
      const kickR = { ...rotated, x: rotated.x + 1 };
      if (!collides(boardRef.current, kickL)) setPiece(kickL);
      else if (!collides(boardRef.current, kickR)) setPiece(kickR);
    }
  }, []);

  /* ── Keyboard ────────────────────────────────────────────────────── */
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (overRef.current) return;
      if (e.key === "p" || e.key === "P") {
        setPaused((p) => !p);
        return;
      }
      if (pausedRef.current) return;
      switch (e.key) {
        case "ArrowLeft":  e.preventDefault(); moveLeft(); break;
        case "ArrowRight": e.preventDefault(); moveRight(); break;
        case "ArrowDown":  e.preventDefault(); moveDown(); break;
        case "ArrowUp":    e.preventDefault(); rotatePiece(); break;
        case " ":          e.preventDefault(); hardDrop(); break;
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [moveLeft, moveRight, moveDown, rotatePiece, hardDrop]);

  /* ── Game tick ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (gameOver || paused) return;
    const speed = Math.max(100, TICK_MS - (level - 1) * 40);
    const id = setInterval(() => moveDown(), speed);
    return () => clearInterval(id);
  }, [gameOver, paused, level, moveDown]);

  /* ── Restart ─────────────────────────────────────────────────────── */
  const restart = () => {
    setBoard(emptyBoard());
    setPiece(randomPiece());
    setNextPiece(randomPiece());
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setPaused(false);
  };

  /* ── Render board with current piece overlaid ────────────────────── */
  const display = merge(board, piece);

  /* ── Next piece preview (4x4 grid) ──────────────────────────────── */
  const previewGrid: CellColor[][] = Array.from({ length: 4 }, () => Array(4).fill(null));
  for (let r = 0; r < nextPiece.shape.length; r++)
    for (let c = 0; c < nextPiece.shape[r].length; c++)
      if (nextPiece.shape[r][c]) previewGrid[r][c] = nextPiece.color;

  return (
    <div className="game-container">
      <AuthBar />
      <header className="game-header">
        <h1>Tetris</h1>
        <p>Arrow keys to move &amp; rotate · Space to hard drop · P to pause</p>
      </header>

      <div className="tetris-layout">
        {/* Board */}
        <div className="tetris-board">
          {display.map((row, ri) => (
            <div key={ri} className="tetris-row">
              {row.map((cell, ci) => (
                <div
                  key={ci}
                  className="tetris-cell"
                  style={{ background: cell ?? "var(--cell-empty)" }}
                />
              ))}
            </div>
          ))}
          {gameOver && (
            <div className="overlay">
              <div className="overlay-card">
                <h2>Game Over</h2>
                <p>Score: {score.toLocaleString()}</p>
                <button className="btn btn-primary" onClick={restart}>Play Again</button>
              </div>
            </div>
          )}
          {paused && !gameOver && (
            <div className="overlay">
              <div className="overlay-card">
                <h2>Paused</h2>
                <p>Press P to resume</p>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="tetris-side">
          <div className="side-card">
            <span className="side-label">Score</span>
            <span className="side-value">{score.toLocaleString()}</span>
          </div>
          <div className="side-card">
            <span className="side-label">Lines</span>
            <span className="side-value">{lines}</span>
          </div>
          <div className="side-card">
            <span className="side-label">Level</span>
            <span className="side-value">{level}</span>
          </div>
          <div className="side-card">
            <span className="side-label">Next</span>
            <div className="preview-grid">
              {previewGrid.map((row, ri) => (
                <div key={ri} className="tetris-row">
                  {row.map((cell, ci) => (
                    <div
                      key={ci}
                      className="tetris-cell preview-cell"
                      style={{ background: cell ?? "transparent" }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-secondary" onClick={restart}>
            Restart
          </button>
        </div>
      </div>

      {/* Mobile controls */}
      <div className="mobile-controls">
        <button className="btn btn-secondary" onClick={moveLeft}>←</button>
        <button className="btn btn-secondary" onClick={moveDown}>↓</button>
        <button className="btn btn-secondary" onClick={rotatePiece}>↻</button>
        <button className="btn btn-secondary" onClick={moveRight}>→</button>
        <button className="btn btn-primary" onClick={hardDrop}>Drop</button>
      </div>
    </div>
  );
}
