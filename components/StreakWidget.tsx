"use client";

import { useState } from "react";
import { claimDailyStreak } from "@/app/actions";

interface StreakWidgetProps {
  userId: number;
  currentStreak: number;
  nextStreakBonus: number;  // XP bonus for completing next day
  canClaim: boolean;
  onClaimed: (bonus: number, newStreak: number) => void;
}

const DAY_ABBREVS = ["M", "T", "W", "T", "F", "S", "S"];
const STREAK_GOAL = 8; // days for full bonus bar

export default function StreakWidget({
  userId,
  currentStreak,
  nextStreakBonus,
  canClaim,
  onClaimed,
}: StreakWidgetProps) {
  const [loading, setClaiming]  = useState(false);
  const [claimed, setClaimed]   = useState(!canClaim);
  const [streak, setStreak]     = useState(currentStreak);

  const streakPct = Math.min((streak / STREAK_GOAL) * 100, 100);

  const handleClaim = async () => {
    if (loading || claimed) return;
    setClaiming(true);
    try {
      const res = await claimDailyStreak(userId);
      if (res.success && res.streak !== undefined && res.bonus !== undefined) {
        setStreak(res.streak);
        setClaimed(true);
        onClaimed(res.bonus, res.streak);
      }
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3" aria-label="Streak section">

      {/* ── Left card: Daily Streak ─────────────────────────────────── */}
      <div
        className="flex flex-col rounded-2xl px-4 py-4"
        style={{
          background: "linear-gradient(135deg, rgba(42,26,94,0.8) 0%, rgba(22,16,56,0.95) 100%)",
          border: "1px solid rgba(139,92,246,0.2)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-base" aria-hidden="true">🔥</span>
          <span className="text-xs font-bold text-white">Daily Streak</span>
        </div>

        {/* Big number */}
        <p className="text-3xl font-black text-white leading-none">
          {streak}{" "}
          <span className="text-base font-bold text-purple-300">Days</span>
        </p>
        <p className="text-[0.6rem] text-purple-400/60 mt-0.5 mb-3">Keep it up!</p>

        {/* Day dots */}
        <div className="flex items-center justify-between" role="list" aria-label="Weekly streak days">
          {DAY_ABBREVS.map((day, i) => {
            const dayNum = i + 1;
            const done   = dayNum <= (streak % 7 || (streak > 0 ? 7 : 0));
            return (
              <div key={`${day}-${i}`} className="flex flex-col items-center gap-0.5" role="listitem">
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[0.55rem] font-bold"
                  style={done
                    ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
                    : { background: "rgba(255,255,255,0.06)", color: "rgba(167,139,250,0.5)" }
                  }
                  aria-label={`${day}${done ? " completed" : ""}`}
                >
                  {done ? (
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" stroke="white" strokeWidth="3" fill="none" aria-hidden="true">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round"/>
                    </svg>
                  ) : day}
                </div>
                <span className="text-[0.45rem] text-purple-400/40 uppercase">{day}</span>
              </div>
            );
          })}
        </div>

        {/* Claim button */}
        <button
          onClick={handleClaim}
          disabled={claimed || loading}
          className="mt-3 w-full rounded-xl py-2 text-xs font-bold transition-all active:scale-95"
          style={claimed
            ? { background: "rgba(255,255,255,0.05)", color: "rgba(167,139,250,0.4)" }
            : { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
          }
          aria-busy={loading}
        >
          {loading ? "…" : claimed ? "✓ Claimed" : "Claim Day"}
        </button>
      </div>

      {/* ── Right card: Streak Bonus ────────────────────────────────── */}
      <div
        className="flex flex-col rounded-2xl px-4 py-4"
        style={{
          background: "linear-gradient(135deg, rgba(42,26,94,0.8) 0%, rgba(22,16,56,0.95) 100%)",
          border: "1px solid rgba(139,92,246,0.2)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-base" aria-hidden="true">🎁</span>
          <span className="text-xs font-bold text-white">Streak Bonus</span>
        </div>

        {/* Bonus amount */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-3xl font-black text-white leading-none">
            +{nextStreakBonus}
          </span>
          <span
            className="self-start mt-1 rounded-full px-1.5 py-0.5 text-[0.6rem] font-black text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
          >
            XP
          </span>
        </div>
        <p className="text-[0.6rem] text-purple-400/60 mb-3">
          Complete {Math.max(1, STREAK_GOAL - streak)} more day{STREAK_GOAL - streak !== 1 ? "s" : ""}
        </p>

        {/* Bonus progress bar */}
        <div
          className="h-2 w-full overflow-hidden rounded-full mb-1"
          style={{ background: "rgba(255,255,255,0.06)" }}
          role="progressbar"
          aria-valuenow={streak}
          aria-valuemax={STREAK_GOAL}
          aria-label={`Streak ${streak}/${STREAK_GOAL}`}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${streakPct}%`,
              background: "linear-gradient(90deg,#f59e0b,#fbbf24)",
            }}
          />
        </div>
        <p className="text-right text-[0.55rem] text-purple-400/40">{streak}/{STREAK_GOAL}</p>

        {/* Days completed tally */}
        <div className="mt-auto pt-2">
          <p className="text-[0.6rem] text-purple-400/50">
            {streak} day{streak !== 1 ? "s" : ""} completed
          </p>
        </div>
      </div>
    </div>
  );
}
