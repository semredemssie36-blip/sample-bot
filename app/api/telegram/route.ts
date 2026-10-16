import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/app/actions";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL!;
const TG_API    = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─── Helper ───────────────────────────────────────────────────────────────────

async function callTelegram(method: string, body: object) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── POST — webhook handler ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const message = update?.message;
    if (!message) return NextResponse.json({ ok: true });

    const chatId: number   = message.chat?.id;
    const from             = message.from;
    const text: string     = message.text ?? "";
    const firstName        = from?.first_name ?? "there";
    const username         = from?.username ?? "";

    if (!chatId) return NextResponse.json({ ok: true });

    // ── /start [referralCode] ───────────────────────────────────────────────
    if (text.startsWith("/start")) {
      const parts     = text.split(" ");
      const startParam = parts[1] ?? "";           // referral code if any
      const appUrl    = startParam
        ? `${APP_URL}?startapp=${startParam}`
        : APP_URL;

      // Create user record in DB on first contact
      if (from?.id) {
        await getUser(from.id, username, firstName).catch(() => {/* silent */});
      }

      await callTelegram("sendMessage", {
        chat_id: chatId,
        parse_mode: "Markdown",
        text: [
          `🪙 *Hey ${firstName}, welcome to NovaDrop!*`,
          "",
          "Earn *NOVA coins* by completing quests, watching ads, and inviting friends.",
          "Withdraw your balance as real *TON* directly to your wallet.",
          "",
          "🔥 Daily streaks multiply your rewards",
          "🤝 Each friend you invite earns you *500 NOVA*",
          "📺 Watch ads for instant NOVA",
          "💎 10,000 NOVA = 1 TON",
        ].join("\n"),
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Open NovaDrop", web_app: { url: appUrl } }],
            [{ text: "📣 Share & Earn", url: `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent("Join NovaDrop and earn real TON 🚀")}` }],
          ],
        },
      });

      return NextResponse.json({ ok: true });
    }

    // ── /help ───────────────────────────────────────────────────────────────
    if (text === "/help") {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        parse_mode: "Markdown",
        text: [
          "*NovaDrop Help* 🪙",
          "",
          "*/start* — Open the app",
          "*/stats* — See your balance",
          "*/invite* — Get your referral link",
          "",
          "*How to earn:*",
          "• Complete daily quests (+XP & NOVA)",
          "• Invite friends (500 NOVA each)",
          "• Watch ads (100 NOVA per view)",
          "• Log in daily to keep your streak",
          "",
          "*Withdrawals:*",
          "Minimum 5,000 NOVA (0.5 TON). Processed within 24-48h.",
        ].join("\n"),
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Open NovaDrop", web_app: { url: APP_URL } }],
          ],
        },
      });
      return NextResponse.json({ ok: true });
    }

    // ── /stats ──────────────────────────────────────────────────────────────
    if (text === "/stats") {
      if (!from?.id) return NextResponse.json({ ok: true });
      const user = await getUser(from.id, username, firstName).catch(() => null);
      if (!user) return NextResponse.json({ ok: true });

      await callTelegram("sendMessage", {
        chat_id: chatId,
        parse_mode: "Markdown",
        text: [
          `📊 *${firstName}'s Stats*`,
          "",
          `💰 Balance: *${user.novaBalance.toLocaleString()} NOVA*`,
          `🏆 Total Earned: *${user.totalEarned.toLocaleString()} NOVA*`,
          `⚡ Level: *${user.level}*`,
          `📈 XP: *${user.xp.toLocaleString()} / ${user.xpForNext.toLocaleString()}*`,
        ].join("\n"),
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Open NovaDrop", web_app: { url: APP_URL } }],
          ],
        },
      });
      return NextResponse.json({ ok: true });
    }

    // ── /invite ─────────────────────────────────────────────────────────────
    if (text === "/invite") {
      if (!from?.id) return NextResponse.json({ ok: true });
      const user = await getUser(from.id, username, firstName).catch(() => null);
      if (!user) return NextResponse.json({ ok: true });

      const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME ?? "gameaaappbot";
      const inviteUrl   = `https://t.me/${botUsername}?start=${user.referralCode}`;

      await callTelegram("sendMessage", {
        chat_id: chatId,
        parse_mode: "Markdown",
        text: [
          `🤝 *Your referral link*`,
          "",
          `Each friend who joins earns you *500 NOVA*!`,
          "",
          `\`${inviteUrl}\``,
        ].join("\n"),
        reply_markup: {
          inline_keyboard: [
            [{ text: "📣 Share Link", url: `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent("Join me on NovaDrop and earn real TON! 🚀")}` }],
          ],
        },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram webhook] error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// ─── GET — health check ───────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({ status: "NovaDrop webhook alive 🪙" });
}
