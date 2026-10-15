"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { retrieveLaunchParams } from "@telegram-apps/sdk-react";
import { syncPlayerAndScore } from "./actions";
import SnakeCanvas from "@/components/SnakeCanvas";
import SwipeControls from "@/components/SwipeControls";
import Leaderboard from "@/components/Leaderboard";
import { useSnakeGame } from "@/hooks/useSnakeGame";

// ─── Screen size helper ───────────────────────────────────────────────────────

function useGameSize() {
  const [size, setSize] = useState(320);
  useEffect(() => {
    const calc = () => {
      // Leave room for header (~56px) + info bar (~48px) + controls region (~160px) + padding
      const maxH = window.innerHeight - 56 - 48 - 160 - 24;
      const maxW = window.innerWidth - 32;
      setSize(Math.min(maxW, maxH, 360));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);
  return size;
}

// ─── Level colour helper ──────────────────────────────────────────────────────

const LEVEL_COLOURS = [
  "text-neon-cyan",   // 1
  "text-green-400",   // 2
  "text-lime-400",    // 3
  "text-yellow-400",  // 4
  "text-orange-400",  // 5
  "text-rose-400",    // 6
  "text-pink-400",    // 7
  "text-neon-purple", // 8
];

// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  // ── Telegram identity ──────────────────────────────────────────────
  const [userId, setUserId]   = useState(0);
  const [username, setUsername] = useState("");
  const [highScore, setHighScore] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const bootSynced = useRef(false);

  // ── UI state ───────────────────────────────────────────────────────
  const [screen, setScreen] = useState<"start" | "game" | "gameover" | "leaderboard">("start");
  const [lastScore, setLastScore] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);

  const gameSize = useGameSize();

  // ── Snake game engine ──────────────────────────────────────────────
  const onDeath = useCallback(
    async (score: number) => {
      setLastScore(score);
      setScreen("gameover");

      if (!userId) return;
      setIsSyncing(true);
      try {
        const res = await syncPlayerAndScore(userId, username, score, true);
        if (res.success) {
          setIsNewBest(score >= res.highScore && score > 0);
          setHighScore(res.highScore);
          setTotalGames(res.totalGames);
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [userId, username],
  );

  const [gameState, gameControls] = useSnakeGame(onDeath);

  // ── Boot: parse Telegram identity + load stored high score ────────
  useEffect(() => {
    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
    if (tg) { tg.ready(); tg.expand(); }

    let parsedId = 0;
    let parsedName = "";

    try {
      const lp = retrieveLaunchParams();
      const user = lp.tgWebAppData?.user;
      if (user) { parsedId = user.id; parsedName = user.username ?? ""; }
    } catch { /* not in Telegram */ }

    if (!parsedId && tg?.initDataUnsafe?.user) {
      parsedId = tg.initDataUnsafe.user.id;
      parsedName = tg.initDataUnsafe.user.username ?? "";
    }

    setUserId(parsedId);
    setUsername(parsedName);

    if (!bootSynced.current && parsedId) {
      bootSynced.current = true;
      syncPlayerAndScore(parsedId, parsedName, 0, false).then((res) => {
        if (res.success) {
          setHighScore(res.highScore);
          setTotalGames(res.totalGames);
          gameControls.setHighScore(res.highScore);
        }
      });
    }
  }, [gameControls]);

  // ── Derived ────────────────────────────────────────────────────────
  const isGuest     = userId === 0;
  const displayName = isGuest ? "Guest" : `@${username || "player"}`;
  const levelColour = LEVEL_COLOURS[(gameState.level - 1) % LEVEL_COLOURS.length];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-slate-950 text-slate-100 select-none">

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,211,238,0.07),transparent_60%)]" />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="relative z-10 flex shrink-0 items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-neon-blue to-neon-cyan">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor" aria-hidden="true">
              <path d="M13 2L4.5 12.5h7L9 22l9-11h-7L13 2z"/>
            </svg>
          </div>
          <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">Snake Arcade</span>
        </div>
        <div className="text-right">
          <p className="text-[0.6rem] text-slate-500 uppercase tracking-wider">Player</p>
          <p className="text-xs font-semibold text-slate-300">{displayName}</p>
        </div>
      </header>

      {/* ── Info bar (score / level / best) ─────────────────────────── */}
      <div className="relative z-10 shrink-0 grid grid-cols-3 gap-2 px-5 pb-2">
        <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
          <p className="text-[0.6rem] text-slate-500 uppercase tracking-wider">Score</p>
          <p className="text-lg font-extrabold tabular-nums text-neon-blue leading-none">
            {screen === "game" ? gameState.score : lastScore}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
          <p className="text-[0.6rem] text-slate-500 uppercase tracking-wider">Level</p>
          <p className={`text-lg font-extrabold tabular-nums leading-none ${levelColour}`}>
            {screen === "game" ? gameState.level : 1}
          </p>
        </div>
        <div className="rounded-xl border border-neon-gold/15 bg-neon-gold/5 px-3 py-2">
          <p className="text-[0.6rem] text-slate-500 uppercase tracking-wider">Best</p>
          <p className="text-lg font-extrabold tabular-nums text-neon-gold leading-none">
            {highScore}
          </p>
        </div>
      </div>

      {/* ── Canvas area ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-start pt-1 px-5">
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ width: gameSize, height: gameSize }}
        >
          {/* Always render canvas so it's ready */}
          <SnakeCanvas
            snake={gameState.snake}
            food={gameState.food}
            phase={gameState.phase}
            sizePx={gameSize}
          />

          {/* Swipe + D-pad overlay — only active during gameplay */}
          {screen === "game" && (
            <SwipeControls onDirection={gameControls.changeDirection} />
          )}

          {/* ── Start screen overlay ───────────────────────────────── */}
          {screen === "start" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm animate-fade-in rounded-2xl">
              <div className="text-5xl mb-3">🐍</div>
              <h1 className="text-2xl font-extrabold tracking-widest text-white uppercase mb-1">
                Snake
              </h1>
              <p className="text-xs text-slate-400 mb-6 text-center px-6">
                Eat food to grow. Don&apos;t hit the walls or yourself.
              </p>
              <button
                onClick={() => { setScreen("game"); setIsNewBest(false); gameControls.startGame(); }}
                className="rounded-2xl bg-gradient-to-r from-neon-blue to-neon-cyan px-8 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-neon-blue/30 active:scale-95 transition-transform"
              >
                Play Now
              </button>
              {!isGuest && totalGames > 0 && (
                <p className="mt-3 text-xs text-slate-500">{totalGames} games played</p>
              )}
            </div>
          )}

          {/* ── Game-over overlay ──────────────────────────────────── */}
          {screen === "gameover" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-fade-in rounded-2xl px-6">
              <div className="text-4xl mb-2">💀</div>
              <h2 className="text-xl font-extrabold tracking-widest text-white uppercase mb-1">
                Game Over
              </h2>

              {/* Score */}
              <div className="my-3 text-center">
                <p className="text-4xl font-black tabular-nums text-neon-blue">
                  {lastScore}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isNewBest ? "🎉 New best score!" : `Best: ${highScore}`}
                </p>
              </div>

              {isSyncing ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                  <span className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-neon-cyan"/>
                  Saving…
                </div>
              ) : (
                <div className="mb-4 h-4" />
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => { setScreen("game"); setIsNewBest(false); gameControls.startGame(); }}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-neon-blue to-neon-cyan py-3 text-sm font-bold uppercase tracking-wider text-white active:scale-95 transition-transform"
                >
                  Retry
                </button>
                <button
                  onClick={() => setScreen("leaderboard")}
                  className="flex-1 rounded-2xl border border-neon-gold/30 bg-neon-gold/10 py-3 text-sm font-bold uppercase tracking-wider text-neon-gold active:scale-95 transition-transform"
                >
                  Scores
                </button>
              </div>

              <button
                onClick={() => setScreen("start")}
                className="mt-2 text-xs text-slate-500 underline underline-offset-2"
              >
                Main menu
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0 px-5 pb-5 pt-2">
        {screen === "game" ? (
          <p className="text-center text-[0.65rem] text-slate-600">
            Swipe or use D-pad · {gameState.level < 8 ? `Level ${gameState.level} — eat ${5 - ((gameState.snake.length - 3) % 5)} more to level up` : "MAX SPEED 🔥"}
          </p>
        ) : (
          <button
            onClick={() => setScreen("leaderboard")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-300 active:scale-95 transition-transform"
          >
            <span>🏆</span> Global Leaderboard
          </button>
        )}
      </div>

      {/* ── Leaderboard overlay ─────────────────────────────────────── */}
      {screen === "leaderboard" && (
        <Leaderboard
          currentUserId={String(userId)}
          onClose={() => setScreen(lastScore > 0 ? "gameover" : "start")}
        />
      )}
    </main>
  );
}
