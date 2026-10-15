"use client";

import { useCallback, useRef } from "react";
import { type Direction } from "@/hooks/useSnakeGame";

interface SwipeControlsProps {
  onDirection: (dir: Direction) => void;
}

/** Minimum swipe distance in px to register as intentional. */
const SWIPE_THRESHOLD = 30;

/**
 * Dual-mode mobile controls:
 *   1. Touch swipe anywhere on the overlay (natural gesture)
 *   2. On-screen D-pad buttons for precise tapping
 */
export default function SwipeControls({ onDirection }: SwipeControlsProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // ── Swipe detection ────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      touchStart.current = null;

      if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        onDirection(dx > 0 ? "RIGHT" : "LEFT");
      } else {
        onDirection(dy > 0 ? "DOWN" : "UP");
      }
    },
    [onDirection],
  );

  // ── D-pad button ───────────────────────────────────────────────────
  const Btn = ({
    dir,
    label,
    className,
  }: {
    dir: Direction;
    label: React.ReactNode;
    className?: string;
  }) => (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onDirection(dir);
      }}
      aria-label={dir}
      className={[
        "flex select-none items-center justify-center rounded-xl",
        "border border-white/10 bg-white/5 text-white/70 backdrop-blur-sm",
        "active:scale-90 active:bg-white/15 transition-all duration-75",
        "h-12 w-12",
        className,
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <div
      className="absolute inset-0"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* D-pad — bottom-right corner */}
      <div className="absolute bottom-4 right-4 grid grid-cols-3 gap-1.5 w-[152px]">
        {/* Row 1 */}
        <div />
        <Btn dir="UP"    label={<ArrowUp />} />
        <div />
        {/* Row 2 */}
        <Btn dir="LEFT"  label={<ArrowLeft />} />
        <div className="h-12 w-12 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-white/20" />
        </div>
        <Btn dir="RIGHT" label={<ArrowRight />} />
        {/* Row 3 */}
        <div />
        <Btn dir="DOWN"  label={<ArrowDown />} />
        <div />
      </div>
    </div>
  );
}

// ── Minimal SVG arrows ─────────────────────────────────────────────────────

const ArrowUp    = () => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 5l-7 8h4v6h6v-6h4z"/></svg>;
const ArrowDown  = () => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 19l7-8h-4V5H9v6H5z"/></svg>;
const ArrowLeft  = () => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M5 12l8-7v4h6v6h-6v4z"/></svg>;
const ArrowRight = () => <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M19 12l-8 7v-4H5V9h6V5z"/></svg>;
