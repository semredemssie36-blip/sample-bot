"use server";

import { prisma } from "@/lib/prisma";
import { QuestType, TransactionType, WithdrawalStatus } from "@prisma/client";

// ─── Helper: Generate short referral code ────────────────────────────────────

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─── Helper: XP to level formula ─────────────────────────────────────────────

function xpForLevel(level: number): number {
  return level * 1000; // level 2 = 1000xp, level 3 = 2000xp, etc.
}

function calculateLevel(xp: number): number {
  let level = 1;
  let totalNeeded = 0;
  while (xp >= totalNeeded + xpForLevel(level + 1)) {
    totalNeeded += xpForLevel(level + 1);
    level++;
  }
  return level;
}

// ─── getUser ──────────────────────────────────────────────────────────────────

export async function getUser(tgUserId: number, username?: string, firstName?: string) {
  const id = String(tgUserId);

  let user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    // First time boot — create user + daily streak
    const refCode = generateReferralCode();
    user = await prisma.user.create({
      data: {
        id,
        username: username || null,
        firstName: firstName || null,
        referralCode: refCode,
        streak: { create: {} },
      },
      include: { streak: true },
    });
  } else {
    // Update cached username on every boot
    await prisma.user.update({
      where: { id },
      data: {
        username: username || null,
        firstName: firstName || null,
      },
    });
  }

  // Recalc level from XP
  const level = calculateLevel(user.xp);
  if (level !== user.level) {
    user = await prisma.user.update({
      where: { id },
      data: { level },
    });
  }

  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    novaBalance: user.novaBalance,
    totalEarned: user.totalEarned,
    level: user.level,
    xp: user.xp,
    xpForNext: xpForLevel(user.level + 1),
    referralCode: user.referralCode,
    tonWallet: user.tonWallet,
  };
}

// ─── getQuests ────────────────────────────────────────────────────────────────

export async function getQuests(tgUserId: number) {
  const id = String(tgUserId);

  const activeQuests = await prisma.quest.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

  const userQuests = await prisma.userQuest.findMany({
    where: { userId: id },
  });

  const userQuestMap = Object.fromEntries(
    userQuests.map((uq) => [uq.questId, uq]),
  );

  return activeQuests.map((q) => {
    const uq = userQuestMap[q.id];
    return {
      id: q.id,
      title: q.title,
      description: q.description,
      iconEmoji: q.iconEmoji,
      type: q.type,
      difficulty: q.difficulty,
      minutesEst: q.minutesEst,
      novaReward: q.novaReward,
      xpReward: q.xpReward,
      targetCount: q.targetCount,
      progress: uq?.progress || 0,
      completed: uq?.completed || false,
      channelUsername: q.channelUsername ?? null,
      channelUrl: q.channelUrl ?? null,
    };
  });
}

// ─── completeQuest ────────────────────────────────────────────────────────────

export async function completeQuest(tgUserId: number, questId: string) {
  const id = String(tgUserId);

  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest || !quest.active) {
    return { success: false, error: "Quest not found or inactive" };
  }

  let userQuest = await prisma.userQuest.findUnique({
    where: { userId_questId: { userId: id, questId } },
  });

  if (!userQuest) {
    userQuest = await prisma.userQuest.create({
      data: { userId: id, questId, progress: 0 },
    });
  }

  // For repeatable quests, check if reset window has passed
  if (userQuest.completed && quest.repeatable) {
    const hoursSinceReset =
      (Date.now() - new Date(userQuest.lastReset).getTime()) / (1000 * 60 * 60);
    if (hoursSinceReset >= quest.resetHours) {
      // Reset this user's quest progress
      await prisma.userQuest.update({
        where: { id: userQuest.id },
        data: {
          progress:    0,
          completed:   false,
          completedAt: null,
          claimedAt:   null,
          lastReset:   new Date(),
        },
      });
      userQuest = { ...userQuest, progress: 0, completed: false };
    } else {
      const hoursLeft = Math.ceil(quest.resetHours - hoursSinceReset);
      return { success: false, error: `Quest resets in ${hoursLeft}h` };
    }
  }

  if (userQuest.completed && !quest.repeatable) {
    return { success: false, error: "Already completed" };
  }

  // Increment progress
  const newProgress = userQuest.progress + 1;
  const nowCompleted = newProgress >= quest.targetCount;

  await prisma.userQuest.update({
    where: { id: userQuest.id },
    data: {
      progress: newProgress,
      completed: nowCompleted,
      completedAt: nowCompleted ? new Date() : undefined,
    },
  });

  if (nowCompleted) {
    // Pay reward
    await prisma.user.update({
      where: { id },
      data: {
        novaBalance: { increment: quest.novaReward },
        totalEarned: { increment: quest.novaReward },
        xp: { increment: quest.xpReward },
      },
    });

    await prisma.transaction.create({
      data: {
        userId: id,
        type: TransactionType.QUEST_REWARD,
        amount: quest.novaReward,
        description: `Completed: ${quest.title}`,
        meta: { questId },
      },
    });
  }

  return { success: true, completed: nowCompleted };
}

// ─── claimDailyStreak ─────────────────────────────────────────────────────────

export async function claimDailyStreak(tgUserId: number) {
  const id = String(tgUserId);

  let streak = await prisma.dailyStreak.findUnique({ where: { userId: id } });
  if (!streak) {
    streak = await prisma.dailyStreak.create({ data: { userId: id } });
  }

  const now = new Date();
  const lastClaim = streak.lastClaimedAt;

  // Check if already claimed today
  if (lastClaim && now.getTime() - lastClaim.getTime() < 20 * 60 * 60 * 1000) {
    return { success: false, error: "Already claimed today" };
  }

  // Check if streak is broken (>48h gap)
  const isBroken = lastClaim && now.getTime() - lastClaim.getTime() > 48 * 60 * 60 * 1000;
  const newStreak = isBroken ? 1 : streak.currentStreak + 1;
  const bonus = newStreak * 50; // 50 NOVA per streak day

  await prisma.dailyStreak.update({
    where: { id: streak.id },
    data: {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streak.longestStreak),
      lastClaimedAt: now,
      nextClaimAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.update({
    where: { id },
    data: {
      novaBalance: { increment: bonus },
      totalEarned: { increment: bonus },
      xp: { increment: 100 },
    },
  });

  await prisma.transaction.create({
    data: {
      userId: id,
      type: TransactionType.STREAK_BONUS,
      amount: bonus,
      description: `Day ${newStreak} streak bonus`,
    },
  });

  return { success: true, streak: newStreak, bonus };
}

// ─── trackReferral ────────────────────────────────────────────────────────────

export async function trackReferral(newUserId: number, referralCode: string) {
  const refereeId = String(newUserId);

  // Check if already referred
  const existing = await prisma.referral.findUnique({ where: { refereeId } });
  if (existing) return { success: false, error: "Already referred" };

  // Find referrer
  const referrer = await prisma.user.findUnique({ where: { referralCode } });
  if (!referrer) return { success: false, error: "Invalid referral code" };

  // Can't refer yourself
  if (referrer.id === refereeId) return { success: false, error: "Can't refer yourself" };

  // Create referral + pay bonus
  const bonusAmount = 500;
  await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      refereeId,
      bonusPaid: true,
      bonusAmount,
    },
  });

  await prisma.user.update({
    where: { id: referrer.id },
    data: {
      novaBalance: { increment: bonusAmount },
      totalEarned: { increment: bonusAmount },
    },
  });

  await prisma.transaction.create({
    data: {
      userId: referrer.id,
      type: TransactionType.REFERRAL_BONUS,
      amount: bonusAmount,
      description: `Invited @${refereeId}`,
      meta: { refereeId },
    },
  });

  return { success: true };
}

// ─── getLeaderboard ───────────────────────────────────────────────────────────

export async function getLeaderboard() {
  const top = await prisma.user.findMany({
    orderBy: { totalEarned: "desc" },
    take: 100,
    select: {
      id: true,
      username: true,
      firstName: true,
      totalEarned: true,
      level: true,
    },
  });

  return top.map((u, i) => ({
    rank: i + 1,
    id: u.id,
    name: u.username || u.firstName || "Anonymous",
    totalEarned: u.totalEarned,
    level: u.level,
  }));
}

// ─── requestWithdrawal ────────────────────────────────────────────────────────

export async function requestWithdrawal(
  tgUserId: number,
  novaAmount: number,
  tonWallet: string,
) {
  const id = String(tgUserId);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.novaBalance < novaAmount) {
    return { success: false, error: "Insufficient balance" };
  }

  // Exchange rate: 10,000 NOVA = 1 TON (adjust as needed)
  const tonAmount = novaAmount / 10000;
  const minWithdrawal = 5000; // 0.5 TON minimum

  if (novaAmount < minWithdrawal) {
    return { success: false, error: `Minimum withdrawal: ${minWithdrawal} NOVA` };
  }

  // Deduct balance immediately
  await prisma.user.update({
    where: { id },
    data: { novaBalance: { decrement: novaAmount }, tonWallet },
  });

  await prisma.withdrawal.create({
    data: {
      userId: id,
      novaAmount,
      tonAmount,
      tonWallet,
      status: WithdrawalStatus.PENDING,
    },
  });

  await prisma.transaction.create({
    data: {
      userId: id,
      type: TransactionType.WITHDRAWAL,
      amount: -novaAmount,
      description: `Withdrawal to ${tonWallet.slice(0, 8)}...`,
    },
  });

  return { success: true, tonAmount };
}

// ─── getTransactions ──────────────────────────────────────────────────────────

export async function getTransactions(tgUserId: number) {
  const id = String(tgUserId);
  const txs = await prisma.transaction.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return txs.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    createdAt: tx.createdAt,
  }));
}

// ─── getReferralStats ─────────────────────────────────────────────────────────

export async function getReferralStats(tgUserId: number) {
  const id = String(tgUserId);
  const count = await prisma.referral.count({ where: { referrerId: id } });
  const totalEarned = count * 500; // 500 NOVA per referral
  return { count, totalEarned };
}

// ─── getStreakData ────────────────────────────────────────────────────────────

export async function getStreakData(tgUserId: number) {
  const id = String(tgUserId);
  
  let streak = await prisma.dailyStreak.findUnique({ where: { userId: id } });
  if (!streak) {
    streak = await prisma.dailyStreak.create({ data: { userId: id } });
  }

  const now = new Date();
  const lastClaim = streak.lastClaimedAt;
  
  // Can claim if: never claimed OR last claim was >20h ago
  const canClaim = !lastClaim || (now.getTime() - lastClaim.getTime()) >= 20 * 60 * 60 * 1000;
  
  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    canClaim,
  };
}

// ─── verifyChannelMembership ──────────────────────────────────────────────────

export async function verifyChannelMembership(tgUserId: number, channelUsername: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) return { success: false, error: "Bot token not configured" };

  try {
    const chatId = channelUsername.startsWith("@") ? channelUsername : `@${channelUsername}`;
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${tgUserId}`;
    
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.ok) {
      return { success: false, error: "Unable to verify membership" };
    }
    
    const status = data.result?.status;
    const isMember = ["member", "administrator", "creator"].includes(status);
    
    return { success: true, isMember };
  } catch (err) {
    console.error("[verifyChannelMembership] error:", err);
    return { success: false, error: "Verification failed" };
  }
}
