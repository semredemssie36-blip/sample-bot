import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ─── The complete, correct quest list ────────────────────────────────────────
// This is the single source of truth. Running this endpoint will:
// 1. Deactivate/delete old junk quests that don't belong
// 2. Upsert every quest with correct data
// 3. Return the final state

const CORRECT_QUESTS = [
  {
    key:             "daily-checkin",
    title:           "Daily Check-in",
    description:     "Open NovaDrop every day to claim your reward",
    iconEmoji:       "📅",
    type:            "DAILY_CHECKIN",
    difficulty:      "EASY",
    minutesEst:      1,
    novaReward:      50,
    xpReward:        100,
    repeatable:      true,
    resetHours:      24,
    targetCount:     1,
    sortOrder:       1,
    channelUsername: null,
    channelUrl:      null,
  },
  {
    key:             "join-channel",
    title:           "Join NovaDrop Channel",
    description:     "Subscribe to @novadropchannal — stay updated on drops",
    iconEmoji:       "📢",
    type:            "JOIN_CHANNEL",
    difficulty:      "EASY",
    minutesEst:      1,
    novaReward:      500,
    xpReward:        200,
    repeatable:      false,
    resetHours:      24,
    targetCount:     1,
    sortOrder:       2,
    channelUsername: "novadropchannal",
    channelUrl:      "https://t.me/novadropchannal",
  },
  {
    key:             "join-group",
    title:           "Join NovaDrop Group",
    description:     "Join our community group @novadropchannall",
    iconEmoji:       "👥",
    type:            "JOIN_GROUP",
    difficulty:      "EASY",
    minutesEst:      1,
    novaReward:      300,
    xpReward:        150,
    repeatable:      false,
    resetHours:      24,
    targetCount:     1,
    sortOrder:       3,
    channelUsername: "novadropchannall",
    channelUrl:      "https://t.me/novadropchannall",
  },
  {
    key:             "connect-wallet",
    title:           "Connect TON Wallet",
    description:     "Link your TON wallet to enable real withdrawals",
    iconEmoji:       "💎",
    type:            "CONNECT_WALLET",
    difficulty:      "EASY",
    minutesEst:      2,
    novaReward:      1000,
    xpReward:        300,
    repeatable:      false,
    resetHours:      24,
    targetCount:     1,
    sortOrder:       4,
    channelUsername: null,
    channelUrl:      null,
  },
  {
    key:             "watch-ad",
    title:           "Watch an Ad",
    description:     "Watch a short sponsored video — refreshes every hour",
    iconEmoji:       "📺",
    type:            "WATCH_AD",
    difficulty:      "EASY",
    minutesEst:      1,
    novaReward:      100,
    xpReward:        50,
    repeatable:      true,
    resetHours:      1,
    targetCount:     1,
    sortOrder:       5,
    channelUsername: null,
    channelUrl:      null,
  },
  {
    key:             "invite-1",
    title:           "Invite 1 Friend",
    description:     "Share your invite link and get 1 friend to join NovaDrop",
    iconEmoji:       "🤝",
    type:            "INVITE_FRIENDS",
    difficulty:      "EASY",
    minutesEst:      2,
    novaReward:      500,
    xpReward:        200,
    repeatable:      false,
    resetHours:      24,
    targetCount:     1,
    sortOrder:       6,
    channelUsername: null,
    channelUrl:      null,
  },
  {
    key:             "invite-5",
    title:           "Invite 5 Friends",
    description:     "Build your crew — invite 5 real friends to NovaDrop",
    iconEmoji:       "🫂",
    type:            "INVITE_FRIENDS",
    difficulty:      "MEDIUM",
    minutesEst:      10,
    novaReward:      3000,
    xpReward:        500,
    repeatable:      false,
    resetHours:      24,
    targetCount:     5,
    sortOrder:       7,
    channelUsername: null,
    channelUrl:      null,
  },
  {
    key:             "invite-10",
    title:           "Invite 10 Friends",
    description:     "A true community builder — bring 10 real friends onboard",
    iconEmoji:       "🌐",
    type:            "INVITE_FRIENDS",
    difficulty:      "HARD",
    minutesEst:      30,
    novaReward:      8000,
    xpReward:        1000,
    repeatable:      false,
    resetHours:      24,
    targetCount:     10,
    sortOrder:       8,
    channelUsername: null,
    channelUrl:      null,
  },
  {
    key:             "streak-7",
    title:           "7-Day Streak",
    description:     "Log in 7 days in a row without breaking your streak",
    iconEmoji:       "🔥",
    type:            "DAILY_CHECKIN",
    difficulty:      "MEDIUM",
    minutesEst:      0,
    novaReward:      2500,
    xpReward:        700,
    repeatable:      false,
    resetHours:      24,
    targetCount:     7,
    sortOrder:       9,
    channelUsername: null,
    channelUrl:      null,
  },
  {
    key:             "earn-10k",
    title:           "Earn 10,000 NOVA",
    description:     "Accumulate 10,000 NOVA total (tap, quests, referrals)",
    iconEmoji:       "💰",
    type:            "PLAY_GAME",
    difficulty:      "MEDIUM",
    minutesEst:      0,
    novaReward:      2000,
    xpReward:        500,
    repeatable:      false,
    resetHours:      24,
    targetCount:     1,
    sortOrder:       10,
    channelUsername: null,
    channelUrl:      null,
  },
  {
    key:             "social-x",
    title:           "Follow on X",
    description:     "Follow @NovaDrop on X for exclusive announcements",
    iconEmoji:       "𝕏",
    type:            "SOCIAL_FOLLOW",
    difficulty:      "EASY",
    minutesEst:      1,
    novaReward:      200,
    xpReward:        100,
    repeatable:      false,
    resetHours:      24,
    targetCount:     1,
    sortOrder:       11,
    channelUsername: null,
    channelUrl:      "https://x.com/novadrop",
  },
] as const;

// IDs of old junk quests to deactivate (from the original snake game era)
const JUNK_TITLES = [
  "Sponsored: Shop Task",
  "Reach Level 3",
  "Join our Telegram Channel",  // old one without channelUsername
];

export async function GET() {
  const log: string[] = [];

  // ── 1. Deactivate old junk quests ────────────────────────────────────────
  for (const title of JUNK_TITLES) {
    const q = await prisma.quest.findFirst({ where: { title, active: true } });
    if (q) {
      await prisma.quest.update({ where: { id: q.id }, data: { active: false } });
      log.push(`Deactivated junk quest: "${title}" (${q.id})`);
    }
  }

  // ── 2. Upsert every correct quest ────────────────────────────────────────
  for (const q of CORRECT_QUESTS) {
    // Find existing by title+type (stable identifier)
    const existing = await prisma.quest.findFirst({
      where: { title: q.title, type: q.type as never },
    });

    if (existing) {
      await prisma.quest.update({
        where: { id: existing.id },
        data: {
          description:     q.description,
          iconEmoji:       q.iconEmoji,
          difficulty:      q.difficulty as never,
          minutesEst:      q.minutesEst,
          novaReward:      q.novaReward,
          xpReward:        q.xpReward,
          repeatable:      q.repeatable,
          resetHours:      q.resetHours,
          targetCount:     q.targetCount,
          sortOrder:       q.sortOrder,
          channelUsername: q.channelUsername ?? null,
          channelUrl:      q.channelUrl ?? null,
          active:          true,
        },
      });
      log.push(`Updated: "${q.title}"`);
    } else {
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
          resetHours:      q.resetHours,
          targetCount:     q.targetCount,
          sortOrder:       q.sortOrder,
          channelUsername: q.channelUsername ?? null,
          channelUrl:      q.channelUrl ?? null,
          active:          true,
        },
      });
      log.push(`Created: "${q.title}"`);
    }
  }

  // ── 3. Return final active quest list ─────────────────────────────────────
  const final = await prisma.quest.findMany({
    where:   { active: true },
    select:  { id: true, title: true, type: true, channelUsername: true, novaReward: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ message: "Quest sync complete", log, total: final.length, quests: final });
}
