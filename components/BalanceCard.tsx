"use client";

interface BalanceCardProps {
  novaBalance: number;
  totalEarned: number;
  level: number;
  xp: number;
  xpForNext: number;
  firstName?: string | null;
  onRedeem: () => void;
  onHistory: () => void;
}

/** Dollar-equivalent: 10,000 NOVA = $10 → 1 NOVA = $0.001 */
function novaToDollars(nova: number) {
  return (nova * 0.001).toFixed(2);
}

export default function BalanceCard({
  novaBalance,
  onRedeem,
  onHistory,
}: BalanceCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl px-5 py-5"
      style={{
        background: "linear-gradient(135deg, #2a1a5e 0%, #1e1245 60%, #16103a 100%)",
        border: "1px solid rgba(139,92,246,0.25)",
      }}
      aria-label="Balance card"
    >
      {/* Subtle top-right glow */}
      <div
        className="pointer-events-none absolute -top-6 -right-6 h-40 w-40 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }}
      />

      {/* Treasure chest — positioned right side */}
      <div
        className="pointer-events-none absolute right-0 bottom-0 select-none"
        aria-hidden="true"
        style={{ fontSize: "clamp(70px, 22vw, 110px)", lineHeight: 1, transform: "translate(8px, 8px)" }}
      >
        🧰
      </div>

      {/* Floating gems */}
      <div className="pointer-events-none absolute right-16 top-4 text-xl opacity-70" aria-hidden="true">💎</div>
      <div className="pointer-events-none absolute right-10 top-12 text-sm opacity-50" aria-hidden="true">✨</div>

      {/* Label */}
      <p className="text-xs font-semibold text-purple-300/70 uppercase tracking-widest mb-1">
        Your Balance
      </p>

      {/* Balance */}
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-4xl font-black text-white tabular-nums">
          {novaBalance.toLocaleString()}
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-black text-white"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
        >
          XP
        </span>
      </div>

      {/* Dollar value */}
      <p className="text-sm text-purple-300/60 mb-5">
        ≈ ${novaToDollars(novaBalance)} value
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onRedeem}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)" }}
          aria-label="Redeem now"
        >
          Redeem Now
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white" aria-hidden="true">
            <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          </svg>
        </button>

        <button
          onClick={onHistory}
          className="flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold text-purple-200 transition-all active:scale-95"
          style={{ borderColor: "rgba(139,92,246,0.35)", background: "rgba(139,92,246,0.1)" }}
          aria-label="Wallet history"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" fill="none" aria-hidden="true">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round"/>
          </svg>
          Wallet History
        </button>
      </div>
    </div>
  );
}
