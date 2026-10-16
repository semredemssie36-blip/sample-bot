"use client";

import { useState, useEffect } from "react";
import { requestWithdrawal, getTransactions, connectWallet, getReferralStats } from "@/app/actions";

interface WalletScreenProps {
  userId: number;
  novaBalance: number;
  tonWallet?: string | null;
  onBalanceUpdate: (delta: number) => void;
  onWalletConnected: (address: string) => void;
}

interface TxItem {
  id: string; type: string; amount: number; description: string; createdAt: Date;
}

const TX_ICONS: Record<string, string> = {
  TAP_REWARD:       "🪙", QUEST_REWARD:  "✅", REFERRAL_BONUS: "🤝",
  PASSIVE_INCOME:   "💸", STREAK_BONUS:  "🔥", AD_REWARD:      "📺",
  ACHIEVEMENT_BONUS:"🏆", WITHDRAWAL:    "💎", ADMIN_GRANT:    "🎁",
};

const NOVA_PER_TON  = 100_000;
const MIN_WITHDRAW  = 100_000;
const TON_PRICE_USD = 6;

export default function WalletScreen({ userId, novaBalance, tonWallet, onBalanceUpdate, onWalletConnected }: WalletScreenProps) {
  const [walletAddress, setWalletAddress] = useState(tonWallet ?? "");
  const [novaAmount, setNovaAmount]       = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState("");
  const [success, setSuccess]             = useState(false);
  const [txs, setTxs]                     = useState<TxItem[]>([]);
  const [txLoading, setTxLoading]         = useState(true);
  const [passiveToday, setPassiveToday]   = useState(0);
  const [connectingWallet, setConnecting] = useState(false);

  const ton  = novaAmount ? (parseInt(novaAmount, 10) / NOVA_PER_TON).toFixed(4) : "0.0000";
  const usd  = novaAmount ? ((parseInt(novaAmount, 10) / NOVA_PER_TON) * TON_PRICE_USD).toFixed(2) : "0.00";
  const isValid = walletAddress.trim().length > 10 && parseInt(novaAmount, 10) >= MIN_WITHDRAW && parseInt(novaAmount, 10) <= novaBalance;

  useEffect(() => {
    Promise.all([getTransactions(userId), getReferralStats(userId)]).then(([t, r]) => {
      setTxs(t); setTxLoading(false); setPassiveToday(r.passiveToday);
    });
  }, [userId]);

  const handleConnectWallet = async () => {
    const address = prompt("Enter your TON wallet address (UQ...):");
    if (!address?.trim()) return;
    setConnecting(true);
    await connectWallet(userId, address.trim());
    setWalletAddress(address.trim());
    onWalletConnected(address.trim());
    setConnecting(false);
  };

  const handleWithdraw = async () => {
    setError("");
    if (!isValid) return;
    setSubmitting(true);
    const res = await requestWithdrawal(userId, parseInt(novaAmount, 10), walletAddress.trim());
    if (res.success) {
      onBalanceUpdate(-parseInt(novaAmount, 10));
      setSuccess(true);
      setNovaAmount("");
      const t = await getTransactions(userId);
      setTxs(t);
    } else {
      setError(res.error ?? "Withdrawal failed");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col pb-28 gap-4 px-4 pt-4">
      <h1 className="text-lg font-black text-white">Wallet</h1>

      {/* ── Balance overview ── */}
      <div className="rounded-3xl px-5 py-5" style={{ background: "linear-gradient(135deg,#1a1040,#0e0b22)", border: "1px solid rgba(124,58,237,0.25)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(167,139,250,0.5)" }}>Available Balance</p>
        <div className="flex items-end gap-2 mb-0.5">
          <span className="text-3xl font-black text-white">{novaBalance.toLocaleString()}</span>
          <span className="mb-0.5 text-sm font-bold" style={{ color: "#a855f7" }}>NOVA</span>
        </div>
        <p className="text-sm mb-4" style={{ color: "rgba(167,139,250,0.4)" }}>
          ≈ {(novaBalance / NOVA_PER_TON).toFixed(4)} TON · ${((novaBalance / NOVA_PER_TON) * TON_PRICE_USD).toFixed(2)}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Passive Today", value: `+${passiveToday.toLocaleString()} NOVA`, color: "#10b981" },
            { label: "Rate",          value: "100K NOVA = 1 TON",                       color: "#a855f7" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[0.58rem] uppercase tracking-wide" style={{ color: "rgba(167,139,250,0.4)" }}>{label}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TON Wallet connection ── */}
      <div className="rounded-2xl px-4 py-4" style={{ background: "rgba(19,15,42,0.9)", border: "1px solid rgba(37,28,74,0.9)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-white">TON Wallet</p>
          {walletAddress && <span className="text-[0.6rem] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>✓ Connected</span>}
        </div>
        {walletAddress ? (
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <span className="text-base">💎</span>
            <p className="flex-1 text-xs font-mono truncate text-white">{walletAddress}</p>
            <button onClick={handleConnectWallet} className="text-[0.6rem]" style={{ color: "rgba(167,139,250,0.5)" }}>Change</button>
          </div>
        ) : (
          <button onClick={handleConnectWallet} disabled={connectingWallet}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg,#0088cc,#00aae4)" }}>
            {connectingWallet ? "Connecting…" : "💎 Connect TON Wallet"}
          </button>
        )}
      </div>

      {/* ── Withdrawal form ── */}
      <div className="rounded-2xl px-4 py-4 space-y-3" style={{ background: "rgba(19,15,42,0.9)", border: "1px solid rgba(37,28,74,0.9)" }}>
        <p className="text-sm font-bold text-white">Withdraw to TON</p>

        {success && (
          <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}>
            ✅ Withdrawal submitted! Arrives in 24–48h.
          </div>
        )}

        <div>
          <label className="block text-xs mb-1.5" style={{ color: "rgba(167,139,250,0.5)" }}>TON Wallet Address</label>
          <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="UQA…" autoComplete="off"
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(37,28,74,0.9)" }} />
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs" style={{ color: "rgba(167,139,250,0.5)" }}>NOVA Amount</label>
            <button onClick={() => setNovaAmount(String(novaBalance))} className="text-xs font-bold" style={{ color: "#a855f7" }}>MAX</button>
          </div>
          <input type="number" inputMode="numeric" value={novaAmount} onChange={(e) => setNovaAmount(e.target.value)}
            placeholder={`Min. ${MIN_WITHDRAW.toLocaleString()}`}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(37,28,74,0.9)" }} />
          {novaAmount && (
            <p className="mt-1.5 text-xs" style={{ color: "rgba(167,139,250,0.5)" }}>
              ≈ <span className="font-bold text-white">{ton} TON</span> · <span>${usd}</span>
            </p>
          )}
        </div>

        <p className="text-[0.6rem]" style={{ color: "rgba(167,139,250,0.4)" }}>
          Min. {MIN_WITHDRAW.toLocaleString()} NOVA = 1 TON · Processed in 24–48h
        </p>

        {error && <p className="text-xs rounded-xl px-3 py-2" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{error}</p>}

        <button onClick={handleWithdraw} disabled={!isValid || submitting}
          className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all active:scale-95"
          style={isValid && !submitting
            ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 20px rgba(124,58,237,0.3)" }
            : { background: "rgba(255,255,255,0.05)", color: "rgba(167,139,250,0.3)" }}>
          {submitting ? "Submitting…" : "Request Withdrawal"}
        </button>
      </div>

      {/* ── Transaction history ── */}
      <div>
        <p className="text-sm font-bold text-white mb-3">Transaction History</p>
        {txLoading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-2xl mb-2 shimmer" style={{ background: "rgba(19,15,42,0.4)" }} />)
        ) : txs.length === 0 ? (
          <div className="flex flex-col items-center py-10">
            <span className="text-3xl mb-2">📭</span>
            <p className="text-sm" style={{ color: "rgba(167,139,250,0.5)" }}>No transactions yet</p>
          </div>
        ) : txs.map((tx) => (
          <div key={tx.id} className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-2"
            style={{ background: "rgba(19,15,42,0.8)", border: "1px solid rgba(37,28,74,0.6)" }}>
            <span className="text-xl">{TX_ICONS[tx.type] ?? "💫"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{tx.description}</p>
              <p className="text-[0.58rem]" style={{ color: "rgba(167,139,250,0.4)" }}>
                {new Date(tx.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <span className="text-sm font-black tabular-nums shrink-0" style={{ color: tx.amount > 0 ? "#10b981" : "#ef4444" }}>
              {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
