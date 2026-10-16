"use client";

import { useState, useEffect } from "react";
import QuestCard, { type QuestData } from "@/components/QuestCard";
import { getQuests, verifyChannelMembership, completeQuest } from "@/app/actions";

interface QuestsScreenProps {
  userId: number;
  onBalanceUpdate: (delta: number) => void;
}

const FILTER_TABS = [
  { id: "all",            label: "All"    },
  { id: "DAILY_CHECKIN",  label: "Daily"  },
  { id: "WATCH_AD",       label: "Ads"    },
  { id: "JOIN_CHANNEL",   label: "Join"   },
  { id: "INVITE_FRIENDS", label: "Invite" },
  { id: "SPONSORED",      label: "Sponsor"},
] as const;

type FilterId = (typeof FILTER_TABS)[number]["id"];

export default function QuestsScreen({ userId, onBalanceUpdate }: QuestsScreenProps) {
  const [quests, setQuests]   = useState<QuestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<FilterId>("all");
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

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

  // Special handler for JOIN_CHANNEL quests — verify via Telegram API first
  const handleChannelQuest = async (quest: QuestData) => {
    if (!quest.channelUsername) {
      // No channel to verify — just open the link and mark complete
      if (quest.channelUrl) window.open(quest.channelUrl, "_blank");
      return;
    }
    setVerifying(quest.id);
    setVerifyMsg(null);

    // Open the channel first so user can join
    if (quest.channelUrl) {
      window.open(quest.channelUrl, "_blank");
    }

    // Wait 3 seconds then verify
    await new Promise((r) => setTimeout(r, 3000));

    const result = await verifyChannelMembership(userId, quest.channelUsername);

    if (result.success && result.isMember) {
      const res = await completeQuest(userId, quest.id);
      if (res.success && res.completed) {
        handleCompleted(quest.id, quest.novaReward);
        setVerifyMsg({ id: quest.id, msg: "✅ Verified! Reward added.", ok: true });
      }
    } else {
      setVerifyMsg({ id: quest.id, msg: "❌ Not joined yet. Join the channel first, then try again.", ok: false });
    }
    setVerifying(null);
  };

  const filtered = filter === "all"
    ? quests
    : quests.filter((q) => q.type === filter);

  const completedCount = quests.filter((q) => q.completed).length;
  const totalCount     = quests.length;

  return (
    <div className="flex flex-col pb-24">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 px-4 pt-4 pb-3"
        style={{ background: "rgba(13,11,26,0.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(139,92,246,0.15)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-black text-white">Quests</h1>
          <span className="text-xs" style={{ color: "rgba(167,139,250,0.5)" }}>
            {completedCount}/{totalCount} done
          </span>
        </div>

        {/* Overall progress bar */}
        <div className="h-1.5 w-full rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: totalCount ? `${(completedCount / totalCount) * 100}%` : "0%",
              background: "linear-gradient(90deg,#7c3aed,#a855f7)",
            }}
            role="progressbar"
            aria-valuenow={completedCount}
            aria-valuemax={totalCount}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar" role="tablist">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
              style={filter === tab.id
                ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
                : { background: "rgba(255,255,255,0.05)", color: "rgba(167,139,250,0.5)" }
              }
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
            <div key={i} className="h-20 rounded-2xl shimmer" style={{ background: "rgba(42,26,94,0.4)" }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3">🎯</span>
            <p className="text-sm font-semibold text-white">No quests here yet</p>
            <p className="text-xs mt-1" style={{ color: "rgba(167,139,250,0.5)" }}>
              Check back soon for new tasks
            </p>
          </div>
        ) : (
          filtered.map((quest) => {
            const isChannelQuest = quest.type === "JOIN_CHANNEL" || quest.type === "SOCIAL_FOLLOW";
            const isVerifying    = verifying === quest.id;
            const msg            = verifyMsg?.id === quest.id ? verifyMsg : null;

            return (
              <div key={quest.id}>
                {isChannelQuest ? (
                  /* Channel/Social quests: custom verify flow */
                  <div
                    className="flex flex-col rounded-2xl px-4 py-3.5"
                    style={{
                      background: "linear-gradient(135deg,rgba(42,26,94,0.7),rgba(30,18,69,0.9))",
                      border: "1px solid rgba(139,92,246,0.18)",
                      opacity: quest.completed ? 0.65 : 1,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                        style={{ background: "linear-gradient(135deg,#0891b2,#06b6d4)" }}
                      >
                        {quest.iconEmoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white">{quest.title}</p>
                        <p className="text-xs truncate" style={{ color: "rgba(167,139,250,0.6)" }}>
                          {quest.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs font-bold" style={{ color: "#f59e0b" }}>
                            +{quest.xpReward} XP
                          </span>
                          <span className="text-xs font-bold" style={{ color: "#22c55e" }}>
                            +{quest.novaReward} NOVA
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleChannelQuest(quest)}
                        disabled={quest.completed || isVerifying}
                        className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-all active:scale-90"
                        style={quest.completed
                          ? { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }
                          : { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
                        }
                      >
                        {isVerifying ? (
                          <span className="flex items-center gap-1">
                            <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white block" />
                            Checking…
                          </span>
                        ) : quest.completed ? "✓" : "Join"}
                      </button>
                    </div>
                    {msg && (
                      <p
                        className="mt-2 text-xs rounded-lg px-3 py-1.5"
                        style={msg.ok
                          ? { background: "rgba(34,197,94,0.1)", color: "#22c55e" }
                          : { background: "rgba(239,68,68,0.1)", color: "#ef4444" }
                        }
                      >
                        {msg.msg}
                      </p>
                    )}
                  </div>
                ) : (
                  <QuestCard
                    quest={quest}
                    userId={userId}
                    onCompleted={handleCompleted}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
