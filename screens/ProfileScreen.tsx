"use client";

import { useState, useEffect } from "react";
import { getLeaderboard, getReferralStats } from "@/app/actions";

interface ProfileScreenProps {
  userId: number;
  userData: {
    id: string;
    username?: string | null;
    firstName?: string | null;
    novaBalance: number;
    totalEarned: number;
    level: number;
    xp: number;
    xpForNext: number;
    referralCode: string;
    tonWallet?: string | null;
  };
  streakData: { currentStreak: number; longestStreak: number };
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  totalEarned: number;
  level: number;
}

const LEVEL_TITLES: Record<number, string> = {
  1: "Nova Seed",
  2: "Star Chaser",
  3: "Comet Rider",
  4: "Nebula Scout",
  5: "Orbit Captain",
  6: "Galactic Pro",
  7: "Supernova",
  8: "Nova Legend",
};

export default function ProfileScreen({ userId, userData, streakData }: ProfileScreenProps) {
  const [leaderboard, setLeaderboard]     = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading]         = useState(true);
  const [referralCount, setReferralCount] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const xpPct = Math.min((userData.xp / userData.xpForNext) * 100, 100);
  const levelTitle = LEVEL_TITLES[Math.min(userData.level, 8)] ?? "Nova Legend";
  const displayName = userData.firstName || userData.username || "Nova Player";
  const handle = userData.username ? `@${userData.username}` : `#${userData.id}`;

  useEffect(() => {
    Promise.all([
      getLeaderboard().then((data) => { setLeaderboard(data); setLbLoading(false); }),
      getReferralStats(userId).then(({ count }) => setReferralCount(count)),
    ]);
  }, [userId]);

  const myRank = leaderboard.find((e) => e.id === userData.id)?.rank ?? "—";

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-24">
      {/* Profile hero */}
      <div className="relative overflow-hidden nova-card px-5 py-5">
        {/* BG glow */}
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32
                        rounded-full bg-nova-purple/20 blur-3xl" />

        <div className="flex items-center gap-4 mb-4">
          {/* Avatar placeholder */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl
                          bg-nova-gradient text-2xl font-black text-white uppercase">
            {displayName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-black text-white truncate">{displayName}</p>
            <p className="text-xs text-nova-muted">{handle}</p>
            <span className="inline-block mt-1 rounded-full bg-nova-violet/15 border border-nova-violet/30
                             px-2 py-0.5 text-[0.6rem] font-semibold text-nova-violet uppercase tracking-wide">
              {levelTitle}
            </span>
          </div>
        </div>

        {/* Level bar */}
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-nova-violet">Level {userData.level}</span>
          <span className="text-xs text-nova-muted">
            {userData.xp.toLocaleString()} / {userData.xpForNext.toLocaleString()} XP
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-nova-gradient transition-all duration-700"
            style={{ width: `${xpPct}%` }}
            role="progressbar"
            aria-valuenow={userData.xp}
            aria-valuemax={userData.xpForNext}
            aria-label="XP progress"
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "NOVA Balance",    value: userData.novaBalance.toLocaleString(),  color: "text-nova-gold"   },
          { label: "Total Earned",    value: userData.totalEarned.toLocaleString(),  color: "text-nova-green"  },
          { label: "Global Rank",     value: `#${myRank}`,                           color: "text-nova-violet" },
          { label: "Friends Invited", value: String(referralCount),                  color: "text-nova-pink"   },
          { label: "Day Streak",      value: String(streakData.currentStreak),       color: "text-orange-400"  },
          { label: "Best Streak",     value: String(streakData.longestStreak),       color: "text-orange-300"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="nova-card px-4 py-3">
            <p className="text-[0.6rem] text-nova-muted uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* TON wallet */}
      {userData.tonWallet && (
        <div className="nova-card px-4 py-3 flex items-center gap-3">
          <span className="text-xl" aria-hidden="true">💎</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white">Connected Wallet</p>
            <p className="text-xs text-nova-muted truncate">{userData.tonWallet}</p>
          </div>
        </div>
      )}

      {/* Leaderboard toggle */}
      <button
        onClick={() => setShowLeaderboard(!showLeaderboard)}
        className="nova-btn-ghost flex items-center justify-center gap-2"
        aria-expanded={showLeaderboard}
        aria-controls="leaderboard-section"
      >
        <span>🏆</span>
        {showLeaderboard ? "Hide Leaderboard" : "View Leaderboard"}
      </button>

      {/* Leaderboard */}
      {showLeaderboard && (
        <div id="leaderboard-section" className="space-y-2 animate-fade-in">
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">Top Earners</h2>

          {lbLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="nova-card h-14 shimmer" />
            ))
          ) : (
            leaderboard.slice(0, 50).map((entry) => {
              const isMe = entry.id === userData.id;
              return (
                <div
                  key={entry.id}
                  className={`nova-card flex items-center gap-3 px-4 py-3
                    ${isMe ? "border-nova-violet/40 bg-nova-violet/5" : ""}`}
                  aria-current={isMe ? "true" : undefined}
                >
                  {/* Rank */}
                  <span className={`w-7 shrink-0 text-center text-sm font-black
                    ${entry.rank === 1 ? "text-nova-gold" :
                      entry.rank === 2 ? "text-slate-300" :
                      entry.rank === 3 ? "text-orange-400" : "text-nova-muted"}`}>
                    {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : entry.rank}
                  </span>

                  {/* Name */}
                  <p className={`flex-1 text-sm font-semibold truncate ${isMe ? "text-nova-violet" : "text-white"}`}>
                    {entry.name}{isMe ? " (you)" : ""}
                  </p>

                  {/* Level */}
                  <span className="text-xs text-nova-muted">Lv.{entry.level}</span>

                  {/* NOVA */}
                  <span className="text-sm font-bold text-nova-gold tabular-nums">
                    {entry.totalEarned.toLocaleString()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
