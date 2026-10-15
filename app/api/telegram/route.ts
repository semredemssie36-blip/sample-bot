import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─── Send a Telegram API request ─────────────────────────────────────────────

async function callTelegram(method: string, body: object) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── Webhook POST handler ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    const message = update?.message;
    const chatId = message?.chat?.id;
    const text: string = message?.text ?? "";
    const firstName: string = message?.from?.first_name ?? "there";

    if (!chatId) {
      return NextResponse.json({ ok: true });
    }

    // /start command — send welcome message with LAUNCH button
    if (text === "/start" || text.startsWith("/start ")) {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `👋 Hey ${firstName}! Welcome to *Snake Arcade*.\n\n🐍 Eat food to grow, don't hit the walls or yourself.\n🏆 Beat the leaderboard and claim the top spot!`,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎮 Play Now",
                web_app: { url: APP_URL },
              },
            ],
          ],
        },
      });

      return NextResponse.json({ ok: true });
    }

    // /help command
    if (text === "/help") {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: `*Snake Arcade Help*\n\n/start — Open the game\n\n*How to play:*\n• Swipe or use the D-pad to move\n• Eat 🍎 to grow and score points\n• Don't hit the walls or your own tail\n• Each 5 foods eaten levels you up and speeds the snake`,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎮 Open Game",
                web_app: { url: APP_URL },
              },
            ],
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

// ─── GET — simple health check ────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({ status: "Snake Arcade webhook is alive 🐍" });
}
