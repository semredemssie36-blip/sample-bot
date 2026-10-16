import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AchievementType } from "@prisma/client";

export const dynamic = "force-dynamic";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL!;
const TG_API    = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function tg(method: string, body: object) {
  const res = await fetch(`${TG_API}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

// ─── Quest seed data ──────────────────────────────────────────────────────────

const QUESTS = [
  // Daily
  { title: "Daily Check-in", description: "Open NovaDrop and claim your daily reward", iconEmoji: "📅", type: "DAILY_CHECKIN", difficulty: "EASY", minutesEst: 1, novaReward: 50,   xpReward: 100, repeatable: true,  resetHours: 24, targetCount: 1, sortOrder: 1 },
  // Channel & Group — real verification
  { title: "Join NovaDrop Channel", description: "Subscribe to @novadropchannal for updates and drops", iconEmoji: "📢", type: "JOIN_CHANNEL", difficulty: "EASY", minutesEst: 1, novaReward: 500,  xpReward: 200, repeatable: false, targetCount: 1, channelUsername: "novadropchannal",  channelUrl: "https://t.me/novadropchannal",  sortOrder: 2 },
  { title: "Join NovaDrop Group",   description: "Join our community group @novadropchannall",         iconEmoji: "👥", type: "JOIN_GROUP",   difficulty: "EASY", minutesEst: 1, novaReward: 300,  xpReward: 150, repeatable: false, targetCount: 1, channelUsername: "novadropchannall", channelUrl: "https://t.me/novadropchannall", sortOrder: 3 },
  // Wallet
  { title: "Connect TON Wallet",    description: "Link your TON wallet to enable withdrawals",         iconEmoji: "💎", type: "CONNECT_WALLET", difficulty: "EASY", minutesEst: 2, novaReward: 1000, xpReward: 300, repeatable: false, targetCount: 1, sortOrder: 4 },
  // Ads
  { title: "Watch an Ad",  description: "Watch a sponsored video — refreshes every hour", iconEmoji: "📺", type: "WATCH_AD", difficulty: "EASY", minutesEst: 1, novaReward: 100, xpReward: 50, repeatable: true, resetHours: 1, targetCount: 1, sortOrder: 5 },
  // Referrals
  { title: "Invite 1 Friend",   description: "Share your link and get a friend to join",             iconEmoji: "🤝", type: "INVITE_FRIENDS", difficulty: "EASY",   minutesEst: 2,  novaReward: 500,  xpReward: 200, repeatable: false, targetCount: 1,  sortOrder: 6 },
  { title: "Invite 5 Friends",  description: "Build your crew — invite 5 friends to NovaDrop",       iconEmoji: "🫂", type: "INVITE_FRIENDS", difficulty: "MEDIUM", minutesEst: 10, novaReward: 3000, xpReward: 500, repeatable: false, targetCount: 5,  sortOrder: 7 },
  { title: "Invite 10 Friends", description: "A true community builder — bring 10 friends on board", iconEmoji: "🌐", type: "INVITE_FRIENDS", difficulty: "HARD",   minutesEst: 30, novaReward: 8000, xpReward: 1000, repeatable: false, targetCount: 10, sortOrder: 8 },
  // Play
  { title: "Play 5 Games",  description: "Play the tap game 5 times to prove your dedication", iconEmoji: "🎮", type: "PLAY_GAME", difficulty: "EASY",   minutesEst: 10, novaReward: 500,  xpReward: 200, repeatable: false, targetCount: 5,  sortOrder: 9 },
  { title: "Play 20 Games", description: "A true gamer — complete 20 game sessions",          iconEmoji: "🕹️", type: "PLAY_GAME", difficulty: "MEDIUM", minutesEst: 40, novaReward: 2000, xpReward: 600, repeatable: false, targetCount: 20, sortOrder: 10 },
  // Levels
  { title: "Reach Level 5",  description: "Level up to 5 by earning XP from any activity", iconEmoji: "⚡", type: "REACH_LEVEL", difficulty: "MEDIUM", minutesEst: 60,  novaReward: 1000, xpReward: 0,    repeatable: false, targetCount: 1, sortOrder: 11 },
  { title: "Reach Level 10", description: "Hit Level 10 to unlock Elite status",            iconEmoji: "🔥", type: "REACH_LEVEL", difficulty: "HARD",   minutesEst: 200, novaReward: 5000, xpReward: 0,    repeatable: false, targetCount: 1, sortOrder: 12 },
  // Streaks
  { title: "7-Day Streak",  description: "Log in 7 days in a row without breaking your streak", iconEmoji: "🗓️", type: "DAILY_CHECKIN", difficulty: "MEDIUM", minutesEst: 0,  novaReward: 2500, xpReward: 700, repeatable: false, targetCount: 7,  sortOrder: 13 },
  { title: "30-Day Streak", description: "The ultimate dedication — 30 consecutive days",       iconEmoji: "🏆", type: "DAILY_CHECKIN", difficulty: "HARD",   minutesEst: 0, novaReward: 15000, xpReward: 3000, repeatable: false, targetCount: 30, sortOrder: 14 },
  // Milestones
  { title: "Earn 10,000 NOVA",   description: "Accumulate 10,000 NOVA total (all time)",    iconEmoji: "💰", type: "PLAY_GAME", difficulty: "MEDIUM", minutesEst: 120, novaReward: 2000,  xpReward: 500,  repeatable: false, targetCount: 1, sortOrder: 15 },
  { title: "Earn 100,000 NOVA",  description: "A true earner — reach 100k lifetime NOVA",   iconEmoji: "💎", type: "PLAY_GAME", difficulty: "HARD",   minutesEst: 999, novaReward: 10000, xpReward: 2000, repeatable: false, targetCount: 1, sortOrder: 16 },
  // Social
  { title: "Follow on X",    description: "Follow @NovaDrop on X for exclusive announcements", iconEmoji: "𝕏", type: "SOCIAL_FOLLOW", difficulty: "EASY", minutesEst: 1, novaReward: 200, xpReward: 100, repeatable: false, targetCount: 1, sortOrder: 17 },
] as const;

// ─── Achievement seed data ────────────────────────────────────────────────────

const ACHIEVEMENTS: Array<{ type: AchievementType; title: string; description: string; iconEmoji: string; novaReward: number; xpReward: number }> = [
  { type: AchievementType.FIRST_TAP,        title: "First Tap",         description: "Tap the coin for the first time",          iconEmoji: "👆",  novaReward: 100,   xpReward: 50   },
  { type: AchievementType.FIRST_REFERRAL,   title: "Connector",         description: "Invite your first friend",                 iconEmoji: "🤝",  novaReward: 500,   xpReward: 200  },
  { type: AchievementType.STREAK_7,         title: "Week Warrior",      description: "Maintain a 7-day streak",                  iconEmoji: "🔥",  novaReward: 500,   xpReward: 200  },
  { type: AchievementType.STREAK_30,        title: "Monthly Master",    description: "Maintain a 30-day streak",                 iconEmoji: "🗓️", novaReward: 5000,  xpReward: 1000 },
  { type: AchievementType.LEVEL_5,          title: "Rising Star",       description: "Reach Level 5",                            iconEmoji: "⭐",  novaReward: 1000,  xpReward: 0    },
  { type: AchievementType.LEVEL_10,         title: "Nova Elite",        description: "Reach Level 10",                           iconEmoji: "💫",  novaReward: 5000,  xpReward: 0    },
  { type: AchievementType.LEVEL_20,         title: "Nova Legend",       description: "Reach Level 20",                           iconEmoji: "🌟",  novaReward: 20000, xpReward: 0    },
  { type: AchievementType.INVITE_5,         title: "Recruiter",         description: "Invite 5 friends to NovaDrop",             iconEmoji: "🫂",  novaReward: 2000,  xpReward: 500  },
  { type: AchievementType.INVITE_10,        title: "Community Builder", description: "Invite 10 friends",                        iconEmoji: "🌐",  novaReward: 5000,  xpReward: 1000 },
  { type: AchievementType.INVITE_25,        title: "Network King",      description: "Invite 25 friends",                        iconEmoji: "👑",  novaReward: 15000, xpReward: 3000 },
  { type: AchievementType.EARN_10K,         title: "Earner",            description: "Earn 10,000 NOVA total",                   iconEmoji: "💰",  novaReward: 1000,  xpReward: 500  },
  { type: AchievementType.EARN_100K,        title: "Whale",             description: "Earn 100,000 NOVA total",                  iconEmoji: "🐋",  novaReward: 10000, xpReward: 2000 },
  { type: AchievementType.FIRST_WITHDRAWAL, title: "Cashed Out",        description: "Submit your first withdrawal",             iconEmoji: "💸",  novaReward: 500,   xpReward: 200  },
  { type: AchievementType.WALLET_CONNECTED, title: "Linked Up",         description: "Connect your TON wallet",                  iconEmoji: "💎",  novaReward: 1000,  xpReward: 300  },
  { type: AchievementType.ALL_QUESTS,       title: "Quest Master",      description: "Complete all available quests",            iconEmoji: "🏅",  novaReward: 25000, xpReward: 5000 },
];

export async function GET() {
  const webhookUrl = `${APP_URL}/api/telegram`;

  const [webhookRes, menuRes, cmdRes] = await Promise.all([
    tg("setWebhook",        { url: webhookUrl, allowed_updates: ["message","callback_query"] }),
    tg("setChatMenuButton", { menu_button: { type: "web_app", text: "🪙 NovaDrop", web_app: { url: APP_URL } } }),
    tg("setMyCommands",     { commands: [
      { command: "start",  description: "Open NovaDrop 🪙" },
      { command: "stats",  description: "Check your balance 📊" },
      { command: "invite", description: "Get your referral link 🤝" },
      { command: "help",   description: "How to earn & withdraw" },
    ]}),
  ]);

  // Seed achievements
  let achSeeded = 0;
  for (const a of ACHIEVEMENTS) {
    const existing = await prisma.achievement.findUnique({ where: { type: a.type } });
    if (!existing) {
      await prisma.achievement.create({ data: a });
      achSeeded++;
    }
  }

  // Seed quests
  const existingCount = await prisma.quest.count();
  let questsSeeded = 0;

  if (existingCount === 0) {
    for (const q of QUESTS) {
      await prisma.quest.create({
        data: {
          title:           q.title,
          description:     q.description,
          iconEmoji:       q.iconEmoji,
          type:            q.type as never,
          difficulty:      q.difficulty as never,
          minutesEst:      q.minutesEst,
          novaReward:      q.novaReward,
          xpReward:        q.xpReward,
          repeatable:      q.repeatable,
          resetHours:      "resetHours"  in q ? q.resetHours  : 24,
          targetCount:     q.targetCount,
          sortOrder:       q.sortOrder,
          channelUsername: "channelUsername" in q ? q.channelUsername : undefined,
          channelUrl:      "channelUrl"      in q ? q.channelUrl      : undefined,
        },
      });
      questsSeeded++;
    }
  }

  return NextResponse.json({ webhook: webhookRes, menu: menuRes, commands: cmdRes, questsSeeded, achSeeded, existingQuests: existingCount, webhookUrl });
}
