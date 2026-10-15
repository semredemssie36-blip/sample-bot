"use client";

import { useEffect, useRef } from "react";
import { type Point, type GamePhase, GRID_SIZE } from "@/hooks/useSnakeGame";

interface SnakeCanvasProps {
  snake: Point[];
  food: Point;
  phase: GamePhase;
  /** Canvas will be sized to fill this many CSS pixels on the smaller axis. */
  sizePx: number;
}

// ─── Neon colour palette ─────────────────────────────────────────────────────
const COLORS = {
  bg:          "#020409",
  grid:        "rgba(255,255,255,0.03)",
  snakeHead:   "#22d3ee",
  snakeBody:   "#3b82f6",
  snakeTail:   "#7c3aed",
  snakeGlow:   "rgba(34,211,238,0.6)",
  food:        "#fbbf24",
  foodGlow:    "rgba(251,191,36,0.7)",
  wallFlash:   "rgba(239,68,68,0.25)",
};

export default function SnakeCanvas({ snake, food, phase, sizePx }: SnakeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Tracks the flash animation frame on death
  const flashRef  = useRef(0);
  const prevPhase = useRef<GamePhase>("idle");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr  = window.devicePixelRatio || 1;
    const cell = sizePx / GRID_SIZE;

    // Set physical pixel size for crisp rendering on HiDPI screens
    canvas.width  = sizePx * dpr;
    canvas.height = sizePx * dpr;
    canvas.style.width  = `${sizePx}px`;
    canvas.style.height = `${sizePx}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    // ── Background ────────────────────────────────────────────────────
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, sizePx, sizePx);

    // ── Grid lines ────────────────────────────────────────────────────
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth   = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, sizePx);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(sizePx, i * cell);
      ctx.stroke();
    }

    // ── Snake ─────────────────────────────────────────────────────────
    snake.forEach((seg, idx) => {
      const t = idx / Math.max(snake.length - 1, 1); // 0 = head, 1 = tail

      // Interpolate colour head→body→tail
      const r = Math.round(idx === 0 ? 34  : t < 0.5 ? 59  : 124);
      const g = Math.round(idx === 0 ? 211 : t < 0.5 ? 130 : 58);
      const b = Math.round(idx === 0 ? 238 : t < 0.5 ? 246 : 237);
      const alpha = 1 - t * 0.35; // slight fade toward tail

      const x = seg.x * cell;
      const y = seg.y * cell;
      const pad = cell * 0.1;
      const r2  = cell * 0.35; // corner radius

      // Glow (head only)
      if (idx === 0) {
        ctx.shadowColor = COLORS.snakeGlow;
        ctx.shadowBlur  = cell * 1.2;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2, r2);
      ctx.fill();
    });

    ctx.shadowBlur = 0;

    // ── Food ──────────────────────────────────────────────────────────
    const fx = food.x * cell + cell / 2;
    const fy = food.y * cell + cell / 2;

    // Outer glow
    ctx.shadowColor = COLORS.foodGlow;
    ctx.shadowBlur  = cell * 1.5;
    ctx.fillStyle   = COLORS.food;
    ctx.beginPath();
    ctx.arc(fx, fy, cell * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // Bright centre highlight
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(fx - cell * 0.1, fy - cell * 0.1, cell * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // ── Death flash overlay ───────────────────────────────────────────
    if (phase === "dead" && prevPhase.current !== "dead") {
      ctx.fillStyle = COLORS.wallFlash;
      ctx.fillRect(0, 0, sizePx, sizePx);
    }

    prevPhase.current = phase;
  }, [snake, food, phase, sizePx]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-2xl"
      style={{
        display:   "block",
        imageRendering: "pixelated",
        boxShadow: "0 0 40px rgba(34,211,238,0.2), 0 0 80px rgba(59,130,246,0.1)",
      }}
    />
  );
}
