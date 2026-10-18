"use client";

import { useState } from "react";
import TapScreen          from "@/screens/TapScreen";
import NovaBlasterScreen  from "@/screens/NovaBlasterScreen";

interface PlayScreenProps {
  userId:          number;
  energy:          number;
  energyMax:       number;
  onEnergyUpdate:  (e: number) => void;
  onBalanceUpdate: (delta: number) => void;
}

type Game = "hub" | "tap" | "blaster";

export default function PlayScreen({
  userId, energy, energyMax, onEnergyUpdate, onBalanceUpdate,
}: PlayScreenProps) {
  const [game, setGame] = useState<Game>("hub");

  // ── Sub-game screens ──────────────────────────────────────────────────────
  if (game === "tap") {
    return (
      <div className="flex flex-col h-full">
        <button
          onClick={() => setGame("hub")}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold shrink-0"
          style={{ background: "rgba(10,8,24,0.9)", borderBottom: "1px solid rgba(37,28,74,0.6)", color: "rgba(167,139,250,0.7)" }}
        >
          ← Back to Games
        </button>
        <TapScreen
          userId={userId}
          energy={energy}
          energyMax={energyMax}
          onEnergyUpdate={onEnergyUpdate}
          onBalanceUpdate={onBalanceUpdate}
        />
      </div>
    );
  }

  if (game === "blaster") {
    return (
      <div className="flex flex-col h-full">
        <button
          onClick={() => setGame("hub")}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold shrink-0"
          style={{ background: "rgba(10,8,24,0.9)", borderBottom: "1px solid rgba(37,28,74,0.6)", color: "rgba(167,139,250,0.7)" }}
        >
          ← Back to Games
        </button>
        <NovaBlasterScreen
          userId={userId}
          onBalanceUpdate={onBalanceUpdate}
        />
      </div>
    );
  }

  // ── Games Hub ─────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col pb-28 pt-4 px-4 gap-4"
      style={{ background: "#0a0818", minHeight: "100%" }}
    >
      <div>
        <h1 className="text-lg font-black text-white">Games</h1>
        <p className="text-xs mt-0.5" style={{ color: "rgba(167,139,250,0.5)" }}>
          Play games, earn NOVA — every session counts
        </p>
      </div>

      {/* ── Tap Coin card ───────────────────────────────────────────────── */}
      <button
        onClick={() => setGame("tap")}
        className="flex items-center gap-4 rounded-3xl px-5 py-5 text-left w-full transition-all active:scale-98"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(251,191,36,0.06) 100%)",
          border:     "1px solid rgba(245,158,11,0.3)",
        }}
      >
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl"
          style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)", boxShadow: "0 0 24px rgba(245,158,11,0.4)" }}
        >
          🪙
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black text-white">Tap Coin</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(167,139,250,0.5)" }}>
            Tap the coin to earn NOVA. Energy refills over time.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="text-[0.6rem] font-bold rounded-full px-2 py-0.5"
              style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }}
            >
              1 NOVA / tap
            </span>
            <span className="text-[0.6rem]" style={{ color: "rgba(167,139,250,0.4)" }}>
              ⚡ {energy}/{energyMax} energy
            </span>
          </div>
        </div>
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" stroke="rgba(167,139,250,0.4)" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      {/* ── Nova Blaster card ───────────────────────────────────────────── */}
      <button
        onClick={() => setGame("blaster")}
        className="flex items-center gap-4 rounded-3xl px-5 py-5 text-left w-full transition-all active:scale-98"
        style={{
          background: "linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(236,72,153,0.06) 100%)",
          border:     "1px solid rgba(168,85,247,0.3)",
        }}
      >
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl"
          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7,#e879f9)", boxShadow: "0 0 24px rgba(168,85,247,0.4)" }}
        >
          🚀
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-black text-white">Nova Blaster</p>
            <span
              className="text-[0.55rem] font-black rounded-full px-1.5 py-0.5 uppercase tracking-wide"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}
            >
              NEW
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "rgba(167,139,250,0.5)" }}>
            Survive the swarm. The deeper you go, the more you earn.
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span
              className="text-[0.6rem] font-bold rounded-full px-2 py-0.5"
              style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#a855f7" }}
            >
              2 NOVA / kill
            </span>
            <span
              className="text-[0.6rem] font-bold rounded-full px-2 py-0.5"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
            >
              Boss: +100 NOVA
            </span>
            <span className="text-[0.6rem]" style={{ color: "rgba(167,139,250,0.4)" }}>
              5 enemy types
            </span>
          </div>
        </div>
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" stroke="rgba(167,139,250,0.4)" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      {/* Coming soon card */}
      <div
        className="flex items-center gap-4 rounded-3xl px-5 py-4 opacity-50"
        style={{
          background: "rgba(255,255,255,0.03)",
          border:     "1px dashed rgba(255,255,255,0.1)",
        }}
      >
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          🎯
        </div>
        <div>
          <p className="text-sm font-bold text-white">More Games</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(167,139,250,0.4)" }}>
            Coming soon — stay tuned
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div
        className="rounded-2xl px-4 py-3"
        style={{ background: "rgba(19,15,42,0.8)", border: "1px solid rgba(37,28,74,0.8)" }}
      >
        <p className="text-[0.6rem] uppercase tracking-wide mb-2" style={{ color: "rgba(167,139,250,0.4)" }}>
          Your gaming stats
        </p>
        <div className="flex items-center justify-around">
          {[
            { label: "Games Played",   value: "—" },
            { label: "Best Wave",      value: "—" },
            { label: "Total Earned",   value: "—" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-base font-black text-white">{value}</p>
              <p className="text-[0.55rem]" style={{ color: "rgba(167,139,250,0.4)" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
