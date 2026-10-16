import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force dynamic so Next.js never tries to pre-render this at build time
export const dynamic = "force-dynamic";

const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN!;
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL!;
const TG_API      = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function callTelegram(method: string, body: object) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── Seed quests ──────────────────────────────────────────────────────────────

const INITIAL_QUESTS = [
  {
    title:       "Daily Check-in",
    description: "Open the app and claim your daily reward",
    iconEmoji:   "📅",
    type:        "DAILY_CHECKIN" as const,
    difficulty:  "EASY" as const,
    minutesEst:  1,
    novaReward:  50,
    xpReward:    100,
    repeatable:  true,
    resetHours:  24,
    targetCount: 1,
  },
  {
    title:       "Watch an Ad",
    description: "Watch a sponsored video to earn NOVA",
    iconEmoji:   "📺",
    type:        "WATCH_AD" as const,
    difficulty:  "EASY" as const,
    minutesEst:  1,
    novaReward:  100,
    xpReward:    50,
    repeatable:  true,
    resetHours:  1,
    targetCount: 1,
  },
  {
    title:       "Invite 1 Friend",
    description: "Share your link and get a friend to join",
    iconEmoji:   "🤝",
    type:        "INVITE_FRIENDS" as const,
    difficulty:  "EASY" as const,
    minutesEst:  2,
    novaReward:  500,
    xpReward:    200,
    repeatable:  false,
    targetCount: 1,
  },
  {
    title:       "Invite 5 Friends",
    description: "Build your crew — invite 5 friends to NovaDrop",
    iconEmoji:   "🫂",
    type:        "INVITE_FRIENDS" as const,
    difficulty:  "MEDIUM" as const,
    minutesEst:  10,
    novaReward:  3000,
    xpReward:    500,
    repeatable:  false,
    targetCount: 5,
  },
  {
    title:       "Join our Telegram Channel",
    description: "Follow the official NovaDrop channel for updates",
    iconEmoji:   "📢",
    type:        "JOIN_CHANNEL" as const,
    difficulty:  "EASY" as const,
    minutesEst:  1,
    novaReward:  200,
    xpReward:    100,
    repeatable:  false,
    targetCount: 1,
  },
  {
    title:       "Follow on X (Twitter)",
    description: "Follow @NovaDrop on X for exclusive drops",
    iconEmoji:   "𝕏",
    type:        "SOCIAL_FOLLOW" as const,
    difficulty:  "EASY" as const,
    minutesEst:  1,
    novaReward:  150,
    xpReward:    75,
    repeatable:  false,
    targetCount: 1,
  },
  {
    title:       "Reach Level 3",
    description: "Keep earning XP until you hit Level 3",
    iconEmoji:   "⚡",
    type:        "PLAY_GAME" as const,
    difficulty:  "MEDIUM" as const,
    minutesEst:  30,
    novaReward:  1000,
    xpReward:    300,
    repeatable:  false,
    targetCount: 1,
  },
  {
    title:       "7-Day Streak",
    description: "Log in 7 days in a row to claim the streak reward",
    iconEmoji:   "🔥",
    type:        "DAILY_CHECKIN" as const,
    difficulty:  "HARD" as const,
    minutesEst:  0,
    novaReward:  2500,
    xpReward:    700,
    repeatable:  false,
    targetCount: 7,
  },
  {
    title:       "Earn 10,000 NOVA",
    description: "Accumulate 10,000 NOVA total (all time)",
    iconEmoji:   "💰",
    type:        "PLAY_GAME" as const,
    difficulty:  "HARD" as const,
    minutesEst:  60,
    novaReward:  5000,
    xpReward:    1000,
    repeatable:  false,
    targetCount: 1,
  },
  {
    title:       "Sponsored: Shop Task",
    description: "Complete a sponsored challenge to earn bonus NOVA",
    iconEmoji:   "🛍️",
    type:        "SPONSORED" as const,
    difficulty:  "EASY" as const,
    minutesEst:  3,
    novaReward:  300,
    xpReward:    150,
    repeatable:  false,
    targetCount: 1,
    sponsorName: "NovaDrop Partner",
  },
] as const;

// ─── GET /api/setup ───────────────────────────────────────────────────────────
// Visit once after deploying to register webhook, menu button, bot commands,
// and seed the quests table.

export async function GET() {
  const webhookUrl = `${APP_URL}/api/telegram`;

  const [webhookResult, menuResult, commandsResult] = await Promise.all([
    // 1. Register webhook
    callTelegram("setWebhook", {
      url:             webhookUrl,
      allowed_updates: ["message", "callback_query"],
    }),
    // 2. Persistent menu button
    callTelegram("setChatMenuButton", {
      menu_button: {
        type:    "web_app",
        text:    "🪙 NovaDrop",
        web_app: { url: APP_URL },
      },
    }),
    // 3. Bot commands
    callTelegram("setMyCommands", {
      commands: [
        { command: "start",  description: "Open NovaDrop 🪙" },
        { command: "stats",  description: "Check your balance 📊" },
        { command: "invite", description: "Get your referral link 🤝" },
        { command: "help",   description: "How to earn & withdraw" },
      ],
    }),
  ]);

  // 4. Seed quests (skip if already exist)
  const existingCount = await prisma.quest.count();
  let questsSeeded = 0;

  if (existingCount === 0) {
    // Build upsert data without `as const` issues
    for (const q of INITIAL_QUESTS) {
      await prisma.quest.create({
        data: {
          title:       q.title,
          description: q.description,
          iconEmoji:   q.iconEmoji,
          type:        q.type,
          difficulty:  q.difficulty,
          minutesEst:  q.minutesEst,
          novaReward:  q.novaReward,
          xpReward:    q.xpReward,
          repeatable:  q.repeatable,
          targetCount: q.targetCount,
          sponsorName: "sponsorName" in q ? (q as { sponsorName?: string }).sponsorName : undefined,
        },
      });
      questsSeeded++;
    }
  }

  return NextResponse.json({
    webhook:      webhookResult,
    menuButton:   menuResult,
    commands:     commandsResult,
    questsSeeded,
    existingQuests: existingCount,
    webhookUrl,
    message:      existingCount > 0
      ? `Setup complete. ${existingCount} quests already exist, skipped seeding.`
      : `Setup complete. Seeded ${questsSeeded} quests.`,
  });
}
