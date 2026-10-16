"use client";

import { useState, useEffect } from "react";
import QuestCard, { type QuestData } from "@/components/QuestCard";
import { getQuests } from "@/app/actions";

interface QuestsScreenProps {
  userId: number;
  onBalanceUpdate: (delta: number) => void;
}

const FILTER_TABS = [
  { id: "all",      label: "All" },
  { id: "DAILY_CHECKIN", label: "Daily" },
  { id: "WATCH_AD",      label: "Ads" },
  { id: "INVITE_FRIENDS","label": "Invite" },
  { id: "SPONSORED",     label: "Sponsor" },
] as const;

type FilterId = (typeof FILTER_TABS)[number]["id"];

export default function QuestsScreen({ userId, onBalanceUpdate }: QuestsScreenProps) {
  const [quests, setQuests] = useState<QuestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterId>("all");

  useEffect(() => {
    getQuests(userId).then((q) => {
      setQuests(q);
      setLoading(false);
    });
  }, [userId]);

  const handleCompleted = (questId: string, novaEarned: number) => {
    onBalanceUpdate(novaEarned);
    setQuests((prev) =>
      prev.map((q) => (q.id === questId ? { ...q, completed: true } : q))
    );
  };

  const filtered = filter === "all"
    ? quests
    : quests.filter((q) => q.type === filter);

  const completedCount = quests.filter((q) => q.completed).length;
  const totalCount = quests.length;

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-nova-bg/95 backdrop-blur-md px-4 pt-4 pb-3 border-b border-nova-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-black text-white">Quests</h1>
          <span className="text-xs text-nova-muted">
            {completedCount}/{totalCount} done
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-nova-gradient transition-all duration-700"
            style={{ width: totalCount ? `${(completedCount / totalCount) * 100}%` : "0%" }}
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemax={totalCount}
            aria-label="Quest completion progress"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Quest filters">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150
                ${filter === tab.id
                  ? "bg-nova-gradient text-white shadow-sm shadow-nova-purple/30"
                  : "bg-white/5 text-nova-muted"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quest list */}
      <div className="px-4 pt-3 space-y-2.5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="nova-card h-20 shimmer" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3" aria-hidden="true">🎯</span>
            <p className="text-sm font-semibold text-white">No quests here yet</p>
            <p className="text-xs text-nova-muted mt-1">Check back soon for new tasks</p>
          </div>
        ) : (
          filtered.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              userId={userId}
              onCompleted={handleCompleted}
            />
          ))
        )}
      </div>
    </div>
  );
}
