"use client";

import {
  useEffect, useRef, useCallback, useState, useMemo,
} from "react";
import NovaBlasterCanvas from "@/components/NovaBlasterCanvas";
import {
  createInitialState, startGame, updateGame,
  type GameState, type GamePhase,
} from "@/hooks/useNovaBlaster";
import { saveGameSession } from "@/app/actions";

// ─── Props ────────────────────────────────────────────────────────────────────

interface NovaBlasterScreenProps {
  userId:          number;
  onBalanceUpdate: (delta: number) => void;
}

// ─── Canvas size hook ─────────────────────────────────────────────────────────

function useCanvasSize() {
  const [size, setSize] = useState({ w: 360, h: 580 });
  useEffect(() => {
    const calc = () => {
      const w = Math.min(window.innerWidth, 430);
      // Reserve space for HUD top (60px) + bottom nav (72px) + padding
      const h = window.innerHeight - 60 - 72 - 8;
      setSize({ w, h: Math.max(h, 400) });
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return size;
}

// ─── HUD components ───────────────────────────────────────────────────────────

function ShieldBar({ current, max }: { current: number; max: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Shield: ${current} of ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className="h-3 w-3 rounded-sm transition-all duration-200"
          style={{
            background: i < current
              ? "linear-gradient(135deg,#3b82f6,#60a5fa)"
              : "rgba(255,255,255,0.1)",
            boxShadow: i < current ? "0 0 6px rgba(59,130,246,0.7)" : "none",
          }}
        />
      ))}
    </div>
  );
}

function LivesDisplay({ lives }: { lives: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Lives: ${lives}`}>
      {Array.from({ length: 3 }).map((_, i) => (
        <span
          key={i}
          style={{ fontSize: 14, opacity: i < lives ? 1 : 0.2 }}
          aria-hidden="true"
        >
          🚀
        </span>
      ))}
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NovaBlasterScreen({ userId, onBalanceUpdate }: NovaBlasterScreenProps) {
  const { w: canvasW, h: canvasH } = useCanvasSize();

  const [gs, setGs] = useState<GameState>(() => createInitialState(canvasW, canvasH));
  const gsRef       = useRef(gs);
  gsRef.current     = gs;

  const rafRef        = useRef<number>(0);
  const targetXRef    = useRef<number | null>(null);
  const useBombRef    = useRef(false);
  const savedRef      = useRef(false);
  const startTimeRef  = useRef(0);
  const frameRef      = useRef(0);

  // ── Game loop ───────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    frameRef.current++;
    const cur = gsRef.current;
    if (cur.phase !== "playing") { rafRef.current = 0; return; }

    const next = updateGame(
      cur,
      canvasW,
      canvasH,
      targetXRef.current,
      useBombRef.current,
    );
    useBombRef.current = false;

    setGs(next);

    if (next.phase === "playing") {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = 0;
    }
  }, [canvasW, canvasH]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
  }, []);

  // ── Start game ──────────────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    stopLoop();
    savedRef.current   = false;
    startTimeRef.current = Date.now();
    const fresh = startGame(createInitialState(canvasW, canvasH), canvasW, canvasH);
    setGs(fresh);
    gsRef.current = fresh;
    rafRef.current = requestAnimationFrame(tick);
  }, [canvasW, canvasH, tick, stopLoop]);

  // ── Save result on game over ────────────────────────────────────────────────
  useEffect(() => {
    if (gs.phase === "gameover" && !savedRef.current) {
      savedRef.current = true;
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      saveGameSession(userId, gs.score, gs.novaEarned, duration, "nova_blaster")
        .then(() => { if (gs.novaEarned > 0) onBalanceUpdate(gs.novaEarned); })
        .catch(() => {});
    }
  }, [gs.phase, gs.score, gs.novaEarned, userId, onBalanceUpdate]);

  // ── Touch / mouse drag controls ─────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    targetXRef.current = e.touches[0].clientX;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    targetXRef.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    targetXRef.current = null;
  }, []);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (e.buttons !== 1) return;
    const rect = (e.target as HTMLElement).closest("[data-canvas-wrap]")?.getBoundingClientRect();
    targetXRef.current = rect ? e.clientX - rect.left : e.clientX;
  }, []);
  const handleMouseLeave = useCallback(() => { targetXRef.current = null; }, []);

  // Cleanup on unmount
  useEffect(() => () => stopLoop(), [stopLoop]);

  // ── Derived display values ──────────────────────────────────────────────────
  const { player, score, novaEarned, wave, phase } = gs;
  const phase_: GamePhase = phase;

  const powerUpIcons = useMemo(() => {
    const icons: string[] = [];
    if (player.doubleShot > 0) icons.push("⚡");
    if (player.rapidFire  > 0) icons.push("🔫");
    if (player.hasBomb)         icons.push("💣");
    return icons;
  }, [player.doubleShot, player.rapidFire, player.hasBomb]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col"
      style={{ background: "#08061a", minHeight: "100%", paddingBottom: 0 }}
    >
      {/* ── HUD bar ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{
          background:  "rgba(8,6,26,0.95)",
          borderBottom: "1px solid rgba(124,58,237,0.2)",
          minHeight:    56,
        }}
      >
        {/* Left: lives + shield */}
        <div className="flex flex-col gap-1">
          <LivesDisplay lives={player.lives} />
          <ShieldBar current={player.shield} max={player.maxShield} />
        </div>

        {/* Centre: wave + title */}
        <div className="text-center">
          <p
            className="text-xs font-black uppercase tracking-widest"
            style={{ color: "#a855f7", textShadow: "0 0 10px rgba(168,85,247,0.6)" }}
          >
            NOVA BLASTER
          </p>
          {phase_ === "playing" && (
            <p className="text-[0.6rem] font-bold" style={{ color: "rgba(167,139,250,0.6)" }}>
              WAVE {wave}{gs.bossActive ? " 👾 BOSS" : ""}
            </p>
          )}
        </div>

        {/* Right: NOVA + score */}
        <div className="text-right">
          <p className="text-sm font-black" style={{ color: "#f59e0b" }}>
            🪙 {novaEarned}
          </p>
          <p className="text-[0.6rem]" style={{ color: "rgba(167,139,250,0.5)" }}>
            {score.toLocaleString()} pts
          </p>
        </div>
      </div>

      {/* ── Canvas area ─────────────────────────────────────────────────── */}
      <div
        className="relative flex-1 flex items-center justify-center overflow-hidden"
        data-canvas-wrap=""
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: "none" }}
      >
        <div
          className="relative overflow-hidden"
          style={{ width: canvasW, height: canvasH }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <NovaBlasterCanvas gameState={gs} width={canvasW} height={canvasH} />

          {/* ── Start screen overlay ──────────────────────────────────── */}
          {phase_ === "idle" && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{
                background:    "linear-gradient(180deg, rgba(8,6,26,0.85) 0%, rgba(8,6,26,0.95) 100%)",
                backdropFilter: "blur(2px)",
              }}
            >
              {/* Title */}
              <div className="mb-6 text-center">
                <p
                  className="text-4xl font-black uppercase tracking-widest mb-1"
                  style={{ color: "#e879f9", textShadow: "0 0 30px rgba(232,121,249,0.6)" }}
                >
                  NOVA
                </p>
                <p
                  className="text-4xl font-black uppercase tracking-widest"
                  style={{ color: "#a855f7", textShadow: "0 0 30px rgba(168,85,247,0.6)" }}
                >
                  BLASTER
                </p>
                <p className="text-xs mt-2" style={{ color: "rgba(167,139,250,0.5)" }}>
                  Survive the swarm — the deeper you go, the more you earn
                </p>
              </div>

              {/* How to play */}
              <div
                className="mx-6 rounded-2xl px-5 py-4 mb-6"
                style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)" }}
              >
                <p className="text-xs font-bold text-white mb-3 text-center uppercase tracking-wide">
                  How to Play
                </p>
                <div className="space-y-2">
                  {[
                    { icon: "👆", text: "Drag to move your ship" },
                    { icon: "🔫", text: "Auto-fires — focus on dodging" },
                    { icon: "💥", text: "Kill enemies to earn NOVA" },
                    { icon: "⚡", text: "Collect power-ups to get stronger" },
                    { icon: "👾", text: "Boss every 5 waves — +100 NOVA" },
                    { icon: "💣", text: "Tap bomb button to clear screen" },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-2.5">
                      <span style={{ fontSize: 16 }}>{icon}</span>
                      <p className="text-xs" style={{ color: "rgba(167,139,250,0.7)" }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Earning rates */}
              <div className="flex gap-3 mb-6 flex-wrap justify-center px-4">
                {[
                  { label: "Per Enemy", value: "+2 NOVA" },
                  { label: "Per Wave",  value: "+10×wave" },
                  { label: "Boss Kill", value: "+100 NOVA" },
                  { label: "Coin Drop", value: "+20 NOVA" },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl px-3 py-2 text-center"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
                  >
                    <p className="text-[0.6rem]" style={{ color: "rgba(167,139,250,0.5)" }}>{label}</p>
                    <p className="text-xs font-black" style={{ color: "#f59e0b" }}>{value}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleStart}
                className="rounded-2xl px-10 py-4 text-base font-black text-white uppercase tracking-widest transition-all active:scale-95"
                style={{
                  background:  "linear-gradient(135deg,#7c3aed,#a855f7,#e879f9)",
                  boxShadow:   "0 0 40px rgba(168,85,247,0.5), 0 0 80px rgba(168,85,247,0.2)",
                  letterSpacing: "0.12em",
                }}
              >
                🚀 Launch
              </button>
            </div>
          )}

          {/* ── Game Over overlay ─────────────────────────────────────── */}
          {phase_ === "gameover" && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{
                background:    "linear-gradient(180deg, rgba(8,6,26,0.9) 0%, rgba(8,6,26,0.97) 100%)",
                backdropFilter: "blur(4px)",
              }}
            >
              {/* Title */}
              <div className="mb-2 text-center">
                <p
                  className="text-3xl font-black uppercase tracking-widest"
                  style={{ color: "#ef4444", textShadow: "0 0 20px rgba(239,68,68,0.6)" }}
                >
                  GAME OVER
                </p>
                <p className="text-xs mt-1" style={{ color: "rgba(167,139,250,0.5)" }}>
                  You reached Wave {wave}
                </p>
              </div>

              {/* Score card */}
              <div
                className="mx-6 w-full max-w-xs rounded-3xl px-6 py-5 mb-4"
                style={{
                  background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(8,6,26,0.8))",
                  border:     "1px solid rgba(124,58,237,0.3)",
                }}
              >
                {/* NOVA earned — big hero number */}
                <p className="text-center text-[0.6rem] uppercase tracking-widest mb-1" style={{ color: "rgba(167,139,250,0.5)" }}>
                  NOVA Earned This Game
                </p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span style={{ fontSize: 28 }}>🪙</span>
                  <span
                    className="text-4xl font-black tabular-nums"
                    style={{ color: "#f59e0b", textShadow: "0 0 20px rgba(245,158,11,0.6)" }}
                  >
                    {novaEarned.toLocaleString()}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Score",          value: score.toLocaleString(),            color: "#a855f7" },
                    { label: "Wave Reached",   value: String(wave),                      color: "#60a5fa" },
                    { label: "Enemies Killed", value: String(Math.floor(score / 15)),    color: "#10b981" },
                    { label: "Time Survived",  value: `${Math.round(gs.totalTime / 60)}s`, color: "#f59e0b" },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="rounded-xl px-3 py-2"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <p className="text-[0.55rem] uppercase tracking-wide" style={{ color: "rgba(167,139,250,0.4)" }}>
                        {label}
                      </p>
                      <p className="text-sm font-black" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* NOVA credited notice */}
                {novaEarned > 0 && (
                  <div
                    className="mt-3 rounded-xl px-3 py-2 text-center text-xs font-semibold"
                    style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}
                  >
                    ✅ {novaEarned} NOVA added to your balance
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 px-6 w-full max-w-xs">
                <button
                  onClick={handleStart}
                  className="flex-1 rounded-2xl py-3.5 text-sm font-black text-white uppercase tracking-wide transition-all active:scale-95"
                  style={{
                    background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                    boxShadow:  "0 0 20px rgba(124,58,237,0.4)",
                  }}
                >
                  🚀 Play Again
                </button>
              </div>
            </div>
          )}

          {/* ── Power-up indicator bar (during gameplay) ──────────────── */}
          {phase_ === "playing" && powerUpIcons.length > 0 && (
            <div
              className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-2xl px-3 py-1.5"
              style={{
                background: "rgba(8,6,26,0.7)",
                border:     "1px solid rgba(124,58,237,0.3)",
                backdropFilter: "blur(4px)",
              }}
            >
              {powerUpIcons.map((icon, i) => (
                <span key={i} style={{ fontSize: 18 }} aria-hidden="true">{icon}</span>
              ))}
            </div>
          )}

          {/* ── Bomb button ───────────────────────────────────────────── */}
          {phase_ === "playing" && player.hasBomb && (
            <button
              onTouchStart={(e) => { e.stopPropagation(); useBombRef.current = true; }}
              onClick={() => { useBombRef.current = true; }}
              className="absolute top-3 right-3 rounded-2xl px-3 py-2 text-xs font-black transition-all active:scale-90"
              style={{
                background: "linear-gradient(135deg,#dc2626,#ef4444)",
                boxShadow:  "0 0 16px rgba(239,68,68,0.5)",
                color:      "white",
                zIndex:     10,
              }}
              aria-label="Use bomb"
            >
              💣 BOMB
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
