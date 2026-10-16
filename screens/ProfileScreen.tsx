"use client";

import { useState, useEffect } from "react";
import { getLeaderboard, getUserAchievements, getReferralStats } from "@/app/actions";

interface ProfileScreenProps {
  userId: number;
  userData: {
    id: string; username?: string | null; firstName?: string | null;
    novaBalance: number; totalEarned: number; level: number;
    xp: number; xpForNext: number; totalTaps: number;
    referralCode: string; tonWallet?: string | null;
  };
  streakData: { currentStreak: number; longestStreak: number };
}

interface LeaderEntry { rank: number; id: string; name: string; totalEarned: number; level: number; }
interface Achievement { type: string; title: string; description: string; iconEmoji: string; novaReward: number; unlockedAt: Date; }
interface PassiveItem  { generatorId: string; amount: number; level: number; sourceType: string; createdAt: Date; }

const LEVEL_TITLES: Record<number, { title: string; color: string }> = {
  1:  { title: "Nova Seed",     color: "#6b7280" },
  2:  { title: "Star Chaser",   color: "#10b981" },
  3:  { title: "Comet Rider",   color: "#3b82f6" },
  5:  { title: "Nebula Scout",  color: "#8b5cf6" },
  8:  { title: "Orbit Captain", color: "#a855f7" },
  12: { title: "Galactic Pro",  color: "#ec4899" },
  18: { title: "Supernova",     color: "#f59e0b" },
  25: { title: "Nova Legend",   color: "#fbbf24" },
};

function getLevelInfo(level: number) {
  const thresholds = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  for (const t of thresholds) { if (level >= t) return LEVEL_TITLES[t]; }
  return LEVEL_TITLES[1];
}

export default function ProfileScreen({ userId, userData, streakData }: ProfileScreenProps) {
  const [lb, setLb]               = useState<LeaderEntry[]>([]);
  const [achievements, setAch]    = useState<Achievement[]>([]);
  const [passiveLog, setPassive]   = useState<PassiveItem[]>([]);
  const [referralCount, setRefCnt] = useState(0);
  const [passiveToday, setPToday]  = useState(0);
  const [showLb, setShowLb]        = useState(false);
  const [loading, setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([
      getLeaderboard(), getUserAchievements(userId), getReferralStats(userId),
    ]).then(([lbData, achData, refData]) => {
      setLb(lbData);
      setAch(achData as Achievement[]);
      setRefCnt(refData.count);
      setPToday(refData.passiveToday);
      setPassive(refData.recentPassive as PassiveItem[]);
      setLoading(false);
    });
  }, [userId]);

  const myRank    = lb.find((e) => e.id === userData.id)?.rank ?? "—";
  const xpPct     = Math.min((userData.xp / userData.xpForNext) * 100, 100);
  const levelInfo = getLevelInfo(userData.level);
  const displayName = userData.firstName || userData.username || "Nova Player";
  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME ?? "gameaaappbot";
  const inviteUrl   = `https://t.me/${botUsername}?start=${userData.referralCode}`;

  const copyInvite = () => navigator.clipboard.writeText(inviteUrl).catch(() => {});
  const shareInvite = () => window.open(
    `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent("Join NovaDrop and earn real TON! 🚀")}`,
    "_blank"
  );

  return (
    <div className="flex flex-col pb-28 gap-4 px-4 pt-4">
      {/* ── Profile hero ── */}
      <div className="relative overflow-hidden rounded-3xl px-5 py-5"
        style={{ background: "linear-gradient(135deg,#1a1040,#0e0b22)", border: "1px solid rgba(124,58,237,0.25)" }}>
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle,#a855f7,transparent)" }} />
        <div className="flex items-center gap-4 mb-4">
          <div className="h-14 w-14 shrink-0 flex items-center justify-center rounded-2xl text-3xl"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 0 2px rgba(168,85,247,0.4)" }}>
            🧑
          </div>
          <div>
            <p className="text-base font-black text-white">{displayName}</p>
            <p className="text-xs" style={{ color: "rgba(167,139,250,0.5)" }}>
              {userData.username ? `@${userData.username}` : `#${userData.id}`}
            </p>
            <span className="inline-block mt-1 text-[0.6rem] font-black rounded-full px-2 py-0.5"
              style={{ background: `${levelInfo.color}18`, border: `1px solid ${levelInfo.color}40`, color: levelInfo.color }}>
              {levelInfo.title}
            </span>
          </div>
        </div>
        <div className="flex justify-between mb-1.5">
          <span className="text-xs font-bold" style={{ color: "#a855f7" }}>Level {userData.level}</span>
          <span className="text-xs" style={{ color: "rgba(167,139,250,0.5)" }}>
            {userData.xp.toLocaleString()} / {userData.xpForNext.toLocaleString()} XP
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${xpPct}%`, background: "linear-gradient(90deg,#7c3aed,#a855f7,#ec4899)" }} />
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "NOVA Balance",   value: userData.novaBalance.toLocaleString(), color: "#f59e0b"  },
          { label: "Total Earned",   value: userData.totalEarned.toLocaleString(), color: "#10b981"  },
          { label: "Global Rank",    value: `#${myRank}`,                          color: "#a855f7"  },
          { label: "Total Taps",     value: userData.totalTaps.toLocaleString(),   color: "#f59e0b"  },
          { label: "Friends",        value: String(referralCount),                 color: "#ec4899"  },
          { label: "Passive Today",  value: `+${passiveToday.toLocaleString()}`,   color: "#10b981"  },
          { label: "Day Streak",     value: String(streakData.currentStreak),      color: "#f97316"  },
          { label: "Best Streak",    value: String(streakData.longestStreak),      color: "#f97316"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl px-4 py-3"
            style={{ background: "rgba(19,15,42,0.9)", border: "1px solid rgba(37,28,74,0.9)" }}>
            <p className="text-[0.58rem] uppercase tracking-wide mb-1" style={{ color: "rgba(167,139,250,0.4)" }}>{label}</p>
            <p className="text-xl font-black" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Referral section ── */}
      <div className="rounded-2xl px-4 py-4" style={{ background: "rgba(19,15,42,0.9)", border: "1px solid rgba(37,28,74,0.9)" }}>
        <p className="text-sm font-bold text-white mb-3">🤝 Invite & Earn Passive</p>
        <div className="flex items-center gap-3 mb-3 text-xs" style={{ color: "rgba(167,139,250,0.6)" }}>
          <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <p className="text-lg font-black text-white">{referralCount}</p>
            <p>Friends</p>
          </div>
          <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <p className="text-lg font-black" style={{ color: "#10b981" }}>10%</p>
            <p>Level 1</p>
          </div>
          <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <p className="text-lg font-black" style={{ color: "#10b981" }}>3%</p>
            <p>Level 2</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={copyInvite} className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
            📋 Copy Link
          </button>
          <button onClick={shareInvite} className="flex-1 rounded-xl py-2.5 text-xs font-bold transition-all active:scale-95"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a855f7" }}>
            📣 Share
          </button>
        </div>

        {/* Recent passive income */}
        {passiveLog.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[0.6rem] uppercase tracking-wide" style={{ color: "rgba(167,139,250,0.4)" }}>Recent passive income</p>
            {passiveLog.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center justify-between py-1 border-b" style={{ borderColor: "rgba(37,28,74,0.5)" }}>
                <span className="text-xs" style={{ color: "rgba(167,139,250,0.6)" }}>
                  {p.level === 1 ? "Direct friend" : "Network"} · {p.sourceType}
                </span>
                <span className="text-xs font-bold" style={{ color: "#10b981" }}>+{p.amount} NOVA</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Achievements ── */}
      {!loading && achievements.length > 0 && (
        <div>
          <p className="text-sm font-bold text-white mb-3">🏆 Achievements</p>
          <div className="grid grid-cols-2 gap-2">
            {achievements.map((a) => (
              <div key={a.type} className="flex items-center gap-2.5 rounded-2xl px-3 py-3"
                style={{ background: "rgba(19,15,42,0.9)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <span className="text-2xl">{a.iconEmoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{a.title}</p>
                  <p className="text-[0.58rem]" style={{ color: "#f59e0b" }}>+{a.novaReward} NOVA</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Leaderboard ── */}
      <button onClick={() => setShowLb(!showLb)}
        className="rounded-2xl px-4 py-3 text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
        style={{ background: "rgba(19,15,42,0.9)", border: "1px solid rgba(37,28,74,0.9)", color: "#a855f7" }}>
        🏆 {showLb ? "Hide" : "View"} Global Leaderboard
      </button>

      {showLb && (
        <div className="space-y-2 fade-in">
          {loading ? Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl shimmer" style={{ background: "rgba(19,15,42,0.4)" }} />
          )) : lb.slice(0, 50).map((e) => {
            const isMe = e.id === userData.id;
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: isMe ? "rgba(124,58,237,0.1)" : "rgba(19,15,42,0.8)", border: `1px solid ${isMe ? "rgba(124,58,237,0.3)" : "rgba(37,28,74,0.6)"}` }}>
                <span className="w-7 text-center text-sm font-black" style={{ color: e.rank === 1 ? "#f59e0b" : e.rank === 2 ? "#d1d5db" : e.rank === 3 ? "#f97316" : "rgba(167,139,250,0.4)" }}>
                  {e.rank <= 3 ? ["🥇","🥈","🥉"][e.rank - 1] : e.rank}
                </span>
                <p className="flex-1 text-sm font-semibold truncate" style={{ color: isMe ? "#a855f7" : "white" }}>
                  {e.name}{isMe ? " (you)" : ""}
                </p>
                <span className="text-xs" style={{ color: "rgba(167,139,250,0.5)" }}>Lv.{e.level}</span>
                <span className="text-sm font-black" style={{ color: "#f59e0b" }}>{e.totalEarned.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
