"use client";

import { useEffect, useState } from "react";
import { getLeaderboard, type LeaderboardEntry } from "@/app/actions";

interface LeaderboardProps {
  currentUserId: string;
  onClose: () => void;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function Leaderboard({ currentUserId, onClose }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  return (
    /* Full-screen dark overlay */
    <div className="absolute inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-widest text-white uppercase">
            Leaderboard
          </h2>
          <p className="text-xs text-slate-500 tracking-wider mt-0.5">Top 10 All-Time</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 hover:text-white transition-colors"
          aria-label="Close leaderboard"
        >
          ✕
        </button>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-neon-cyan" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center text-slate-500 mt-16 text-sm">
            No scores yet — be the first!
          </p>
        ) : (
          entries.map((entry) => {
            const isMe = entry.id === currentUserId;
            return (
              <div
                key={entry.id}
                className={[
                  "flex items-center gap-3 rounded-2xl px-4 py-3 transition-all",
                  isMe
                    ? "border border-neon-cyan/30 bg-neon-cyan/10"
                    : "border border-white/5 bg-white/[0.03]",
                ].join(" ")}
              >
                {/* Rank */}
                <span className="w-8 shrink-0 text-center text-lg">
                  {MEDAL[entry.rank] ?? (
                    <span className="text-sm font-bold text-slate-500">
                      #{entry.rank}
                    </span>
                  )}
                </span>

                {/* Username */}
                <div className="flex-1 min-w-0">
                  <p className={[
                    "font-semibold truncate text-sm",
                    isMe ? "text-neon-cyan" : "text-slate-200",
                  ].join(" ")}>
                    {isMe ? "You" : `@${entry.username}`}
                  </p>
                  <p className="text-[0.65rem] text-slate-500 tabular-nums">
                    {entry.totalGames} game{entry.totalGames !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* High score */}
                <span className={[
                  "shrink-0 text-lg font-extrabold tabular-nums",
                  entry.rank === 1 ? "text-neon-gold" : isMe ? "text-neon-cyan" : "text-slate-300",
                ].join(" ")}>
                  {entry.highScore.toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-6 pt-3">
        <button
          onClick={onClose}
          className="w-full rounded-2xl bg-gradient-to-r from-neon-blue to-neon-cyan py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-neon-blue/30 active:scale-95 transition-transform"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
