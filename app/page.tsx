"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { retrieveLaunchParams } from "@telegram-apps/sdk-react";

import BottomNav, { type Tab } from "@/components/BottomNav";
import HomeScreen    from "@/screens/HomeScreen";
import QuestsScreen  from "@/screens/QuestsScreen";
import TapScreen     from "@/screens/TapScreen";
import WalletScreen  from "@/screens/WalletScreen";
import ProfileScreen from "@/screens/ProfileScreen";

import { getUser, trackReferral, getReferralStats, getStreakData, getEnergy } from "@/app/actions";

interface UserData {
  id: string; username?: string | null; firstName?: string | null;
  novaBalance: number; totalEarned: number; level: number;
  xp: number; xpForNext: number; totalTaps: number;
  referralCode: string; referredBy?: string | null; tonWallet?: string | null;
}

interface StreakData { currentStreak: number; longestStreak: number; canClaim: boolean; }

export default function App() {
  const [tab, setTab]           = useState<Tab>("home");
  const [userId, setUserId]     = useState(0);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [streakData, setStreak] = useState<StreakData>({ currentStreak: 0, longestStreak: 0, canClaim: false });
  const [energy, setEnergy]     = useState(500);
  const [energyMax]             = useState(500);
  const [booting, setBooting]   = useState(true);
  const bootRef = useRef(false);

  // Auto-refill energy every 10s on the client
  useEffect(() => {
    const interval = setInterval(() => {
      setEnergy((prev) => Math.min(prev + 1, energyMax));
    }, 10_000);
    return () => clearInterval(interval);
  }, [energyMax]);

  // Boot sequence
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    if (typeof window !== "undefined") {
      const tg = window.Telegram?.WebApp;
      if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.("#0a0818"); tg.setBackgroundColor?.("#0a0818"); }
    }

    let tgId = 0, tgUsername = "", tgFirstName = "", startParam = "";

    try {
      const lp   = retrieveLaunchParams();
      const user = lp.tgWebAppData?.user;
      if (user) { tgId = user.id; tgUsername = (user.username as string | undefined) ?? ""; tgFirstName = (user.firstName as string | undefined) ?? ""; }
      startParam = lp.tgWebAppStartParam ?? "";
    } catch { /* not in Telegram */ }

    if (!tgId && typeof window !== "undefined") {
      const tg = window.Telegram?.WebApp;
      if (tg?.initDataUnsafe?.user) {
        tgId = tg.initDataUnsafe.user.id;
        tgUsername = tg.initDataUnsafe.user.username ?? "";
        tgFirstName = tg.initDataUnsafe.user.first_name ?? "";
      }
      if (!startParam) startParam = tg?.initDataUnsafe?.start_param ?? "";
    }

    if (!tgId) tgId = 999999999; // dev fallback
    setUserId(tgId);

    Promise.all([
      getUser(tgId, tgUsername, tgFirstName),
      getReferralStats(tgId),
      getStreakData(tgId),
      getEnergy(tgId),
    ]).then(([user, , streak, energyData]) => {
      setUserData(user as UserData);
      setStreak({ currentStreak: streak.currentStreak, longestStreak: streak.longestStreak, canClaim: streak.canClaim });
      setEnergy(energyData.current);

      if (startParam && startParam !== user.referralCode) {
        trackReferral(tgId, startParam).catch(() => {});
      }
      setBooting(false);
    });
  }, []);

  const handleBalanceUpdate = useCallback((delta: number) => {
    setUserData((prev) => prev ? {
      ...prev,
      novaBalance: Math.max(0, prev.novaBalance + delta),
      totalEarned: delta > 0 ? prev.totalEarned + delta : prev.totalEarned,
    } : prev);
  }, []);

  const handleStreakClaimed = useCallback((bonus: number, newStreak: number) => {
    handleBalanceUpdate(bonus);
    setStreak((prev) => ({ ...prev, currentStreak: newStreak, longestStreak: Math.max(newStreak, prev.longestStreak), canClaim: false }));
  }, [handleBalanceUpdate]);

  const handleWalletConnected = useCallback((address: string) => {
    setUserData((prev) => prev ? { ...prev, tonWallet: address } : prev);
  }, []);

  // ── Loading splash ──────────────────────────────────────────────────────────
  if (booting || !userData) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-5" style={{ background: "#0a0818" }}>
        <div className="relative">
          <div className="h-24 w-24 rounded-3xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#f59e0b,#fbbf24)", boxShadow: "0 0 60px rgba(245,158,11,0.5)" }}>
            <span style={{ fontSize: 48 }}>🪙</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-white tracking-tight">NovaDrop</p>
          <p className="text-xs mt-1" style={{ color: "rgba(167,139,250,0.5)" }}>Loading your wallet…</p>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-2 w-2 rounded-full bounce-dot" style={{ background: "#a855f7", animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Main app ────────────────────────────────────────────────────────────────
  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden" style={{ background: "#0a0818" }}>
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true"
        style={{ background: "radial-gradient(ellipse 80% 35% at 50% 0%, rgba(124,58,237,0.1) 0%, transparent 70%)" }} />

      {/* Scrollable content */}
      <div className="relative flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        {tab === "home" && (
          <HomeScreen userId={userId} userData={userData} streakData={streakData}
            energy={energy} energyMax={energyMax}
            onBalanceUpdate={handleBalanceUpdate} onStreakClaimed={handleStreakClaimed}
            onNavigateTap={() => setTab("tap")} onNavigateQuests={() => setTab("quests")} onNavigateWallet={() => setTab("wallet")} />
        )}
        {tab === "quests" && (
          <QuestsScreen userId={userId} referralCode={userData.referralCode} onBalanceUpdate={handleBalanceUpdate} />
        )}
        {tab === "tap" && (
          <TapScreen userId={userId} energy={energy} energyMax={energyMax}
            onEnergyUpdate={setEnergy} onBalanceUpdate={handleBalanceUpdate} />
        )}
        {tab === "wallet" && (
          <WalletScreen userId={userId} novaBalance={userData.novaBalance}
            tonWallet={userData.tonWallet} onBalanceUpdate={handleBalanceUpdate} onWalletConnected={handleWalletConnected} />
        )}
        {tab === "profile" && (
          <ProfileScreen userId={userId} userData={userData} streakData={streakData} />
        )}
      </div>

      <BottomNav active={tab} onChange={setTab} energy={energy} energyMax={energyMax} />
    </main>
  );
}
