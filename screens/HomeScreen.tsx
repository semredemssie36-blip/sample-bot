"use client";

import { useState, useEffect } from "react";
import { getQuests, getLiveStats, getReferralStats } from "@/app/actions";
import type { QuestData } from "@/components/QuestCard";

interface HomeScreenProps {
  userId: number;
  userData: {
    novaBalance:  number;
    totalEarned:  number;
    level:        number;
    xp:           number;
    xpForNext:    number;
    firstName?:   string | null;
    username?:    string | null;
  };
  streakData:     { currentStreak: number; canClaim: boolean };
  energy:         number;
  energyMax:      number;
  onBalanceUpdate:(delta: number) => void;
  onStreakClaimed:(bonus: number, newStreak: number) => void;
  onNavigateTap:  () => void;
  onNavigateQuests:() => void;
  onNavigateWallet:() => void;
}

const TON_PRICE_USD = 6;   // approximate — could fetch live later
const NOVA_PER_TON  = 100_000;

function novaToTon(n: number)     { return (n / NOVA_PER_TON).toFixed(4); }
function novaToUsd(n: number)     { return ((n / NOVA_PER_TON) * TON_PRICE_USD).toFixed(2); }

export default function HomeScreen({
  userId, userData, streakData, energy, energyMax,
  onBalanceUpdate, onStreakClaimed, onNavigateTap, onNavigateQuests, onNavigateWallet,
}: HomeScreenProps) {
  const [quests, setQuests]           = useState<QuestData[]>([]);
  const [liveUsers, setLiveUsers]     = useState(0);
  const [passiveToday, setPassiveToday] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [claiming, setClaiming]       = useState(false);

  useEffect(() => {
    Promise.all([
      getQuests(userId),
      getLiveStats(),
      getReferralStats(userId),
    ]).then(([q, stats, refStats]) => {
      setQuests(q.slice(0, 3));
      setLiveUsers(stats.totalUsers);
      setPassiveToday(refStats.passiveToday);
      setLoading(false);
    });
  }, [userId]);

  const xpPct = Math.min((userData.xp / userData.xpForNext) * 100, 100);
  const displayName = userData.firstName || userData.username || "Player";
  const energyPct   = Math.round((energy / energyMax) * 100);

  const handleClaimStreak = async () => {
    if (claiming || !streakData.canClaim) return;
    setClaiming(true);
    const { claimDailyStreak } = await import("@/app/actions");
    const res = await claimDailyStreak(userId);
    if (res.success && res.streak !== undefined && res.bonus !== undefined) {
      onStreakClaimed(res.bonus, res.streak);
      onBalanceUpdate(res.bonus);
    }
    setClaiming(false);
  };

  return (
    <div className="flex flex-col pb-28" style={{ background: "#0a0818" }}>
      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 flex items-center justify-center rounded-2xl text-2xl flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 0 2px rgba(168,85,247,0.4)" }}>
              🧑
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
                style={{ background: "#10b981", borderColor: "#0a0818" }} />
            </div>
            <div>
              <p className="text-base font-black text-white">{displayName} 👋</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[0.6rem] font-bold rounded-full px-2 py-0.5"
                  style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", color: "#a855f7" }}>
                  Lv. {userData.level}
                </span>
                <span className="text-[0.6rem]" style={{ color: "rgba(167,139,250,0.5)" }}>
                  {liveUsers.toLocaleString()} earners
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[0.55rem] uppercase tracking-wide" style={{ color: "rgba(167,139,250,0.4)" }}>Today passive</p>
            <p className="text-sm font-black" style={{ color: "#10b981" }}>+{passiveToday.toLocaleString()} NOVA</p>
          </div>
        </div>

        {/* XP bar */}
        <div className="rounded-2xl px-3.5 py-2.5" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}>
          <div className="flex justify-between mb-1.5">
            <span className="text-[0.6rem] font-bold" style={{ color: "#a855f7" }}>Level {userData.level}</span>
            <span className="text-[0.6rem]" style={{ color: "rgba(167,139,250,0.5)" }}>
              {(userData.xpForNext - userData.xp).toLocaleString()} XP to next level
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${xpPct}%`, background: "linear-gradient(90deg,#7c3aed,#a855f7,#ec4899)" }} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4">
        {/* ── Balance card ── */}
        <div className="relative overflow-hidden rounded-3xl p-px">
          <div className="absolute inset-0 rounded-3xl" style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7,#ec4899)", opacity: 0.6 }} />
          <div className="relative rounded-3xl px-5 py-5" style={{ background: "linear-gradient(135deg,#1a1040,#0e0b22)" }}>
            <div className="pointer-events-none absolute -top-10 right-0 text-8xl opacity-20 select-none" aria-hidden="true">🧰</div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(167,139,250,0.5)" }}>Your Balance</p>
            <div className="flex items-end gap-2 mb-0.5">
              <span className="text-4xl font-black text-white tabular-nums">{userData.novaBalance.toLocaleString()}</span>
              <span className="mb-1 rounded-full px-2 py-0.5 text-xs font-black text-white"
                style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>NOVA</span>
            </div>
            <p className="text-sm mb-4" style={{ color: "rgba(167,139,250,0.5)" }}>
              ≈ {novaToTon(userData.novaBalance)} TON · ${novaToUsd(userData.novaBalance)}
            </p>
            <div className="flex gap-3">
              <button onClick={onNavigateWallet}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white active:scale-95 transition-transform"
                style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
                Withdraw
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              <button onClick={onNavigateWallet}
                className="flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold active:scale-95 transition-transform"
                style={{ borderColor: "rgba(124,58,237,0.35)", background: "rgba(124,58,237,0.1)", color: "#a855f7" }}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                History
              </button>
            </div>
          </div>
        </div>

        {/* ── Tap coin mini card ── */}
        <button onClick={onNavigateTap}
          className="flex items-center gap-4 rounded-2xl px-4 py-4 active:scale-98 transition-all"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <div className="relative h-14 w-14 shrink-0 flex items-center justify-center rounded-2xl text-3xl"
            style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", boxShadow: "0 0 20px rgba(245,158,11,0.4)" }}>
            🪙
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white">Tap to Earn</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(167,139,250,0.5)" }}>1 NOVA per tap · energy refills automatically</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${energyPct}%`, background: energyPct > 20 ? "linear-gradient(90deg,#d97706,#f59e0b)" : "#ef4444" }} />
            </div>
          </div>
          <span className="text-xs font-bold" style={{ color: energyPct > 20 ? "#f59e0b" : "#ef4444" }}>
            {energy}/{energyMax}
          </span>
        </button>

        {/* ── Daily Streak ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Streak card */}
          <div className="rounded-2xl px-4 py-4" style={{ background: "rgba(19,15,42,0.9)", border: "1px solid rgba(37,28,74,0.9)" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-base">🔥</span>
              <span className="text-xs font-bold text-white">Daily Streak</span>
            </div>
            <p className="text-3xl font-black text-white leading-none">
              {streakData.currentStreak} <span className="text-sm font-bold" style={{ color: "rgba(167,139,250,0.5)" }}>days</span>
            </p>
            <button onClick={handleClaimStreak} disabled={!streakData.canClaim || claiming}
              className="mt-3 w-full rounded-xl py-2 text-xs font-bold transition-all active:scale-95"
              style={streakData.canClaim
                ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }
                : { background: "rgba(255,255,255,0.05)", color: "rgba(167,139,250,0.35)" }}>
              {claiming ? "…" : streakData.canClaim ? `+${(streakData.currentStreak + 1) * 50} NOVA` : "✓ Claimed"}
            </button>
          </div>

          {/* Streak bonus */}
          <div className="rounded-2xl px-4 py-4" style={{ background: "rgba(19,15,42,0.9)", border: "1px solid rgba(37,28,74,0.9)" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-base">🎁</span>
              <span className="text-xs font-bold text-white">Streak Bonus</span>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-3xl font-black text-white">+{Math.min((streakData.currentStreak + 1) * 50, 500)}</span>
              <span className="text-xs font-bold rounded-full px-1.5 py-0.5 text-white"
                style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>NOVA</span>
            </div>
            <p className="text-[0.6rem]" style={{ color: "rgba(167,139,250,0.4)" }}>Next day reward</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min((streakData.currentStreak / 7) * 100, 100)}%`, background: "linear-gradient(90deg,#d97706,#f59e0b)" }} />
            </div>
          </div>
        </div>

        {/* ── Today's quests preview ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-white">Today's Quests</p>
            <button onClick={onNavigateQuests} className="text-xs font-semibold flex items-center gap-1" style={{ color: "#a855f7" }}>
              View all
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map((i) => <div key={i} className="h-16 rounded-2xl shimmer" style={{ background: "rgba(19,15,42,0.6)" }} />)}
            </div>
          ) : (
            <div className="space-y-2">
              {quests.map((q) => (
                <button key={q.id} onClick={onNavigateQuests}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left active:scale-98 transition-transform"
                  style={{ background: "rgba(19,15,42,0.9)", border: "1px solid rgba(37,28,74,0.9)", opacity: q.completed ? 0.6 : 1 }}>
                  <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl text-xl"
                    style={{ background: "rgba(124,58,237,0.15)" }}>{q.iconEmoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{q.title}</p>
                    <p className="text-[0.6rem]" style={{ color: "rgba(167,139,250,0.5)" }}>+{q.novaReward} NOVA · +{q.xpReward} XP</p>
                  </div>
                  {q.completed
                    ? <span className="text-sm" style={{ color: "#10b981" }}>✓</span>
                    : <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" stroke="rgba(167,139,250,0.4)" strokeWidth="2" fill="none" strokeLinecap="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
                  }
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
