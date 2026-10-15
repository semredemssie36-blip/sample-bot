import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function callTelegram(method: string, body: object) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── GET /api/setup ───────────────────────────────────────────────────────────
// Visit this URL once after deploying to register your webhook + menu button.

export async function GET() {
  const webhookUrl = `${APP_URL}/api/telegram`;

  // 1. Register webhook
  const webhookResult = await callTelegram("setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message"],
  });

  // 2. Set the persistent bottom "Open App" menu button
  const menuResult = await callTelegram("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "🎮 Play Snake",
      web_app: { url: APP_URL },
    },
  });

  // 3. Set bot commands list
  const commandsResult = await callTelegram("setMyCommands", {
    commands: [
      { command: "start", description: "Open Snake Arcade 🐍" },
      { command: "help",  description: "How to play" },
    ],
  });

  return NextResponse.json({
    webhook: webhookResult,
    menuButton: menuResult,
    commands: commandsResult,
    webhookUrl,
  });
}
