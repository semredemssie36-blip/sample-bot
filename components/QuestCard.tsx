"use client";

import { useState } from "react";
import { completeQuest } from "@/app/actions";

export interface QuestData {
  id: string;
  title: string;
  description: string;
  iconEmoji: string;
  type: string;
  difficulty: string;
  minutesEst: number;
  novaReward: number;
  xpReward: number;
  targetCount: number;
  progress: number;
  completed: boolean;
  channelUsername?: string | null;
  channelUrl?: string | null;
  // optional cashback variant (sponsored quests)
  cashbackPct?: number;
}

interface QuestCardProps {
  quest: QuestData;
  userId: number;
  onCompleted: (questId: string, novaEarned: number) => void;
}

const DIFFICULTY_STYLE: Record<string, { label: string; color: string }> = {
  EASY:   { label: "Easy",   color: "#22c55e" },
  MEDIUM: { label: "Medium", color: "#f59e0b" },
  HARD:   { label: "Hard",   color: "#ef4444" },
};

// Icon background colours per quest type
const ICON_BG: Record<string, string> = {
  DAILY_CHECKIN:  "linear-gradient(135deg,#7c3aed,#4f46e5)",
  WATCH_AD:       "linear-gradient(135deg,#7c3aed,#a855f7)",
  INVITE_FRIENDS: "linear-gradient(135deg,#2563eb,#3b82f6)",
  JOIN_CHANNEL:   "linear-gradient(135deg,#0891b2,#06b6d4)",
  PLAY_GAME:      "linear-gradient(135deg,#7c3aed,#6d28d9)",
  SOCIAL_FOLLOW:  "linear-gradient(135deg,#0f766e,#14b8a6)",
  SPONSORED:      "linear-gradient(135deg,#16a34a,#22c55e)",
};

export default function QuestCard({ quest, userId, onCompleted }: QuestCardProps) {
  const [loading, setLoading]           = useState(false);
  const [localCompleted, setLocalCompleted] = useState(quest.completed);
  const [localProgress, setLocalProgress]   = useState(quest.progress);

  const pct      = Math.min((localProgress / Math.max(quest.targetCount, 1)) * 100, 100);
  const diffInfo = DIFFICULTY_STYLE[quest.difficulty] ?? DIFFICULTY_STYLE.EASY;
  const iconBg   = ICON_BG[quest.type] ?? ICON_BG.DAILY_CHECKIN;
  const isSponsor = quest.type === "SPONSORED";

  const handleGo = async () => {
    if (loading || localCompleted) return;
    setLoading(true);
    try {
      const res = await completeQuest(userId, quest.id);
      if (res.success) {
        const np = localProgress + 1;
        setLocalProgress(np);
        if (res.completed) {
          setLocalCompleted(true);
          onCompleted(quest.id, quest.novaReward);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col rounded-2xl px-4 py-3.5 transition-opacity"
      style={{
        background: "linear-gradient(135deg, rgba(42,26,94,0.7) 0%, rgba(30,18,69,0.9) 100%)",
        border: "1px solid rgba(139,92,246,0.18)",
        opacity: localCompleted ? 0.65 : 1,
      }}
      aria-label={`Quest: ${quest.title}`}
    >
      <div className="flex items-center gap-3">
        {/* Icon box */}
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
          style={{ background: iconBg }}
          aria-hidden="true"
        >
          {quest.iconEmoji}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">{quest.title}</p>
          <p className="text-xs text-purple-300/60 mt-0.5 leading-snug truncate">{quest.description}</p>

          {/* Difficulty + time */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold"
              style={{
                color: diffInfo.color,
                background: `${diffInfo.color}20`,
                border: `1px solid ${diffInfo.color}40`,
              }}
            >
              {diffInfo.label}
            </span>
            <span className="text-[0.6rem] text-purple-400/50">•</span>
            <span className="text-[0.6rem] text-purple-400/60">{quest.minutesEst} mins</span>
          </div>
        </div>

        {/* Right: rewards + arrow */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          {isSponsor && quest.cashbackPct ? (
            <div className="text-right">
              <p className="text-sm font-black" style={{ color: "#22c55e" }}>
                {quest.cashbackPct}%
              </p>
              <p className="text-[0.6rem] font-bold" style={{ color: "#22c55e" }}>Cashback</p>
            </div>
          ) : (
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <span className="text-sm font-black text-white">+{quest.xpReward}</span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[0.6rem] font-black text-white"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
                >
                  XP
                </span>
              </div>
              <div className="flex items-center gap-1 justify-end mt-0.5">
                <span className="text-xs font-bold text-yellow-400">
                  +{Math.floor(quest.novaReward / 50)}
                </span>
                <span className="text-xs text-yellow-400">🪙</span>
              </div>
            </div>
          )}

          {/* Arrow / done button */}
          <button
            onClick={handleGo}
            disabled={localCompleted || loading}
            aria-label={localCompleted ? "Completed" : `Start ${quest.title}`}
            className="mt-1 flex h-7 w-7 items-center justify-center rounded-full transition-all active:scale-90"
            style={{
              background: localCompleted
                ? "rgba(34,197,94,0.15)"
                : "rgba(139,92,246,0.25)",
              border: localCompleted
                ? "1px solid rgba(34,197,94,0.4)"
                : "1px solid rgba(139,92,246,0.4)",
            }}
          >
            {loading ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white block" />
            ) : localCompleted ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" stroke="#22c55e" strokeWidth="2.5" fill="none" aria-hidden="true">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" stroke="#a855f7" strokeWidth="2.5" fill="none" aria-hidden="true">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Progress bar — always shown */}
      <div className="mt-3">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
          role="progressbar"
          aria-valuenow={localProgress}
          aria-valuemax={quest.targetCount}
          aria-label={`${localProgress}/${quest.targetCount}`}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: localCompleted
                ? "linear-gradient(90deg,#16a34a,#22c55e)"
                : "linear-gradient(90deg,#7c3aed,#a855f7)",
            }}
          />
        </div>
        <p className="mt-1 text-right text-[0.6rem] text-purple-400/50">
          {localProgress}/{quest.targetCount}
        </p>
      </div>
    </div>
  );
}
