"use client";

import { useState } from "react";
import Modal from "@/components/Modal";

interface EarnScreenProps {
  userId: number;
  referralCode: string;
  referralCount: number;
  onBalanceUpdate: (delta: number) => void;
}

// Adsgram ad reward per view (in NOVA coins)
const AD_REWARD = 100;

declare global {
  interface Window {
    Adsgram?: {
      init: (opts: { blockId: string }) => {
        show: () => Promise<{ done: boolean }>;
      };
    };
  }
}

export default function EarnScreen({
  userId,
  referralCode,
  referralCount,
  onBalanceUpdate,
}: EarnScreenProps) {
  const [adLoading, setAdLoading] = useState(false);
  const [adCooldown, setAdCooldown] = useState(false);
  const [showAdSuccess, setShowAdSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME ?? "gameaaappbot";
  const referralUrl = `https://t.me/${botUsername}?start=${referralCode}`;

  // ── Watch ad via Adsgram ───────────────────────────────────────────────────
  const handleWatchAd = async () => {
    if (adLoading || adCooldown) return;
    setAdLoading(true);

    try {
      if (typeof window !== "undefined" && window.Adsgram) {
        const block = window.Adsgram.init({
          blockId: process.env.NEXT_PUBLIC_ADSGRAM_BLOCK_ID ?? "YOUR_BLOCK_ID",
        });
        const result = await block.show();
        if (result.done) {
          // Ad watched successfully — credit the user via server action
          const res = await fetch("/api/ad-reward", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });
          const data = await res.json();
          if (data.success) {
            onBalanceUpdate(AD_REWARD);
            setShowAdSuccess(true);
            // 60-second cooldown between ads
            setAdCooldown(true);
            setTimeout(() => setAdCooldown(false), 60_000);
          }
        }
      } else {
        // Dev/preview fallback — simulate ad reward
        await new Promise((r) => setTimeout(r, 1500));
        onBalanceUpdate(AD_REWARD);
        setShowAdSuccess(true);
        setAdCooldown(true);
        setTimeout(() => setAdCooldown(false), 60_000);
      }
    } catch (err) {
      console.error("Ad error:", err);
    } finally {
      setAdLoading(false);
    }
  };

  // ── Copy invite link ───────────────────────────────────────────────────────
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback: open Telegram share
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent("Join NovaDrop and start earning NOVA! 🚀")}`;
      window.open(shareUrl, "_blank");
    }
  };

  // ── Share via Telegram ─────────────────────────────────────────────────────
  const handleShareTelegram = () => {
    const text = encodeURIComponent(
      "🚀 I'm earning NOVA coins on NovaDrop!\nComplete quests, watch ads, invite friends and withdraw real TON.\nJoin with my link:"
    );
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${text}`;
    window.open(shareUrl, "_blank");
  };

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-lg font-black text-white">Earn More NOVA</h1>
        <p className="text-xs text-nova-muted mt-0.5">Watch ads, invite friends, complete sponsor tasks</p>
      </div>

      {/* ── Watch Ad card ─────────────────────────────────────────────────── */}
      <div className="nova-card px-5 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nova-gold/10 border border-nova-gold/20">
            <span className="text-2xl" aria-hidden="true">📺</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Watch an Ad</p>
            <p className="text-xs text-nova-muted mt-0.5">
              Watch a short sponsored video and earn{" "}
              <span className="font-bold text-nova-gold">{AD_REWARD} NOVA</span> instantly.
            </p>
            <p className="text-[0.6rem] text-nova-muted mt-1">60 second cooldown between views</p>
          </div>
        </div>

        <button
          onClick={handleWatchAd}
          disabled={adLoading || adCooldown}
          aria-busy={adLoading}
          className={`mt-4 w-full rounded-2xl py-3.5 text-sm font-bold transition-all duration-150
            ${adCooldown
              ? "bg-white/5 text-nova-muted cursor-not-allowed"
              : "bg-nova-gradient text-white shadow-lg shadow-nova-purple/30 active:scale-95"
            }`}
        >
          {adLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              Loading ad…
            </span>
          ) : adCooldown ? (
            "⏳ Cooldown — come back in 60s"
          ) : (
            `▶ Watch Ad  (+${AD_REWARD} NOVA)`
          )}
        </button>
      </div>

      {/* ── Referral card ─────────────────────────────────────────────────── */}
      <div className="nova-card px-5 py-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nova-purple/10 border border-nova-violet/20">
            <span className="text-2xl" aria-hidden="true">🤝</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Invite Friends</p>
            <p className="text-xs text-nova-muted mt-0.5">
              Earn{" "}
              <span className="font-bold text-nova-violet">500 NOVA</span>{" "}
              for every friend who joins with your link.
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 py-3 px-4 rounded-xl bg-white/5 mb-4">
          <div className="text-center">
            <p className="text-xl font-black text-nova-violet">{referralCount}</p>
            <p className="text-[0.6rem] text-nova-muted uppercase tracking-wide">Friends</p>
          </div>
          <div className="h-8 w-px bg-nova-border" />
          <div className="text-center">
            <p className="text-xl font-black text-nova-gold">{(referralCount * 500).toLocaleString()}</p>
            <p className="text-[0.6rem] text-nova-muted uppercase tracking-wide">NOVA Earned</p>
          </div>
          <div className="h-8 w-px bg-nova-border" />
          <div className="flex-1 text-center">
            <p className="text-xs font-semibold text-nova-green break-all">
              …{referralCode}
            </p>
            <p className="text-[0.6rem] text-nova-muted uppercase tracking-wide">Your Code</p>
          </div>
        </div>

        {/* Invite link display */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-nova-border mb-3">
          <p className="flex-1 text-xs text-nova-muted truncate">{referralUrl}</p>
          <button
            onClick={handleCopyLink}
            aria-label="Copy invite link"
            className="shrink-0 rounded-lg bg-nova-gradient px-3 py-1.5 text-xs font-bold text-white active:scale-90 transition-transform"
          >
            {copiedLink ? "✓ Copied" : "Copy"}
          </button>
        </div>

        {/* Share button */}
        <button
          onClick={handleShareTelegram}
          className="nova-btn w-full text-center"
          aria-label="Share invite link on Telegram"
        >
          📣 Share on Telegram
        </button>
      </div>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <div className="nova-card px-5 py-4">
        <p className="text-xs font-bold text-white uppercase tracking-wide mb-3">How it works</p>
        <div className="space-y-3">
          {[
            { icon: "📺", text: "Watch ads — 100 NOVA per view (60s cooldown)" },
            { icon: "🤝", text: "Invite friends — 500 NOVA per active friend" },
            { icon: "✅", text: "Complete quests — earn NOVA + XP" },
            { icon: "🔥", text: "Daily streak — bonus multiplies each day" },
            { icon: "💎", text: "10,000 NOVA = 1 TON (withdraw any time)" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-base" aria-hidden="true">{icon}</span>
              <p className="text-xs text-nova-muted">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ad success modal */}
      <Modal
        open={showAdSuccess}
        onClose={() => setShowAdSuccess(false)}
        title="Reward Earned! 🎉"
      >
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-nova-gold/10 border border-nova-gold/20">
            <span className="text-3xl">🪙</span>
          </div>
          <p className="text-3xl font-black text-nova-gold">+{AD_REWARD} NOVA</p>
          <p className="text-sm text-nova-muted">Added to your balance. Watch another ad in 60 seconds.</p>
          <button
            onClick={() => setShowAdSuccess(false)}
            className="nova-btn w-full mt-2"
          >
            Awesome!
          </button>
        </div>
      </Modal>
    </div>
  );
}
