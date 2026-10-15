"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { retrieveLaunchParams } from "@telegram-apps/sdk-react";
import { syncPlayerAndScore } from "./actions";

/** A transient "+1" indicator spawned on each tap. */
interface Floater {
  id: number;
  offsetX: number;
}

export default function HomePage() {
  // ── Telegram SDK ──────────────────────────────────────────────────────
  // retrieveLaunchParams() reads the Telegram launch parameters (including
  // the parsed init data user) from the URL hash or the global
  // window.Telegram.WebApp.  It throws outside Telegram, so we guard it
  // with try/catch inside useEffect (client-only) to avoid SSR issues
  // and hydration mismatches.

  // ── Player & game state ──────────────────────────────────────────────
  const [userId, setUserId] = useState(0);
  const [username, setUsername] = useState("");
  const [currentScore, setCurrentScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const [bootLoading, setBootLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [floaters, setFloaters] = useState<Floater[]>([]);

  // Guards against duplicate boot-sync calls caused by effect re-runs.
  const bootSyncedRef = useRef(false);

  // ── Parse Telegram user + boot sync ──────────────────────────────────
  useEffect(() => {
    // Signal the Telegram WebApp that we are ready and request full height.
    const tg =
      typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
    if (tg) {
      tg.ready();
      tg.expand();
    }

    // Resolve the player identity: SDK launch params → raw WebApp API → guest.
    let parsedId = 0;
    let parsedName = "";

    try {
      const lp = retrieveLaunchParams();
      const user = lp.tgWebAppData?.user;
      if (user) {
        parsedId = user.id;
        parsedName = user.username ?? "";
      }
    } catch {
      // Not running inside Telegram via the SDK — fall through to raw API.
    }

    // Fallback: read directly from the raw Telegram WebApp global.
    if (!parsedId && tg?.initDataUnsafe?.user) {
      parsedId = tg.initDataUnsafe.user.id;
      parsedName = tg.initDataUnsafe.user.username ?? "";
    }

    setUserId(parsedId);
    setUsername(parsedName);

    // Boot sync: send score 0 to create/verify the player and read back
    // their all-time best score from the database.
    if (!bootSyncedRef.current) {
      bootSyncedRef.current = true;
      if (parsedId) {
        syncPlayerAndScore(parsedId, parsedName, 0)
          .then((res) => {
            if (res.success) setHighScore(res.highScore);
          })
          .catch(() => {})
          .finally(() => setBootLoading(false));
      } else {
        // Guest mode — no Telegram context available.
        setBootLoading(false);
      }
    }
  }, []);

  // ── Tap handler ──────────────────────────────────────────────────────
  const handleTap = useCallback(() => {
    setCurrentScore((s) => s + 1);
    setSyncStatus("idle");

    // Spawn a floating "+1" indicator at a random horizontal offset.
    const id = Date.now() + Math.random();
    const offsetX = (Math.random() - 0.5) * 70;
    setFloaters((prev) => [...prev, { id, offsetX }]);
    window.setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id));
    }, 700);
  }, []);

  // ── Sync handler (manual save) ───────────────────────────────────────
  const handleSync = useCallback(async () => {
    if (!userId || isSyncing || currentScore === 0) return;
    setIsSyncing(true);
    setSyncStatus("idle");
    try {
      const res = await syncPlayerAndScore(userId, username, currentScore);
      if (res.success) {
        setHighScore(res.highScore);
        setSyncStatus("success");
      } else {
        setSyncStatus("error");
      }
    } catch {
      setSyncStatus("error");
    } finally {
      setIsSyncing(false);
    }
  }, [userId, username, currentScore, isSyncing]);

  // ── Derived flags ────────────────────────────────────────────────────
  const isGuest = userId === 0;
  const isNewBest = currentScore > highScore && currentScore > 0;
  const displayName = isGuest
    ? "Guest Player"
    : `@${username || "player"}`;

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────
  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(59,130,246,0.12),transparent_55%)]" />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 pb-2 pt-5">
        <div className="flex items-center gap-2.5">
          {/* Logo asset placeholder */}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-blue to-neon-cyan shadow-lg shadow-neon-blue/40">
            <svg
              className="h-5 w-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M13 2L4.5 12.5h7L9 22l9-11h-7L13 2z" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-widest text-slate-200">
            TAP ARCADE
          </span>
        </div>
        <div className="text-right">
          <p className="text-[0.65rem] font-medium uppercase tracking-wider text-slate-500">
            Player
          </p>
          <p className="text-sm font-semibold text-slate-200">{displayName}</p>
        </div>
      </header>

      {/* ── Score board ───────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-2">
        <div className="grid grid-cols-2 gap-3">
          {/* Current Run */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-[0.65rem] font-medium uppercase tracking-wider text-slate-400">
              Current Run
            </p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-neon-blue">
              {currentScore}
            </p>
          </div>

          {/* All-Time Best */}
          <div className="rounded-2xl border border-neon-gold/20 bg-neon-gold/5 p-4 backdrop-blur-sm">
            <p className="text-[0.65rem] font-medium uppercase tracking-wider text-slate-400">
              All-Time Best
            </p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-neon-gold">
              {bootLoading ? "…" : highScore}
            </p>
          </div>
        </div>

        {/* New-record badge */}
        {isNewBest && (
          <div className="mt-2 text-center">
            <span className="inline-block animate-pulse rounded-full bg-neon-gold/15 px-3 py-1 text-xs font-semibold text-neon-gold">
              ✦ NEW RECORD — TAP SAVE! ✦
            </span>
          </div>
        )}
      </section>

      {/* ── Main game area ────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        {/* Neon tap button */}
        <div className="relative flex items-center justify-center">
          {/* Floating "+1" indicators */}
          {floaters.map((f) => (
            <span
              key={f.id}
              className="animate-float-up pointer-events-none absolute bottom-1/2 text-2xl font-bold text-neon-cyan"
              style={{ left: `calc(50% + ${f.offsetX}px)` }}
            >
              +1
            </span>
          ))}

          <button
            onClick={handleTap}
            aria-label="Tap to score a point"
            className="relative flex h-56 w-56 select-none items-center justify-center rounded-full bg-gradient-to-br from-neon-blue via-neon-cyan to-neon-purple text-center shadow-[0_0_60px_rgba(34,211,238,0.45)] transition-transform duration-100 ease-out active:scale-95"
          >
            {/* Inner ring for depth */}
            <span className="absolute inset-2 rounded-full border-2 border-white/20" />
            <span className="absolute inset-0 animate-pulse-glow rounded-full" />

            {/* Label */}
            <span className="relative z-10 flex flex-col items-center">
              <svg
                className="mb-1.5 h-8 w-8 text-white/90"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74a4 4 0 1 1-5 0zM10 15a2 2 0 1 0 4 0 2 2 0 0 0-4 0z" />
              </svg>
              <span className="text-lg font-extrabold uppercase tracking-wider text-white drop-shadow-lg">
                Tap to Score
              </span>
            </span>
          </button>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          Tap the orb to build your score
        </p>
      </section>

      {/* ── Footer action ─────────────────────────────────────────────── */}
      <footer className="relative z-10 px-6 pb-6 pt-3">
        <button
          onClick={handleSync}
          disabled={!userId || isSyncing || currentScore === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-neon-blue to-neon-cyan py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-neon-blue/30 transition-all duration-150 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:saturate-50"
        >
          {isSyncing ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving…
            </>
            ) : (
            <>
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Progress
            </>
          )}
        </button>

        {/* Status messages */}
        <div className="mt-2 h-5 text-center text-xs font-medium">
          {syncStatus === "success" && (
            <span className="text-neon-cyan">
              ✓ Score saved to the leaderboard!
            </span>
          )}
          {syncStatus === "error" && (
            <span className="text-red-400">
              ✗ Failed to save. Check your connection.
            </span>
          )}
          {isGuest && currentScore === 0 && (
            <span className="text-slate-500">
              Open inside Telegram to save & sync scores
            </span>
          )}
        </div>
      </footer>
    </main>
  );
}
