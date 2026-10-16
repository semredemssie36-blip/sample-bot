"use client";

import { useState, useEffect } from "react";
import { getQuests, verifyChannelMembership, completeQuest } from "@/app/actions";

interface Quest {
  id: string; title: string; description: string; iconEmoji: string;
  type: string; difficulty: string; minutesEst: number;
  novaReward: number; xpReward: number; targetCount: number;
  progress: number; completed: boolean;
  channelUsername?: string | null; channelUrl?: string | null;
}

interface QuestsScreenProps {
  userId: number;
  onBalanceUpdate: (delta: number) => void;
}

const FILTERS = [
  { id: "all",             label: "All" },
  { id: "DAILY_CHECKIN",   label: "Daily" },
  { id: "JOIN_CHANNEL",    label: "Join" },
  { id: "WATCH_AD",        label: "Ads" },
  { id: "INVITE_FRIENDS",  label: "Invite" },
  { id: "PLAY_GAME",       label: "Play" },
  { id: "SPONSORED",       label: "Sponsor" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const DIFF = { EASY: { label: "Easy", color: "#10b981" }, MEDIUM: { label: "Medium", color: "#f59e0b" }, HARD: { label: "Hard", color: "#ef4444" } };

export default function QuestsScreen({ userId, onBalanceUpdate }: QuestsScreenProps) {
  const [quests, setQuests]     = useState<Quest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<FilterId>("all");
  const [verifying, setVerifying] = useState<string | null>(null);
  const [msgs, setMsgs]         = useState<Record<string, { text: string; ok: boolean }>>({});
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    getQuests(userId).then((q) => { setQuests(q); setLoading(false); });
  }, [userId]);

  const setMsg = (id: string, text: string, ok: boolean) =>
    setMsgs((prev) => ({ ...prev, [id]: { text, ok } }));

  const handleComplete = async (quest: Quest) => {
    if (quest.completed || completing === quest.id) return;

    // Channel/group quests — verify via Telegram API
    const isChannel = quest.type === "JOIN_CHANNEL" || quest.type === "JOIN_GROUP";
    if (isChannel && quest.channelUsername) {
      setVerifying(quest.id);
      if (quest.channelUrl) window.open(quest.channelUrl, "_blank");
      await new Promise((r) => setTimeout(r, 3000));
      const res = await verifyChannelMembership(userId, quest.channelUsername);
      if (!res.isMember) {
        setMsg(quest.id, "❌ Not joined yet. Join then tap again.", false);
        setVerifying(null);
        return;
      }
    }

    setCompleting(quest.id);
    const res = await completeQuest(userId, quest.id);
    if (res.success && res.completed) {
      setQuests((prev) => prev.map((q) => q.id === quest.id ? { ...q, completed: true, progress: quest.targetCount } : q));
      onBalanceUpdate(quest.novaReward);
      setMsg(quest.id, `✅ +${quest.novaReward} NOVA earned!`, true);
    } else if (res.error) {
      setMsg(quest.id, `⚠️ ${res.error}`, false);
    }
    setVerifying(null);
    setCompleting(null);
  };

  const filtered = filter === "all" ? quests : quests.filter((q) => q.type === filter);
  const done  = quests.filter((q) => q.completed).length;
  const total = quests.length;

  return (
    <div className="flex flex-col pb-28">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3"
        style={{ background: "rgba(10,8,24,0.96)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(37,28,74,0.8)" }}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-black text-white">Quests</h1>
          <span className="text-xs font-semibold" style={{ color: "rgba(167,139,250,0.5)" }}>{done}/{total} done</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: total ? `${(done / total) * 100}%` : "0%", background: "linear-gradient(90deg,#7c3aed,#a855f7)" }} />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all"
              style={filter === f.id
                ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
                : { background: "rgba(255,255,255,0.05)", color: "rgba(167,139,250,0.5)" }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 space-y-2.5">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl shimmer" style={{ background: "rgba(19,15,42,0.4)" }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="text-4xl mb-3">🎯</span>
            <p className="text-sm font-semibold text-white">No quests here yet</p>
          </div>
        ) : (
          filtered.map((quest) => {
            const diff    = DIFF[quest.difficulty as keyof typeof DIFF] ?? DIFF.EASY;
            const isVerif = verifying  === quest.id;
            const isComp  = completing === quest.id;
            const msg     = msgs[quest.id];
            const pct     = Math.min((quest.progress / quest.targetCount) * 100, 100);

            return (
              <div key={quest.id} className="flex flex-col rounded-2xl px-4 py-3.5"
                style={{ background: "rgba(19,15,42,0.9)", border: `1px solid ${quest.completed ? "rgba(16,185,129,0.2)" : "rgba(37,28,74,0.9)"}`, opacity: quest.completed ? 0.7 : 1 }}>
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl text-2xl"
                    style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.2)" }}>
                    {quest.iconEmoji}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{quest.title}</p>
                    <p className="text-xs truncate" style={{ color: "rgba(167,139,250,0.5)" }}>{quest.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[0.58rem] font-bold rounded-full px-1.5 py-0.5"
                        style={{ color: diff.color, background: `${diff.color}18`, border: `1px solid ${diff.color}30` }}>
                        {diff.label}
                      </span>
                      <span className="text-[0.58rem]" style={{ color: "rgba(167,139,250,0.4)" }}>{quest.minutesEst}m</span>
                      <span className="text-[0.58rem] font-bold" style={{ color: "#f59e0b" }}>+{quest.novaReward} NOVA</span>
                      <span className="text-[0.58rem]" style={{ color: "rgba(167,139,250,0.4)" }}>+{quest.xpReward} XP</span>
                    </div>
                  </div>
                  {/* Action button */}
                  <button onClick={() => handleComplete(quest)}
                    disabled={quest.completed || isVerif || isComp}
                    className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-all active:scale-90"
                    style={quest.completed
                      ? { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }
                      : { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}>
                    {isVerif || isComp
                      ? <span className="flex items-center gap-1">
                          <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white block" />
                          {isVerif ? "Checking…" : "…"}
                        </span>
                      : quest.completed ? "✓" : quest.channelUrl ? "Join" : "Go"
                    }
                  </button>
                </div>

                {/* Progress bar */}
                {quest.targetCount > 1 && (
                  <div className="mt-2.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: quest.completed ? "linear-gradient(90deg,#059669,#10b981)" : "linear-gradient(90deg,#7c3aed,#a855f7)" }} />
                    </div>
                    <p className="mt-0.5 text-right text-[0.55rem]" style={{ color: "rgba(167,139,250,0.4)" }}>
                      {quest.progress}/{quest.targetCount}
                    </p>
                  </div>
                )}

                {/* Message */}
                {msg && (
                  <p className="mt-2 text-xs rounded-xl px-3 py-1.5"
                    style={msg.ok
                      ? { background: "rgba(16,185,129,0.1)", color: "#10b981" }
                      : { background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                    {msg.text}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
