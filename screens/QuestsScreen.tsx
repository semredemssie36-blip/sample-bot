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
  { id: "all",             label: "All"    },
  { id: "DAILY_CHECKIN",   label: "Daily"  },
  { id: "JOIN_CHANNEL",    label: "Join"   },
  { id: "WATCH_AD",        label: "Ads"    },
  { id: "INVITE_FRIENDS",  label: "Invite" },
  { id: "PLAY_GAME",       label: "Play"   },
  { id: "SPONSORED",       label: "Sponsor"},
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const DIFF = {
  EASY:   { label: "Easy",   color: "#10b981" },
  MEDIUM: { label: "Medium", color: "#f59e0b" },
  HARD:   { label: "Hard",   color: "#ef4444" },
};

// These quest types REQUIRE channel/group join verification
const REQUIRES_JOIN = ["JOIN_CHANNEL", "JOIN_GROUP", "SOCIAL_FOLLOW"];

export default function QuestsScreen({ userId, onBalanceUpdate }: QuestsScreenProps) {
  const [quests, setQuests]         = useState<Quest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<FilterId>("all");
  const [busyId, setBusyId]         = useState<string | null>(null);
  const [msgs, setMsgs]             = useState<Record<string, { text: string; ok: boolean }>>({});
  // Track which quests the user has clicked "open link" for — needed to enable verify button
  const [linkOpened, setLinkOpened] = useState<Set<string>>(new Set());

  useEffect(() => {
    getQuests(userId).then((q) => { setQuests(q); setLoading(false); });
  }, [userId]);

  const setMsg = (id: string, text: string, ok: boolean) =>
    setMsgs((prev) => ({ ...prev, [id]: { text, ok } }));

  // Step 1: Open the channel/group link
  const handleOpenLink = (quest: Quest) => {
    if (!quest.channelUrl) return;
    window.open(quest.channelUrl, "_blank");
    setLinkOpened((prev) => new Set(prev).add(quest.id));
    setMsg(quest.id, "👆 Joined? Tap \"Verify\" to claim your reward.", false);
  };

  // Step 2: Verify membership via Telegram API then complete
  const handleVerify = async (quest: Quest) => {
    if (!quest.channelUsername) {
      setMsg(quest.id, "⚠️ Cannot verify this quest automatically.", false);
      return;
    }
    setBusyId(quest.id);
    setMsg(quest.id, "🔍 Checking your membership…", false);

    const res = await verifyChannelMembership(userId, quest.channelUsername);

    if (!res.isMember) {
      setMsg(quest.id, "❌ You haven't joined yet. Join first, then tap Verify.", false);
      setBusyId(null);
      return;
    }

    // Membership confirmed — complete the quest
    const compRes = await completeQuest(userId, quest.id);
    if (compRes.success && compRes.completed) {
      setQuests((prev) => prev.map((q) => q.id === quest.id ? { ...q, completed: true } : q));
      onBalanceUpdate(quest.novaReward);
      setMsg(quest.id, `✅ Verified! +${quest.novaReward} NOVA added to your balance.`, true);
    } else {
      setMsg(quest.id, compRes.error ? `⚠️ ${compRes.error}` : "⚠️ Something went wrong.", false);
    }
    setBusyId(null);
  };

  // Standard quest completion (non-channel quests)
  const handleComplete = async (quest: Quest) => {
    if (quest.completed || busyId === quest.id) return;
    setBusyId(quest.id);
    const res = await completeQuest(userId, quest.id);
    if (res.success && res.completed) {
      setQuests((prev) => prev.map((q) => q.id === quest.id ? { ...q, completed: true, progress: quest.targetCount } : q));
      onBalanceUpdate(quest.novaReward);
      setMsg(quest.id, `✅ +${quest.novaReward} NOVA earned!`, true);
    } else if (res.error) {
      setMsg(quest.id, `⚠️ ${res.error}`, false);
    }
    setBusyId(null);
  };

  const filtered     = filter === "all" ? quests : quests.filter((q) => q.type === filter);
  const done         = quests.filter((q) => q.completed).length;
  const total        = quests.length;

  return (
    <div className="flex flex-col pb-28">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3"
        style={{ background: "rgba(10,8,24,0.97)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(37,28,74,0.8)" }}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-black text-white">Quests</h1>
          <span className="text-xs font-semibold" style={{ color: "rgba(167,139,250,0.5)" }}>
            {done}/{total} done
          </span>
        </div>

        {/* Overall progress */}
        <div className="h-2 w-full overflow-hidden rounded-full mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: total ? `${(done / total) * 100}%` : "0%", background: "linear-gradient(90deg,#7c3aed,#a855f7)" }}
            role="progressbar" aria-valuenow={done} aria-valuemax={total} />
        </div>

        {/* Filter tabs */}
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

      {/* Quest list */}
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
            const diff      = DIFF[quest.difficulty as keyof typeof DIFF] ?? DIFF.EASY;
            const isBusy    = busyId === quest.id;
            const msg       = msgs[quest.id];
            const pct       = Math.min((quest.progress / quest.targetCount) * 100, 100);
            const isJoinType = REQUIRES_JOIN.includes(quest.type);
            const hasLink    = !!quest.channelUrl;
            const hasVerify  = !!quest.channelUsername;
            const opened     = linkOpened.has(quest.id);

            return (
              <div key={quest.id}
                className="flex flex-col rounded-2xl px-4 py-3.5"
                style={{
                  background: "rgba(19,15,42,0.9)",
                  border: `1px solid ${quest.completed ? "rgba(16,185,129,0.25)" : "rgba(37,28,74,0.9)"}`,
                  opacity: quest.completed ? 0.75 : 1,
                }}>

                {/* Top row: icon + info + action */}
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl text-2xl"
                    style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.2)" }}>
                    {quest.iconEmoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{quest.title}</p>
                    <p className="text-xs truncate" style={{ color: "rgba(167,139,250,0.5)" }}>
                      {quest.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[0.58rem] font-bold rounded-full px-1.5 py-0.5"
                        style={{ color: diff.color, background: `${diff.color}15`, border: `1px solid ${diff.color}30` }}>
                        {diff.label}
                      </span>
                      <span className="text-[0.58rem]" style={{ color: "rgba(167,139,250,0.4)" }}>
                        {quest.minutesEst}m
                      </span>
                      <span className="text-[0.58rem] font-bold" style={{ color: "#f59e0b" }}>
                        +{quest.novaReward} NOVA
                      </span>
                      <span className="text-[0.58rem]" style={{ color: "rgba(167,139,250,0.4)" }}>
                        +{quest.xpReward} XP
                      </span>
                    </div>
                  </div>

                  {/* Action button */}
                  {quest.completed ? (
                    <div className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl"
                      style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
                      <span style={{ color: "#10b981" }}>✓</span>
                    </div>
                  ) : isJoinType ? (
                    // Join quests: show "Join" button (opens link), then "Verify" after link opened
                    <div className="flex flex-col gap-1 shrink-0">
                      {hasLink && !opened && (
                        <button onClick={() => handleOpenLink(quest)}
                          className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-all active:scale-90"
                          style={{ background: "linear-gradient(135deg,#0088cc,#00aae4)" }}>
                          Join →
                        </button>
                      )}
                      {(opened || !hasLink) && hasVerify && (
                        <button onClick={() => handleVerify(quest)} disabled={isBusy}
                          className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-all active:scale-90"
                          style={{ background: isBusy ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                          {isBusy ? (
                            <span className="flex items-center gap-1">
                              <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white block" />
                              …
                            </span>
                          ) : "Verify"}
                        </button>
                      )}
                      {/* If no channelUsername but has URL — just a link button, complete manually */}
                      {!hasVerify && hasLink && (
                        <button onClick={() => handleOpenLink(quest)}
                          className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-all active:scale-90"
                          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                          Open →
                        </button>
                      )}
                    </div>
                  ) : (
                    // Regular quests
                    <button onClick={() => handleComplete(quest)} disabled={isBusy}
                      className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-white transition-all active:scale-90"
                      style={{ background: isBusy ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                      {isBusy
                        ? <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white block" />
                        : "Go"}
                    </button>
                  )}
                </div>

                {/* Progress bar for multi-step quests */}
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

                {/* Status message */}
                {msg && (
                  <div className="mt-2.5 rounded-xl px-3 py-2 text-xs"
                    style={msg.ok
                      ? { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }
                      : { background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", color: "rgba(167,139,250,0.8)" }}>
                    {msg.text}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
