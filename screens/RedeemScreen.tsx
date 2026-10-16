"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import { requestWithdrawal, getTransactions } from "@/app/actions";

interface RedeemScreenProps {
  userId: number;
  novaBalance: number;
  onBalanceUpdate: (delta: number) => void;
}

interface TxItem {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: Date;
}

const TX_ICONS: Record<string, string> = {
  QUEST_REWARD:  "✅",
  REFERRAL_BONUS:"🤝",
  STREAK_BONUS:  "🔥",
  AD_REWARD:     "📺",
  WITHDRAWAL:    "💸",
  ADMIN_GRANT:   "🎁",
};

const MIN_WITHDRAWAL = 5000;
const NOVA_PER_TON   = 10000;

export default function RedeemScreen({ userId, novaBalance, onBalanceUpdate }: RedeemScreenProps) {
  const [walletAddress, setWalletAddress] = useState("");
  const [novaAmount, setNovaAmount]       = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [showSuccess, setShowSuccess]     = useState(false);
  const [error, setError]                 = useState("");
  const [transactions, setTransactions]   = useState<TxItem[]>([]);
  const [txLoading, setTxLoading]         = useState(true);

  const tonPreview = novaAmount
    ? (parseInt(novaAmount, 10) / NOVA_PER_TON).toFixed(4)
    : "0.0000";

  const isValid =
    walletAddress.trim().length > 10 &&
    parseInt(novaAmount, 10) >= MIN_WITHDRAWAL &&
    parseInt(novaAmount, 10) <= novaBalance;

  useEffect(() => {
    getTransactions(userId).then((txs) => {
      setTransactions(txs);
      setTxLoading(false);
    });
  }, [userId]);

  const handleWithdraw = async () => {
    setError("");
    if (!isValid) return;
    setSubmitting(true);
    try {
      const res = await requestWithdrawal(
        userId,
        parseInt(novaAmount, 10),
        walletAddress.trim()
      );
      if (res.success) {
        onBalanceUpdate(-parseInt(novaAmount, 10));
        setShowSuccess(true);
        setNovaAmount("");
        setWalletAddress("");
        // Refresh transaction list
        const txs = await getTransactions(userId);
        setTransactions(txs);
      } else {
        setError(res.error ?? "Withdrawal failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const setMax = () => setNovaAmount(String(novaBalance));

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-lg font-black text-white">Redeem</h1>
        <p className="text-xs text-nova-muted mt-0.5">Convert your NOVA to real TON</p>
      </div>

      {/* Balance summary */}
      <div className="nova-card px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-nova-muted uppercase tracking-wide">Available</p>
          <p className="text-2xl font-black text-nova-gold">{novaBalance.toLocaleString()} <span className="text-sm">NOVA</span></p>
        </div>
        <div className="text-right">
          <p className="text-xs text-nova-muted uppercase tracking-wide">Rate</p>
          <p className="text-sm font-bold text-white">10,000 NOVA = 1 TON</p>
        </div>
      </div>

      {/* Withdrawal form */}
      <div className="nova-card px-5 py-5 space-y-4">
        <p className="text-sm font-bold text-white">Withdraw to TON wallet</p>

        {/* Wallet address */}
        <div>
          <label htmlFor="wallet" className="block text-xs text-nova-muted mb-1.5">
            TON Wallet Address
          </label>
          <input
            id="wallet"
            type="text"
            placeholder="UQA…"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-nova-border px-3 py-2.5
                       text-sm text-white placeholder-nova-muted/50 outline-none
                       focus:border-nova-violet transition-colors"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* NOVA amount */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="amount" className="text-xs text-nova-muted">
              Amount (NOVA)
            </label>
            <button
              onClick={setMax}
              className="text-xs font-semibold text-nova-violet active:opacity-70"
              aria-label="Set maximum NOVA amount"
            >
              MAX
            </button>
          </div>
          <input
            id="amount"
            type="number"
            inputMode="numeric"
            placeholder={`Min. ${MIN_WITHDRAWAL.toLocaleString()}`}
            value={novaAmount}
            onChange={(e) => setNovaAmount(e.target.value)}
            min={MIN_WITHDRAWAL}
            max={novaBalance}
            className="w-full rounded-xl bg-white/5 border border-nova-border px-3 py-2.5
                       text-sm text-white placeholder-nova-muted/50 outline-none
                       focus:border-nova-violet transition-colors"
          />
          {/* TON preview */}
          <p className="mt-1.5 text-xs text-nova-muted">
            ≈ <span className="font-semibold text-white">{tonPreview} TON</span>
          </p>
        </div>

        {/* Minimum notice */}
        <p className="text-[0.6rem] text-nova-muted">
          Minimum withdrawal: {MIN_WITHDRAWAL.toLocaleString()} NOVA (0.5 TON). Processed within 24–48h.
        </p>

        {/* Error */}
        {error && (
          <p className="rounded-xl bg-nova-red/10 border border-nova-red/30 px-3 py-2 text-xs text-nova-red" role="alert">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleWithdraw}
          disabled={!isValid || submitting}
          aria-busy={submitting}
          className={`w-full rounded-2xl py-3.5 text-sm font-bold transition-all duration-150
            ${isValid && !submitting
              ? "bg-nova-gradient text-white shadow-lg shadow-nova-purple/30 active:scale-95"
              : "bg-white/5 text-nova-muted cursor-not-allowed"
            }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              Submitting…
            </span>
          ) : (
            "Request Withdrawal"
          )}
        </button>
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wide mb-3">History</h2>
        {txLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="nova-card h-14 shimmer" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="text-3xl mb-2" aria-hidden="true">📭</span>
            <p className="text-sm text-nova-muted">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="nova-card flex items-center gap-3 px-4 py-3">
                <span className="text-xl" aria-hidden="true">
                  {TX_ICONS[tx.type] ?? "💫"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{tx.description}</p>
                  <p className="text-[0.6rem] text-nova-muted">
                    {new Date(tx.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <p className={`text-sm font-bold tabular-nums shrink-0
                  ${tx.amount > 0 ? "text-nova-green" : "text-nova-red"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Success modal */}
      <Modal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Withdrawal Submitted! 🚀"
      >
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-nova-green/10 border border-nova-green/30">
            <span className="text-3xl">✅</span>
          </div>
          <p className="text-sm text-nova-muted">
            Your withdrawal is being processed. TON will arrive in your wallet within 24–48 hours.
          </p>
          <button
            onClick={() => setShowSuccess(false)}
            className="nova-btn w-full mt-2"
          >
            Got it
          </button>
        </div>
      </Modal>
    </div>
  );
}
