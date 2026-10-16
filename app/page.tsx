"use client";

import { useEffect, useRef, useState } from "react";
import { retrieveLaunchParams } from "@telegram-apps/sdk-react";

import BottomNav, { type Tab } from "@/components/BottomNav";
import HomeScreen from "@/screens/HomeScreen";
import QuestsScreen from "@/screens/QuestsScreen";
import EarnScreen from "@/screens/EarnScreen";
import RedeemScreen from "@/screens/RedeemScreen";
import ProfileScreen from "@/screens/ProfileScreen";

import { getUser, trackReferral, getReferralStats } from "@/app/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserData {
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
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  canClaim: boolean;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [userId, setUserId] = useState(0);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    canClaim: false,
  });
  const [referralCount, setReferralCount] = useState(0);
  const [booting, setBooting] = useState(true);
  const bootRef = useRef(false);

  // ── Boot: parse Telegram identity, create/fetch user ────────────────────
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    // Tell Telegram the app is ready and expand to full height
    if (typeof window !== "undefined") {
      const tg = window.Telegram?.WebApp;
      if (tg) { tg.ready(); tg.expand(); }
    }

    let tgId = 0;
    let tgUsername = "";
    let tgFirstName = "";
    let startParam = "";

    // Try SDK v3 first
    try {
      const lp = retrieveLaunchParams();
      const user = lp.tgWebAppData?.user;
      if (user) {
        tgId        = user.id;
        tgUsername  = (user.username  as string | undefined) ?? "";
        tgFirstName = (user.firstName as string | undefined) ?? "";
      }
      startParam = lp.tgWebAppStartParam ?? "";
    } catch { /* outside Telegram */ }

    // Fallback to legacy initDataUnsafe
    if (!tgId && typeof window !== "undefined") {
      const tg = window.Telegram?.WebApp;
      if (tg?.initDataUnsafe?.user) {
        tgId        = tg.initDataUnsafe.user.id;
        tgUsername  = tg.initDataUnsafe.user.username  ?? "";
        tgFirstName = tg.initDataUnsafe.user.first_name ?? "";
      }
      if (!startParam && tg?.initDataUnsafe?.start_param) {
        startParam = tg.initDataUnsafe.start_param;
      }
    }

    // Dev fallback (preview in browser)
    if (!tgId) tgId = 999999999;

    setUserId(tgId);

    // Fetch/create user + streak in parallel
    Promise.all([
      getUser(tgId, tgUsername, tgFirstName),
      getReferralStats(tgId),
    ]).then(([user, refStats]) => {
      setUserData(user as UserData);
      setReferralCount(refStats.count);

      // Determine if daily streak is claimable
      // The server action handles the 20h window — we just optimistically allow if
      // totalEarned > 0 (first boot). Real validation is server-side.
      setStreakData({
        currentStreak: 0,   // updated via claimDailyStreak callback
        longestStreak: 0,
        canClaim: true,     // let server reject if already claimed
      });

      // If user arrived via referral link, track it
      if (startParam && startParam !== user.referralCode) {
        trackReferral(tgId, startParam).catch(() => {/* silent */});
      }

      setBooting(false);
    });
  }, []);

  // ── Global balance update helper ─────────────────────────────────────────
  const handleBalanceUpdate = (delta: number) => {
    setUserData((prev) =>
      prev
        ? {
            ...prev,
            novaBalance: Math.max(0, prev.novaBalance + delta),
            totalEarned: delta > 0 ? prev.totalEarned + delta : prev.totalEarned,
          }
        : prev
    );
  };

  // ── Streak claimed ────────────────────────────────────────────────────────
  const handleStreakClaimed = (bonus: number, newStreak: number) => {
    handleBalanceUpdate(bonus);
    setStreakData((prev) => ({
      ...prev,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, prev.longestStreak),
      canClaim: false,
    }));
  };

  // ── Loading splash ────────────────────────────────────────────────────────
  if (booting || !userData) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-nova-bg gap-4">
        {/* Animated logo */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-nova-gradient opacity-20 animate-pulse-glow" />
          <div className="relative rounded-3xl bg-nova-gradient p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-[calc(1.5rem-2px)] bg-nova-card px-4 py-4">
              <span className="text-3xl" aria-hidden="true">🪙</span>
            </div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xl font-black text-white tracking-tight">NovaDrop</p>
          <p className="text-xs text-nova-muted mt-1">Loading your wallet…</p>
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-nova-violet animate-bounce-light"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Main app ──────────────────────────────────────────────────────────────
  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-nova-bg text-white">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Scrollable screen area */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        {tab === "home" && (
          <HomeScreen
            userId={userId}
            userData={userData}
            streakData={streakData}
            onBalanceUpdate={handleBalanceUpdate}
            onStreakClaimed={handleStreakClaimed}
            onNavigateRedeem={() => setTab("redeem")}
            onNavigateQuests={() => setTab("quests")}
          />
        )}
        {tab === "quests" && (
          <QuestsScreen
            userId={userId}
            onBalanceUpdate={handleBalanceUpdate}
          />
        )}
        {tab === "earn" && (
          <EarnScreen
            userId={userId}
            referralCode={userData.referralCode}
            referralCount={referralCount}
            onBalanceUpdate={handleBalanceUpdate}
          />
        )}
        {tab === "redeem" && (
          <RedeemScreen
            userId={userId}
            novaBalance={userData.novaBalance}
            onBalanceUpdate={handleBalanceUpdate}
          />
        )}
        {tab === "profile" && (
          <ProfileScreen
            userId={userId}
            userData={userData}
            streakData={streakData}
          />
        )}
      </div>

      {/* Bottom navigation */}
      <BottomNav active={tab} onChange={setTab} />
    </main>
  );
}
