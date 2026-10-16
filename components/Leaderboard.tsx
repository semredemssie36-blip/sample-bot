"use client";

// NovaDrop leaderboard component — used inside ProfileScreen
// (kept in components/ for backwards-compat imports)

import { useEffect, useState } from "react";
import { getLeaderboard } from "@/app/actions";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  totalEarned: number;
  level: number;
}

interface LeaderboardProps {
  currentUserId: string;
  onClose?: () => void;
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
    <div className="flex flex-col gap-2">
      {/* Optional close button */}
      {onClose && (
        <div className="flex justify-end mb-1">
          <button
            onClick={onClose}
            className="text-xs text-nova-muted underline underline-offset-2"
            aria-label="Close leaderboard"
          >
            Close
          </button>
        </div>
      )}

      {loading ? (
        Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="nova-card h-14 shimmer" />
        ))
      ) : entries.length === 0 ? (
        <p className="text-center text-nova-muted py-10 text-sm">No entries yet</p>
      ) : (
        entries.map((entry) => {
          const isMe = entry.id === currentUserId;
          return (
            <div
              key={entry.id}
              className={`nova-card flex items-center gap-3 px-4 py-3
                ${isMe ? "border-nova-violet/40 bg-nova-violet/5" : ""}`}
              aria-current={isMe ? "true" : undefined}
            >
              <span className={`w-7 shrink-0 text-center text-sm font-black
                ${entry.rank === 1 ? "text-nova-gold" :
                  entry.rank === 2 ? "text-slate-300" :
                  entry.rank === 3 ? "text-orange-400" : "text-nova-muted"}`}>
                {MEDAL[entry.rank] ?? entry.rank}
              </span>
              <p className={`flex-1 text-sm font-semibold truncate
                ${isMe ? "text-nova-violet" : "text-white"}`}>
                {entry.name}{isMe ? " (you)" : ""}
              </p>
              <span className="text-xs text-nova-muted">Lv.{entry.level}</span>
              <span className="text-sm font-bold text-nova-gold tabular-nums">
                {entry.totalEarned.toLocaleString()}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
