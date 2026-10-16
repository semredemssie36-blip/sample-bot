"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getQuests,
  verifyChannelMembership,
  completeQuest,
  syncReferralQuestProgress,
} from "@/app/actions";

interface Quest {
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
}

interface QuestsScreenProps {
  userId: number;
  referralCode: string;
  onBalanceUpdate: (delta: number) => void;
}

const FILTERS = [
  { id: "all",            label: "All"    },
  { id: "DAILY_CHECKIN",  label: "Daily"  },
  { id: "JOIN_CHANNEL",   label: "Join"   },
  { id: "INVITE_FRIENDS", label: "Invite" },
  { id: "WATCH_AD",       label: "Ads"    },
  { id: "PLAY_GAME",      label: "Play"   },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const DIFF = {
  EASY:   { label: "Easy",   color: "#10b981" },
  MEDIUM: { label: "Medium", color: "#f59e0b" },
  HARD:   { label: "Hard",   color: "#ef4444" },
};

// These quest types REQUIRE channel join — use 2-step verify flow
const CHANNEL_TYPES = ["JOIN_CHANNEL", "JOIN_GROUP", "SOCIAL_FOLLOW"];

// These quest types track real referral count — no manual completion
const REFERRAL_TYPES = ["INVITE_FRIENDS"];

export default function QuestsScreen({ userId, referralCode, onBalanceUpdate }: QuestsScreenProps) {
  const [quests, setQuests]         = useState<Quest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<FilterId>("all");
  const [busyId, setBusyId]         = useState<string | null>(null);
  const [msgs, setMsgs]             = useState<Record<string, { text: string; ok: boolean }>>({});
  const [linkOpened, setLinkOpened] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied]         = useState(false);

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME ?? "gameaaappbot";
  const inviteUrl   = `https://t.me/${botUsername}?start=${referralCode}`;
  const shareText   = "Join NovaDrop and earn real TON! Tap coins, complete quests, invite friends. 🚀";

  // Safe link opener
  const openTgLink = (url: string) => {
    const tg = typeof window !== "undefined"
      ? (window.Telegram?.WebApp as unknown as { openLink?: (u: string) => void } | null)
      : null;
    if (tg?.openLink) { tg.openLink(url); } else { window.open(url, "_blank"); }
  };

  const loadQuests = useCallback(async () => {
    // Load quests AND sync referral progress at the same time
    const [questList, refSync] = await Promise.all([
      getQuests(userId),
      syncReferralQuestProgress(userId),
    ]);

    // Merge real referral progress into quest list
    const refMap = Object.fromEntries(refSync.quests.map((r) => [r.questId, r]));

    const merged = questList.map((q) => {
      if (REFERRAL_TYPES.includes(q.type) && refMap[q.id]) {
        return {
          ...q,
          progress:  refMap[q.id].progress,
          completed: refMap[q.id].completed,
        };
      }
      return q;
    });

    setQuests(merged);
    setLoading(false);

    // Credit newly completed referral quests
    refSync.quests.forEach((r) => {
      if (r.newlyCompleted) {
        const quest = merged.find((q) => q.id === r.questId);
        if (quest) onBalanceUpdate(quest.novaReward);
      }
    });
  }, [userId, onBalanceUpdate]);

  useEffect(() => { loadQuests(); }, [loadQuests]);

  const setMsg = (id: string, text: string, ok: boolean) =>
    setMsgs((prev) => ({ ...prev, [id]: { text, ok } }));

  // ── Channel quest: Step 1 — open link ────────────────────────────────────
  const handleOpenChannelLink = (quest: Quest) => {
    if (quest.channelUrl) openTgLink(quest.channelUrl);
    setLinkOpened((prev) => new Set(prev).add(quest.id));
    setMsg(quest.id, "👆 After joining, tap Verify to claim your reward.", false);
  };

  // ── Channel quest: Step 2 — verify membership ────────────────────────────
  const handleVerifyChannel = async (quest: Quest) => {
    if (!quest.channelUsername) {
      setMsg(quest.id, "⚠️ Cannot verify this quest automatically.", false);
      return;
    }
    setBusyId(quest.id);
    setMsg(quest.id, "🔍 Checking your membership…", false);

    const res = await verifyChannelMembership(userId, quest.channelUsername);

    if (!res.isMember) {
      setMsg(quest.id, "❌ Not joined yet. Join the channel first, then tap Verify.", false);
      setBusyId(null);
      return;
    }

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

  // ── Regular quest completion ──────────────────────────────────────────────
  const handleComplete = async (quest: Quest) => {
    if (quest.completed || busyId === quest.id) return;
    setBusyId(quest.id);
    const res = await completeQuest(userId, quest.id);
    if (res.success && res.completed) {
      setQuests((prev) =>
        prev.map((q) => q.id === quest.id ? { ...q, completed: true, progress: quest.targetCount } : q)
      );
      onBalanceUpdate(quest.novaReward);
      setMsg(quest.id, `✅ +${quest.novaReward} NOVA earned!`, true);
    } else if (res.error) {
      setMsg(quest.id, `⚠️ ${res.error}`, false);
    }
    setBusyId(null);
  };

  // ── Share invite link ─────────────────────────────────────────────────────
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: show the URL
    }
  };

  const handleShareTelegram = () => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareText)}`;
    openTgLink(shareUrl);
  };

  const filtered = filter === "all" ? quests : quests.filter((q) => q.type === filter);
  const done     = quests.filter((q) => q.completed).length;
  const total    = quests.length;

  // Real referral count from synced data
  const refQuest = quests.find((q) => q.type === "INVITE_FRIENDS");
  const realReferralCount = refQuest?.progress ?? 0;

  return (
    <div className="flex flex-col pb-28">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3"
        style={{ background: "rgba(10,8,24,0.97)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(37,28,74,0.8)" }}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-black text-white">Quests</h1>
          <span className="text-xs font-semibold" style={{ color: "rgba(167,139,250,0.5)" }}>
            {done}/{total} done
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: total ? `${(done / total) * 100}%` : "0%", background: "linear-gradient(90deg,#7c3aed,#a855f7)" }}
            role="progressbar" aria-valuenow={done} aria-valuemax={total} />
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

      {/* ── Invite banner (always visible) ── */}
      <div className="mx-4 mt-3 rounded-2xl px-4 py-4"
        style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(236,72,153,0.1))", border: "1px solid rgba(124,58,237,0.3)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-xl"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
            🤝
          </div>
          <div>
            <p className="text-sm font-black text-white">Invite Friends, Earn Forever</p>
            <p className="text-xs" style={{ color: "rgba(167,139,250,0.6)" }}>
              +500 NOVA per friend · 10% of their earnings
            </p>
          </div>
        </div>

        {/* Real referral count */}
        <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-2xl font-black text-white">{realReferralCount}</span>
          <span className="text-xs" style={{ color: "rgba(167,139,250,0.5)" }}>
            real friends joined · {realReferralCount * 500} NOVA earned
          </span>
        </div>

        {/* Invite link display */}
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3"
          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <p className="flex-1 text-xs font-mono truncate" style={{ color: "rgba(167,139,250,0.7)" }}>
            {inviteUrl}
          </p>
          <button onClick={handleCopyLink}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all active:scale-90"
            style={{ background: copied ? "rgba(16,185,129,0.2)" : "rgba(124,58,237,0.3)", color: copied ? "#10b981" : "#a855f7", border: `1px solid ${copied ? "rgba(16,185,129,0.4)" : "rgba(124,58,237,0.4)"}` }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>

        {/* Share button — opens Telegram native share */}
        <button onClick={handleShareTelegram}
          className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 20px rgba(124,58,237,0.3)" }}>
          📣 Share on Telegram
        </button>
      </div>

      {/* ── Quest list ── */}
      <div className="px-4 pt-3 space-y-2.5">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl shimmer" style={{ background: "rgba(19,15,42,0.4)" }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="text-4xl mb-3">🎯</span>
            <p className="text-sm font-semibold text-white">No quests here</p>
          </div>
        ) : (
          filtered.map((quest) => {
            const diff         = DIFF[quest.difficulty as keyof typeof DIFF] ?? DIFF.EASY;
            const isBusy       = busyId === quest.id;
            const msg          = msgs[quest.id];
            const pct          = Math.min((quest.progress / Math.max(quest.targetCount, 1)) * 100, 100);
            const isChannelType = CHANNEL_TYPES.includes(quest.type);
            const isReferralType = REFERRAL_TYPES.includes(quest.type);
            const hasChannelUrl  = !!quest.channelUrl;
            const hasChannelUser = !!quest.channelUsername;
            const opened         = linkOpened.has(quest.id);

            return (
              <div key={quest.id} className="flex flex-col rounded-2xl px-4 py-3.5"
                style={{
                  background: quest.completed
                    ? "rgba(16,185,129,0.04)"
                    : "rgba(19,15,42,0.9)",
                  border: `1px solid ${quest.completed ? "rgba(16,185,129,0.2)" : "rgba(37,28,74,0.9)"}`,
                }}>

                {/* Top row */}
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl text-2xl"
                    style={{ background: quest.completed ? "rgba(16,185,129,0.12)" : "rgba(124,58,237,0.12)", border: `1px solid ${quest.completed ? "rgba(16,185,129,0.2)" : "rgba(124,58,237,0.2)"}` }}>
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
                      {quest.minutesEst > 0 && (
                        <span className="text-[0.58rem]" style={{ color: "rgba(167,139,250,0.4)" }}>
                          ~{quest.minutesEst}m
                        </span>
                      )}
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
                    <div className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full"
                      style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                      <span className="text-sm" style={{ color: "#10b981" }}>✓</span>
                    </div>

                  ) : isReferralType ? (
                    // Referral quests — NO completion button, only share
                    <button onClick={handleShareTelegram}
                      className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-white transition-all active:scale-90"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                      Invite
                    </button>

                  ) : isChannelType ? (
                    // Channel quests — 2-step: Join → Verify
                    <div className="flex flex-col gap-1 shrink-0">
                      {!opened && hasChannelUrl && (
                        <button onClick={() => handleOpenChannelLink(quest)}
                          className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-all active:scale-90"
                          style={{ background: "linear-gradient(135deg,#0088cc,#00aae4)" }}>
                          Join →
                        </button>
                      )}
                      {opened && hasChannelUser && (
                        <button onClick={() => handleVerifyChannel(quest)} disabled={isBusy}
                          className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-all active:scale-90"
                          style={{ background: isBusy ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                          {isBusy
                            ? <span className="flex items-center gap-1">
                                <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white block" />
                                …
                              </span>
                            : "Verify ✓"}
                        </button>
                      )}
                      {opened && !hasChannelUser && (
                        <button onClick={() => handleComplete(quest)} disabled={isBusy}
                          className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-all active:scale-90"
                          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                          Done
                        </button>
                      )}
                      {!hasChannelUrl && !opened && (
                        <button onClick={() => handleComplete(quest)} disabled={isBusy}
                          className="rounded-xl px-3 py-2 text-xs font-bold text-white transition-all active:scale-90"
                          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                          Go
                        </button>
                      )}
                    </div>

                  ) : (
                    // Standard quest
                    <button onClick={() => handleComplete(quest)} disabled={isBusy}
                      className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-white transition-all active:scale-90"
                      style={{ background: isBusy ? "rgba(124,58,237,0.3)" : "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
                      {isBusy
                        ? <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white block" />
                        : "Go"}
                    </button>
                  )}
                </div>

                {/* Progress bar — always shown for multi-step or referral quests */}
                {(quest.targetCount > 1 || isReferralType) && (
                  <div className="mt-2.5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: quest.completed ? "linear-gradient(90deg,#059669,#10b981)" : "linear-gradient(90deg,#7c3aed,#a855f7)" }} />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      {isReferralType && (
                        <p className="text-[0.58rem]" style={{ color: "rgba(167,139,250,0.5)" }}>
                          {quest.progress} real friend{quest.progress !== 1 ? "s" : ""} joined
                        </p>
                      )}
                      <p className="text-[0.55rem] ml-auto" style={{ color: "rgba(167,139,250,0.4)" }}>
                        {quest.progress}/{quest.targetCount}
                      </p>
                    </div>
                  </div>
                )}

                {/* Message */}
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
