"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { tapCoin } from "@/app/actions";

interface TapScreenProps {
  userId: number;
  energy: number;
  energyMax: number;
  onEnergyUpdate: (energy: number) => void;
  onBalanceUpdate: (delta: number) => void;
}

interface FloatText {
  id: number;
  x: number;
  y: number;
  value: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

export default function TapScreen({ userId, energy, energyMax, onEnergyUpdate, onBalanceUpdate }: TapScreenProps) {
  const [localEnergy, setLocalEnergy] = useState(energy);
  const [totalTapped, setTotalTapped]  = useState(0);
  const [combo, setCombo]              = useState(0);
  const [isTapping, setIsTapping]      = useState(false);
  const [floatTexts, setFloatTexts]    = useState<FloatText[]>([]);
  const [particles, setParticles]      = useState<Particle[]>([]);
  const [isAnimating, setIsAnimating]  = useState(false);

  const coinRef     = useRef<HTMLButtonElement>(null);
  const pendingTaps = useRef(0);
  const flushTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatIdRef  = useRef(0);
  const partIdRef   = useRef(0);

  useEffect(() => { setLocalEnergy(energy); }, [energy]);

  // Flush accumulated taps to server every 500ms
  const flushTaps = useCallback(async () => {
    if (pendingTaps.current === 0) return;
    const tapsToSend = pendingTaps.current;
    pendingTaps.current = 0;

    const res = await tapCoin(userId, tapsToSend);
    if (res.success) {
      onBalanceUpdate(res.novaEarned ?? tapsToSend);
      onEnergyUpdate(res.energy?.current ?? 0);
    }
  }, [userId, onBalanceUpdate, onEnergyUpdate]);

  const spawnParticles = useCallback((x: number, y: number) => {
    const colors = ["#f59e0b", "#fbbf24", "#fcd34d", "#a855f7", "#ec4899", "#ffffff"];
    const newParticles: Particle[] = Array.from({ length: 8 }, () => ({
      id:    ++partIdRef.current,
      x, y,
      vx:    (Math.random() - 0.5) * 120,
      vy:    -(Math.random() * 80 + 40),
      color: colors[Math.floor(Math.random() * colors.length)],
      size:  Math.random() * 6 + 3,
    }));
    setParticles((prev) => [...prev.slice(-30), ...newParticles]);
    setTimeout(() => setParticles((prev) => prev.filter((p) => !newParticles.find((n) => n.id === p.id))), 800);
  }, []);

  const handleTap = useCallback((e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    if (localEnergy <= 0) return;

    // Get tap coordinates
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0]?.clientX ?? 0;
      clientY = e.touches[0]?.clientY ?? 0;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect   = coinRef.current?.getBoundingClientRect();
    const tapX   = rect ? clientX - rect.left : 100;
    const tapY   = rect ? clientY - rect.top  : 100;

    // Update local energy immediately for responsive feel
    setLocalEnergy((prev) => Math.max(0, prev - 1));
    setTotalTapped((prev) => prev + 1);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 180);

    // Combo
    setCombo((prev) => prev + 1);
    if (comboTimer.current) clearTimeout(comboTimer.current);
    comboTimer.current = setTimeout(() => setCombo(0), 1500);

    // Float text
    const fid = ++floatIdRef.current;
    setFloatTexts((prev) => [...prev.slice(-10), { id: fid, x: tapX, y: tapY, value: 1 }]);
    setTimeout(() => setFloatTexts((prev) => prev.filter((f) => f.id !== fid)), 900);

    // Particles
    spawnParticles(tapX, tapY);

    // Accumulate tap
    pendingTaps.current += 1;
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(flushTaps, 500);

  }, [localEnergy, flushTaps, spawnParticles]);

  // Flush on unmount
  useEffect(() => () => { if (pendingTaps.current > 0) flushTaps(); }, [flushTaps]);

  const energyPct  = (localEnergy / energyMax) * 100;
  const isEmpty    = localEnergy <= 0;
  const comboMult  = combo >= 20 ? 3 : combo >= 10 ? 2 : 1;

  return (
    <div
      className="flex flex-col items-center justify-between min-h-full pb-28 pt-4"
      style={{ background: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(124,58,237,0.15) 0%, transparent 70%), #0a0818" }}
    >
      {/* Header */}
      <div className="w-full px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(167,139,250,0.5)" }}>
          Tap the coin
        </p>
        {combo >= 5 && (
          <div className="inline-flex items-center gap-1.5 mt-1 rounded-full px-3 py-0.5 text-xs font-black pop-in"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", color: "#f59e0b" }}>
            🔥 {combo}x COMBO{comboMult > 1 ? ` (×${comboMult})` : ""}!
          </div>
        )}
      </div>

      {/* Coin button */}
      <div className="relative flex items-center justify-center flex-1 w-full">
        <button
          ref={coinRef}
          onMouseDown={handleTap}
          onTouchStart={handleTap}
          disabled={isEmpty}
          aria-label="Tap coin to earn NOVA"
          className="relative flex items-center justify-center rounded-full transition-none select-none"
          style={{
            width:  220, height: 220,
            background: isEmpty
              ? "linear-gradient(135deg,#374151,#4b5563)"
              : "linear-gradient(135deg,#f59e0b,#fbbf24,#fde68a,#fbbf24,#f59e0b)",
            boxShadow: isEmpty
              ? "none"
              : isAnimating
              ? "0 0 80px rgba(245,158,11,0.9), 0 0 160px rgba(245,158,11,0.4)"
              : "0 0 40px rgba(245,158,11,0.6), 0 0 80px rgba(245,158,11,0.25)",
            transform:  isAnimating ? "scale(0.93)" : "scale(1)",
            transition: isAnimating ? "none" : "transform 0.15s ease, box-shadow 0.3s ease",
            border:     "4px solid rgba(251,191,36,0.6)",
          }}
        >
          {/* Inner coin face */}
          <div
            className="flex flex-col items-center justify-center rounded-full"
            style={{ width: 180, height: 180, background: "radial-gradient(circle at 35% 35%, #fde68a, #f59e0b 50%, #d97706)" }}
          >
            <span style={{ fontSize: 72, lineHeight: 1, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))" }} aria-hidden="true">
              🪙
            </span>
            <span className="text-xs font-black uppercase tracking-widest mt-1" style={{ color: "rgba(120,53,15,0.8)" }}>
              NOVA
            </span>
          </div>

          {/* Particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="pointer-events-none absolute rounded-full"
              style={{
                left:      p.x, top: p.y,
                width:     p.size, height: p.size,
                background: p.color,
                transform: `translate(${p.vx * 0.8}px, ${p.vy * 0.8}px)`,
                opacity:   0,
                transition: "transform 0.7s ease-out, opacity 0.7s ease-out",
              }}
            />
          ))}
        </button>

        {/* Float texts */}
        {floatTexts.map((f) => (
          <div
            key={f.id}
            className="pointer-events-none absolute float-up text-lg font-black"
            style={{ left: f.x, top: f.y, color: "#fbbf24", textShadow: "0 0 10px rgba(245,158,11,0.8)", zIndex: 10 }}
          >
            +{f.value}
          </div>
        ))}

        {/* Empty energy overlay */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}>
            <div className="text-center">
              <div className="text-3xl mb-1">⚡</div>
              <p className="text-sm font-bold text-white">Energy Empty</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(167,139,250,0.6)" }}>Refilling…</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="w-full px-4 mt-2">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "This Session", value: totalTapped, color: "#a855f7" },
            { label: "Energy",       value: `${localEnergy}/${energyMax}`, color: energyPct > 20 ? "#10b981" : "#ef4444" },
            { label: "Combo",        value: combo > 0 ? `${combo}×` : "—", color: "#f59e0b" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl px-3 py-3 text-center"
              style={{ background: "rgba(19,15,42,0.8)", border: "1px solid rgba(37,28,74,0.8)" }}>
              <p className="text-[0.58rem] uppercase tracking-wide mb-1" style={{ color: "rgba(167,139,250,0.5)" }}>{label}</p>
              <p className="text-base font-black tabular-nums" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Energy bar */}
        <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(19,15,42,0.8)", border: "1px solid rgba(37,28,74,0.8)" }}>
          <div className="flex justify-between mb-2">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              ⚡ Energy
            </span>
            <span className="text-xs font-bold" style={{ color: energyPct > 20 ? "#10b981" : "#ef4444" }}>
              {localEnergy} / {energyMax}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${energyPct}%`,
                background: energyPct > 50
                  ? "linear-gradient(90deg,#059669,#10b981)"
                  : energyPct > 20
                  ? "linear-gradient(90deg,#d97706,#f59e0b)"
                  : "linear-gradient(90deg,#dc2626,#ef4444)",
              }}
            />
          </div>
          <p className="mt-1.5 text-[0.6rem]" style={{ color: "rgba(167,139,250,0.4)" }}>
            +1 energy every 10 seconds • Full in ~{Math.ceil(((energyMax - localEnergy) * 10) / 60)}min
          </p>
        </div>
      </div>
    </div>
  );
}
