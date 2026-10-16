"use client";

import { useState, useEffect } from "react";
import BalanceCard from "@/components/BalanceCard";
import StreakWidget from "@/components/StreakWidget";
import QuestCard, { type QuestData } from "@/components/QuestCard";
import AppHeader from "@/components/AppHeader";
import { getQuests } from "@/app/actions";

interface HomeScreenProps {
  userId: number;
  userData: {
    novaBalance: number;
    totalEarned: number;
    level: number;
    xp: number;
    xpForNext: number;
    firstName?: string | null;
    username?: string | null;
  };
  streakData: {
    currentStreak: number;
    canClaim: boolean;
  };
  onBalanceUpdate: (delta: number) => void;
  onStreakClaimed: (bonus: number, newStreak: number) => void;
  onNavigateRedeem: () => void;
  onNavigateQuests: () => void;
}

export default function HomeScreen({
  userId,
  userData,
  streakData,
  onBalanceUpdate,
  onStreakClaimed,
  onNavigateRedeem,
  onNavigateQuests,
}: HomeScreenProps) {
  const [quests, setQuests]   = useState<QuestData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQuests(userId).then((q) => {
      setQuests(q.slice(0, 4));
      setLoading(false);
    });
  }, [userId]);

  const handleQuestCompleted = (questId: string, novaEarned: number) => {
    onBalanceUpdate(novaEarned);
    setQuests((prev) =>
      prev.map((q) => (q.id === questId ? { ...q, completed: true } : q))
    );
  };

  // Next streak bonus = (streak + 1) * 50 XP, capped at 200 for the bonus card display
  const nextBonus = Math.min((streakData.currentStreak + 1) * 50, 200);

  return (
    <div
      className="flex flex-col min-h-full"
      style={{ background: "#0d0b1a" }}
    >
      {/* ── Header: avatar + name + XP bar ─────────────────────────── */}
      <AppHeader
        firstName={userData.firstName}
        username={userData.username}
        level={userData.level}
        xp={userData.xp}
        xpForNext={userData.xpForNext}
      />

      {/* ── Scrollable body ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 px-4 pb-28 pt-2">

        {/* Balance card */}
        <BalanceCard
          novaBalance={userData.novaBalance}
          totalEarned={userData.totalEarned}
          level={userData.level}
          xp={userData.xp}
          xpForNext={userData.xpForNext}
          firstName={userData.firstName}
          onRedeem={onNavigateRedeem}
          onHistory={onNavigateRedeem}
        />

        {/* Today's Quests header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-black text-white">Today's Quests</h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(167,139,250,0.5)" }}>
              Complete quests and earn XP
            </p>
          </div>
          <button
            onClick={onNavigateQuests}
            className="flex items-center gap-1 text-xs font-semibold mt-0.5"
            style={{ color: "#a855f7" }}
            aria-label="View all quests"
          >
            View all
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" stroke="#a855f7" strokeWidth="2.5" fill="none" aria-hidden="true">
              <path d="M9 18l6-6-6-6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Quest list */}
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl"
                style={{
                  background: "linear-gradient(135deg,rgba(42,26,94,0.4),rgba(22,16,56,0.6))",
                  border: "1px solid rgba(139,92,246,0.1)",
                  animation: "pulse 1.8s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {quests.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                userId={userId}
                onCompleted={handleQuestCompleted}
              />
            ))}
          </div>
        )}

        {/* Streak section — 2 cards side by side */}
        <StreakWidget
          userId={userId}
          currentStreak={streakData.currentStreak}
          nextStreakBonus={nextBonus}
          canClaim={streakData.canClaim}
          onClaimed={onStreakClaimed}
        />
      </div>
    </div>
  );
}
