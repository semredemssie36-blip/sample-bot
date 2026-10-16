import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/fix-quests
 * Run once to patch existing quest rows with correct channelUsername + channelUrl
 * and delete the old broken "Join our Telegram Channel" quest that had no channelUsername.
 */
export async function GET() {
  const updates: string[] = [];

  // ── 1. Update/create NovaDrop Channel quest ──────────────────────────────
  const channelQuest = await prisma.quest.findFirst({
    where: { type: "JOIN_CHANNEL", OR: [{ channelUsername: null }, { channelUsername: "" }] },
  });

  if (channelQuest) {
    await prisma.quest.update({
      where: { id: channelQuest.id },
      data: {
        title:           "Join NovaDrop Channel",
        description:     "Subscribe to @novadropchannal — required to earn",
        iconEmoji:       "📢",
        channelUsername: "novadropchannal",
        channelUrl:      "https://t.me/novadropchannal",
        novaReward:      500,
        xpReward:        200,
        sortOrder:       2,
      },
    });
    updates.push(`Updated channel quest: ${channelQuest.id}`);
  } else {
    // Create if not exists
    const exists = await prisma.quest.findFirst({ where: { channelUsername: "novadropchannal" } });
    if (!exists) {
      const q = await prisma.quest.create({
        data: {
          title:           "Join NovaDrop Channel",
          description:     "Subscribe to @novadropchannal — required to earn",
          iconEmoji:       "📢",
          type:            "JOIN_CHANNEL",
          difficulty:      "EASY",
          minutesEst:      1,
          novaReward:      500,
          xpReward:        200,
          repeatable:      false,
          targetCount:     1,
          channelUsername: "novadropchannal",
          channelUrl:      "https://t.me/novadropchannal",
          sortOrder:       2,
        },
      });
      updates.push(`Created channel quest: ${q.id}`);
    }
  }

  // ── 2. Update/create NovaDrop Group quest ────────────────────────────────
  const groupQuest = await prisma.quest.findFirst({
    where: { type: "JOIN_GROUP", OR: [{ channelUsername: null }, { channelUsername: "" }] },
  });

  if (groupQuest) {
    await prisma.quest.update({
      where: { id: groupQuest.id },
      data: {
        title:           "Join NovaDrop Group",
        description:     "Join our community group @novadropchannall — required to earn",
        iconEmoji:       "👥",
        channelUsername: "novadropchannall",
        channelUrl:      "https://t.me/novadropchannall",
        novaReward:      300,
        xpReward:        150,
        sortOrder:       3,
      },
    });
    updates.push(`Updated group quest: ${groupQuest.id}`);
  } else {
    const exists = await prisma.quest.findFirst({ where: { channelUsername: "novadropchannall" } });
    if (!exists) {
      const q = await prisma.quest.create({
        data: {
          title:           "Join NovaDrop Group",
          description:     "Join our community group @novadropchannall — required to earn",
          iconEmoji:       "👥",
          type:            "JOIN_GROUP",
          difficulty:      "EASY",
          minutesEst:      1,
          novaReward:      300,
          xpReward:        150,
          repeatable:      false,
          targetCount:     1,
          channelUsername: "novadropchannall",
          channelUrl:      "https://t.me/novadropchannall",
          sortOrder:       3,
        },
      });
      updates.push(`Created group quest: ${q.id}`);
    }
  }

  // ── 3. Fix Social Follow quest (remove fake channelUsername if set wrong) ─
  const socialQuest = await prisma.quest.findFirst({ where: { type: "SOCIAL_FOLLOW" } });
  if (socialQuest) {
    await prisma.quest.update({
      where: { id: socialQuest.id },
      data: {
        // Social follow can't be verified via Telegram API — remove channelUsername
        // so it becomes a manual "open link" quest instead of a broken verify quest
        channelUsername: null,
        channelUrl:      "https://x.com/novadrop",
      },
    });
    updates.push(`Fixed social follow quest: ${socialQuest.id}`);
  }

  // ── 4. Fix any remaining JOIN_CHANNEL quests without channelUsername ──────
  const brokenJoinQuests = await prisma.quest.findMany({
    where: { type: { in: ["JOIN_CHANNEL", "JOIN_GROUP"] }, channelUsername: null },
  });

  for (const q of brokenJoinQuests) {
    await prisma.quest.update({
      where: { id: q.id },
      data: { active: false }, // Deactivate broken quests
    });
    updates.push(`Deactivated broken quest: ${q.id} — ${q.title}`);
  }

  // ── 5. Show all active quests with their channelUsername ─────────────────
  const allQuests = await prisma.quest.findMany({
    where: { active: true },
    select: { id: true, title: true, type: true, channelUsername: true, channelUrl: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    message: "Quest fix complete",
    updates,
    activeQuests: allQuests,
  });
}
