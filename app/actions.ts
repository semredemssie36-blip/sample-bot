"use server";

import { prisma } from "@/lib/prisma";
import { TransactionType, WithdrawalStatus, AchievementType } from "@prisma/client";

// ─── Constants ────────────────────────────────────────────────────────────────
const ENERGY_MAX        = 500;
const ENERGY_REFILL_SEC = 10;   // 1 energy per 10 seconds
const NOVA_PER_TAP      = 1;
const XP_PER_TAP        = 1;
const REFERRAL_BONUS    = 500;
const PASSIVE_L1        = 0.10; // 10% of friend's earnings
const PASSIVE_L2        = 0.03; // 3% of friend-of-friend's earnings
const NOVA_PER_TON      = 100_000;
const MIN_WITHDRAWAL    = 100_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function xpForLevel(level: number): number {
  return level * 1000;
}

function calculateLevel(xp: number): number {
  let level = 1;
  let needed = 0;
  while (xp >= needed + xpForLevel(level + 1)) {
    needed += xpForLevel(level + 1);
    level++;
  }
  return level;
}

// Distribute passive income up the referral tree (2 levels)
async function distributePassiveIncome(
  generatorId: string,
  earnedAmount: number,
  sourceType: string
) {
  if (earnedAmount <= 0) return;

  // Find the generator's direct referrer (level 1)
  const generator = await prisma.user.findUnique({
    where: { id: generatorId },
    select: { referredBy: true },
  });
  if (!generator?.referredBy) return;

  const l1Referrer = await prisma.user.findUnique({
    where: { referralCode: generator.referredBy },
    select: { id: true, referredBy: true },
  });
  if (!l1Referrer) return;

  const l1Amount = Math.floor(earnedAmount * PASSIVE_L1);
  if (l1Amount > 0) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: l1Referrer.id },
        data: { novaBalance: { increment: l1Amount }, totalEarned: { increment: l1Amount } },
      }),
      prisma.passiveIncome.create({
        data: { recipientId: l1Referrer.id, generatorId, level: 1, amount: l1Amount, sourceType },
      }),
      prisma.transaction.create({
        data: {
          userId: l1Referrer.id,
          type: TransactionType.PASSIVE_INCOME,
          amount: l1Amount,
          description: `Passive income (10%) from friend`,
          meta: { generatorId, sourceType },
        },
      }),
    ]);
  }

  // Level 2 referrer
  if (!l1Referrer.referredBy) return;
  const l2Referrer = await prisma.user.findUnique({
    where: { referralCode: l1Referrer.referredBy },
    select: { id: true },
  });
  if (!l2Referrer) return;

  const l2Amount = Math.floor(earnedAmount * PASSIVE_L2);
  if (l2Amount > 0) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: l2Referrer.id },
        data: { novaBalance: { increment: l2Amount }, totalEarned: { increment: l2Amount } },
      }),
      prisma.passiveIncome.create({
        data: { recipientId: l2Referrer.id, generatorId, level: 2, amount: l2Amount, sourceType },
      }),
      prisma.transaction.create({
        data: {
          userId: l2Referrer.id,
          type: TransactionType.PASSIVE_INCOME,
          amount: l2Amount,
          description: `Passive income (3%) from network`,
          meta: { generatorId, sourceType },
        },
      }),
    ]);
  }
}

// Check and unlock achievements
async function checkAchievements(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      achievements:   { select: { achievementId: true } },
      referrals:      { where: { referrerId: userId }, select: { id: true } },
      streak:         true,
      gameSessions:   { select: { id: true } },
      transactions:   { where: { type: TransactionType.AD_REWARD }, select: { id: true } },
      withdrawals:    { where: { status: WithdrawalStatus.PAID }, select: { id: true } },
    },
  });
  if (!user) return [];

  const unlocked = new Set(user.achievements.map((a) => a.achievementId));
  const referralCount  = user.referrals.length;
  const streakCount    = user.streak?.currentStreak ?? 0;
  const newlyUnlocked: AchievementType[] = [];

  const candidates: Array<{ type: AchievementType; condition: boolean }> = [
    { type: AchievementType.FIRST_TAP,        condition: user.totalTaps >= 1 },
    { type: AchievementType.FIRST_REFERRAL,   condition: referralCount >= 1 },
    { type: AchievementType.STREAK_7,         condition: streakCount >= 7 },
    { type: AchievementType.STREAK_30,        condition: streakCount >= 30 },
    { type: AchievementType.LEVEL_5,          condition: user.level >= 5 },
    { type: AchievementType.LEVEL_10,         condition: user.level >= 10 },
    { type: AchievementType.LEVEL_20,         condition: user.level >= 20 },
    { type: AchievementType.INVITE_5,         condition: referralCount >= 5 },
    { type: AchievementType.INVITE_10,        condition: referralCount >= 10 },
    { type: AchievementType.INVITE_25,        condition: referralCount >= 25 },
    { type: AchievementType.EARN_10K,         condition: user.totalEarned >= 10_000 },
    { type: AchievementType.EARN_100K,        condition: user.totalEarned >= 100_000 },
    { type: AchievementType.FIRST_WITHDRAWAL, condition: user.withdrawals.length > 0 },
    { type: AchievementType.WALLET_CONNECTED, condition: !!user.tonWallet },
  ];

  for (const { type, condition } of candidates) {
    if (!condition) continue;

    // Find achievement definition
    const achievement = await prisma.achievement.findUnique({ where: { type } });
    if (!achievement) continue;
    if (unlocked.has(achievement.id)) continue;

    await prisma.$transaction([
      prisma.userAchievement.create({
        data: { userId, achievementId: achievement.id },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          novaBalance: { increment: achievement.novaReward },
          totalEarned: { increment: achievement.novaReward },
          xp:          { increment: achievement.xpReward },
        },
      }),
    ]);
    newlyUnlocked.push(type);
  }
  return newlyUnlocked;
}

// ─── getUser ──────────────────────────────────────────────────────────────────

export async function getUser(tgUserId: number, username?: string, firstName?: string) {
  const id = String(tgUserId);

  let user = await prisma.user.findUnique({
    where: { id },
    include: { energy: true, streak: true },
  });

  if (!user) {
    const refCode = generateReferralCode();
    user = await prisma.user.create({
      data: {
        id,
        username:     username || null,
        firstName:    firstName || null,
        referralCode: refCode,
        energy: { create: { current: ENERGY_MAX, maximum: ENERGY_MAX } },
        streak: { create: {} },
      },
      include: { energy: true, streak: true },
    });
  } else {
    if (username || firstName) {
      await prisma.user.update({
        where: { id },
        data: { username: username || null, firstName: firstName || null },
      });
    }
  }

  // Recalc level
  const level = calculateLevel(user.xp);
  if (level !== user.level) {
    await prisma.user.update({ where: { id }, data: { level } });
    user = { ...user, level };
  }

  return {
    id:           user.id,
    username:     user.username,
    firstName:    user.firstName,
    novaBalance:  user.novaBalance,
    totalEarned:  user.totalEarned,
    level:        user.level,
    xp:           user.xp,
    xpForNext:    xpForLevel(user.level + 1),
    totalTaps:    user.totalTaps,
    referralCode: user.referralCode,
    referredBy:   user.referredBy,
    tonWallet:    user.tonWallet,
  };
}

// ─── getEnergy ────────────────────────────────────────────────────────────────

export async function getEnergy(tgUserId: number) {
  const id = String(tgUserId);

  let energy = await prisma.energy.findUnique({ where: { userId: id } });
  if (!energy) {
    energy = await prisma.energy.create({
      data: { userId: id, current: ENERGY_MAX, maximum: ENERGY_MAX },
    });
  }

  // Refill based on elapsed time
  const now        = new Date();
  const elapsed    = (now.getTime() - new Date(energy.lastRefillAt).getTime()) / 1000;
  const ticks      = Math.floor(elapsed / energy.refillEvery);
  const refillable = Math.min(ticks * energy.refillRate, energy.maximum - energy.current);

  if (refillable > 0) {
    energy = await prisma.energy.update({
      where: { userId: id },
      data: {
        current:      Math.min(energy.current + refillable, energy.maximum),
        lastRefillAt: new Date(energy.lastRefillAt.getTime() + ticks * energy.refillEvery * 1000),
      },
    });
  }

  const secondsToNext = energy.current < energy.maximum
    ? energy.refillEvery - Math.floor(elapsed % energy.refillEvery)
    : 0;

  return {
    current:      energy.current,
    maximum:      energy.maximum,
    secondsToNext,
    refillRate:   energy.refillRate,
    refillEvery:  energy.refillEvery,
  };
}

// ─── tapCoin ──────────────────────────────────────────────────────────────────

export async function tapCoin(tgUserId: number, taps: number = 1) {
  const id      = String(tgUserId);
  const safeTaps = Math.min(Math.max(1, taps), 10); // max 10 taps per call

  // Server-side rate limit: check last tap transaction timestamp
  // Reject if last tap was less than 400ms ago (10 taps/500ms = 1 per 50ms, be generous at 400ms for batch)
  const lastTap = await prisma.transaction.findFirst({
    where: { userId: id, type: TransactionType.TAP_REWARD },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (lastTap) {
    const msSinceLast = Date.now() - new Date(lastTap.createdAt).getTime();
    // Each batch call should be at least 400ms apart (10 taps takes ~500ms for a human)
    if (msSinceLast < 400) {
      return { success: false, error: "Too fast", energy: null };
    }
  }

  // Refresh energy first
  const energyData = await getEnergy(tgUserId);
  if (energyData.current < safeTaps) {
    return { success: false, error: "Not enough energy", energy: energyData };
  }

  const novaEarned = safeTaps * NOVA_PER_TAP;
  const xpEarned   = safeTaps * XP_PER_TAP;

  await prisma.$transaction([
    prisma.energy.update({
      where: { userId: id },
      data:  { current: { decrement: safeTaps } },
    }),
    prisma.user.update({
      where: { id },
      data: {
        novaBalance: { increment: novaEarned },
        totalEarned: { increment: novaEarned },
        xp:          { increment: xpEarned },
        totalTaps:   { increment: safeTaps },
      },
    }),
    prisma.transaction.create({
      data: {
        userId:      id,
        type:        TransactionType.TAP_REWARD,
        amount:      novaEarned,
        description: `Tapped coin ×${safeTaps}`,
      },
    }),
  ]);

  // Passive income for referrers (fire-and-forget)
  distributePassiveIncome(id, novaEarned, "TAP").catch(() => {});
  checkAchievements(id).catch(() => {});

  const newEnergy = Math.max(0, energyData.current - safeTaps);
  return { success: true, novaEarned, xpEarned, energy: { ...energyData, current: newEnergy } };
}

// ─── getQuests ────────────────────────────────────────────────────────────────

export async function getQuests(tgUserId: number) {
  const id = String(tgUserId);

  const [activeQuests, userQuests] = await Promise.all([
    prisma.quest.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.userQuest.findMany({ where: { userId: id } }),
  ]);

  const uqMap = Object.fromEntries(userQuests.map((uq) => [uq.questId, uq]));

  return activeQuests.map((q) => {
    const uq = uqMap[q.id];
    return {
      id:              q.id,
      title:           q.title,
      description:     q.description,
      iconEmoji:       q.iconEmoji,
      type:            q.type,
      difficulty:      q.difficulty,
      minutesEst:      q.minutesEst,
      novaReward:      q.novaReward,
      xpReward:        q.xpReward,
      targetCount:     q.targetCount,
      progress:        uq?.progress   ?? 0,
      completed:       uq?.completed  ?? false,
      channelUsername: q.channelUsername ?? null,
      channelUrl:      q.channelUrl      ?? null,
    };
  });
}

// ─── completeQuest ────────────────────────────────────────────────────────────

export async function completeQuest(tgUserId: number, questId: string) {
  const id = String(tgUserId);

  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest || !quest.active) return { success: false, error: "Quest not found" };

  // Block channel/group/social quests from completing without verification
  // These must go through verifyChannelMembership first
  const VERIFIED_TYPES = ["JOIN_CHANNEL", "JOIN_GROUP", "SOCIAL_FOLLOW"];
  if (VERIFIED_TYPES.includes(quest.type) && quest.channelUsername) {
    // Re-verify on server side — cannot trust client
    const check = await verifyChannelMembership(tgUserId, quest.channelUsername);
    if (!check.isMember) {
      return { success: false, error: "You must join the channel/group first" };
    }
  }

  let uq = await prisma.userQuest.findUnique({
    where: { userId_questId: { userId: id, questId } },
  });
  if (!uq) {
    uq = await prisma.userQuest.create({ data: { userId: id, questId, progress: 0 } });
  }

  // Handle repeatable reset
  if (uq.completed && quest.repeatable) {
    const hoursSince = (Date.now() - new Date(uq.lastReset).getTime()) / 3_600_000;
    if (hoursSince >= quest.resetHours) {
      uq = await prisma.userQuest.update({
        where: { id: uq.id },
        data: { progress: 0, completed: false, completedAt: null, claimedAt: null, lastReset: new Date() },
      });
    } else {
      const h = Math.ceil(quest.resetHours - hoursSince);
      return { success: false, error: `Resets in ${h}h` };
    }
  }

  if (uq.completed && !quest.repeatable) return { success: false, error: "Already completed" };

  const newProgress  = uq.progress + 1;
  const nowCompleted = newProgress >= quest.targetCount;

  await prisma.userQuest.update({
    where: { id: uq.id },
    data: { progress: newProgress, completed: nowCompleted, completedAt: nowCompleted ? new Date() : undefined },
  });

  if (nowCompleted) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { novaBalance: { increment: quest.novaReward }, totalEarned: { increment: quest.novaReward }, xp: { increment: quest.xpReward } },
      }),
      prisma.transaction.create({
        data: { userId: id, type: TransactionType.QUEST_REWARD, amount: quest.novaReward, description: `Quest: ${quest.title}`, meta: { questId } },
      }),
    ]);
    distributePassiveIncome(id, quest.novaReward, "QUEST").catch(() => {});
    checkAchievements(id).catch(() => {});
  }

  return { success: true, completed: nowCompleted };
}

// ─── verifyChannelMembership ──────────────────────────────────────────────────

export async function verifyChannelMembership(tgUserId: number, channelUsername: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) return { success: false, isMember: false };

  try {
    const chatId = channelUsername.startsWith("@") ? channelUsername : `@${channelUsername}`;
    const url    = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${tgUserId}`;
    const res    = await fetch(url);
    const data   = await res.json();
    const status = data.result?.status ?? "";
    return { success: data.ok, isMember: ["member","administrator","creator"].includes(status) };
  } catch {
    return { success: false, isMember: false };
  }
}

// ─── claimDailyStreak ─────────────────────────────────────────────────────────

export async function claimDailyStreak(tgUserId: number) {
  const id = String(tgUserId);

  let streak = await prisma.dailyStreak.findUnique({ where: { userId: id } });
  if (!streak) streak = await prisma.dailyStreak.create({ data: { userId: id } });

  const now      = new Date();
  const lastClaim = streak.lastClaimedAt;
  if (lastClaim && now.getTime() - lastClaim.getTime() < 20 * 3_600_000) {
    return { success: false, error: "Already claimed today" };
  }

  const isBroken  = lastClaim && now.getTime() - lastClaim.getTime() > 48 * 3_600_000;
  const newStreak = isBroken ? 1 : streak.currentStreak + 1;
  const bonus     = newStreak * 50;

  await Promise.all([
    prisma.dailyStreak.update({
      where: { id: streak.id },
      data: { currentStreak: newStreak, longestStreak: Math.max(newStreak, streak.longestStreak), lastClaimedAt: now, nextClaimAt: new Date(now.getTime() + 86_400_000) },
    }),
    prisma.user.update({
      where: { id },
      data: { novaBalance: { increment: bonus }, totalEarned: { increment: bonus }, xp: { increment: 100 } },
    }),
    prisma.transaction.create({
      data: { userId: id, type: TransactionType.STREAK_BONUS, amount: bonus, description: `Day ${newStreak} streak bonus` },
    }),
  ]);

  distributePassiveIncome(id, bonus, "STREAK").catch(() => {});
  checkAchievements(id).catch(() => {});
  return { success: true, streak: newStreak, bonus };
}

// ─── getStreakData ────────────────────────────────────────────────────────────

export async function getStreakData(tgUserId: number) {
  const id = String(tgUserId);
  let streak = await prisma.dailyStreak.findUnique({ where: { userId: id } });
  if (!streak) streak = await prisma.dailyStreak.create({ data: { userId: id } });

  const lastClaim = streak.lastClaimedAt;
  const canClaim  = !lastClaim || (Date.now() - new Date(lastClaim).getTime()) >= 20 * 3_600_000;
  return { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak, canClaim };
}

// ─── trackReferral ────────────────────────────────────────────────────────────

export async function trackReferral(newUserId: number, referralCode: string) {
  const refereeId = String(newUserId);

  const existing = await prisma.referral.findUnique({ where: { refereeId } });
  if (existing) return { success: false, error: "Already referred" };

  const referrer = await prisma.user.findUnique({ where: { referralCode } });
  if (!referrer) return { success: false, error: "Invalid code" };
  if (referrer.id === refereeId) return { success: false, error: "Can't refer yourself" };

  await prisma.$transaction([
    prisma.referral.create({ data: { referrerId: referrer.id, refereeId, level: 1, bonusPaid: true, bonusAmount: REFERRAL_BONUS } }),
    prisma.user.update({ where: { id: referrer.id }, data: { novaBalance: { increment: REFERRAL_BONUS }, totalEarned: { increment: REFERRAL_BONUS } } }),
    prisma.user.update({ where: { id: refereeId }, data: { referredBy: referralCode } }),
    prisma.transaction.create({ data: { userId: referrer.id, type: TransactionType.REFERRAL_BONUS, amount: REFERRAL_BONUS, description: `Invited new user`, meta: { refereeId } } }),
  ]);

  checkAchievements(referrer.id).catch(() => {});
  return { success: true };
}

// ─── getReferralStats ─────────────────────────────────────────────────────────

export async function getReferralStats(tgUserId: number) {
  const id = String(tgUserId);
  const [directCount, passiveToday, recentFriends] = await Promise.all([
    prisma.referral.count({ where: { referrerId: id } }),
    prisma.passiveIncome.aggregate({
      where: { recipientId: id, createdAt: { gte: new Date(Date.now() - 86_400_000) } },
      _sum: { amount: true },
    }),
    prisma.passiveIncome.findMany({
      where: { recipientId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { generatorId: true, amount: true, level: true, sourceType: true, createdAt: true },
    }),
  ]);

  return {
    count:         directCount,
    totalEarned:   directCount * REFERRAL_BONUS,
    passiveToday:  passiveToday._sum.amount ?? 0,
    recentPassive: recentFriends,
  };
}

// ─── saveGameSession ──────────────────────────────────────────────────────────

export async function saveGameSession(tgUserId: number, score: number, novaEarned: number, duration: number, gameType = "coin_rush") {
  const id = String(tgUserId);

  await prisma.$transaction([
    prisma.gameSession.create({ data: { userId: id, gameType, score, novaEarned, duration } }),
    ...(novaEarned > 0 ? [
      prisma.user.update({ where: { id }, data: { novaBalance: { increment: novaEarned }, totalEarned: { increment: novaEarned }, xp: { increment: Math.floor(novaEarned / 5) } } }),
      prisma.transaction.create({ data: { userId: id, type: TransactionType.TAP_REWARD, amount: novaEarned, description: `Game session: ${gameType}`, meta: { score } } }),
    ] : []),
  ]);

  if (novaEarned > 0) distributePassiveIncome(id, novaEarned, "GAME").catch(() => {});
  checkAchievements(id).catch(() => {});
  return { success: true };
}

// ─── connectWallet ────────────────────────────────────────────────────────────

export async function connectWallet(tgUserId: number, tonWallet: string) {
  const id = String(tgUserId);
  await prisma.user.update({ where: { id }, data: { tonWallet } });
  checkAchievements(id).catch(() => {});
  return { success: true };
}

// ─── requestWithdrawal ────────────────────────────────────────────────────────

export async function requestWithdrawal(tgUserId: number, novaAmount: number, tonWallet: string) {
  const id   = String(tgUserId);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.novaBalance < novaAmount) return { success: false, error: "Insufficient balance" };
  if (novaAmount < MIN_WITHDRAWAL) return { success: false, error: `Minimum: ${MIN_WITHDRAWAL.toLocaleString()} NOVA` };

  const tonAmount = novaAmount / NOVA_PER_TON;
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { novaBalance: { decrement: novaAmount }, tonWallet } }),
    prisma.withdrawal.create({ data: { userId: id, novaAmount, tonAmount, tonWallet, status: WithdrawalStatus.PENDING } }),
    prisma.transaction.create({ data: { userId: id, type: TransactionType.WITHDRAWAL, amount: -novaAmount, description: `Withdrawal: ${tonWallet.slice(0, 8)}…` } }),
  ]);

  checkAchievements(id).catch(() => {});
  return { success: true, tonAmount };
}

// ─── getTransactions ──────────────────────────────────────────────────────────

export async function getTransactions(tgUserId: number) {
  const id  = String(tgUserId);
  const txs = await prisma.transaction.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 50 });
  return txs.map((tx) => ({ id: tx.id, type: tx.type, amount: tx.amount, description: tx.description, createdAt: tx.createdAt }));
}

// ─── getLeaderboard ───────────────────────────────────────────────────────────

export async function getLeaderboard() {
  const top = await prisma.user.findMany({
    orderBy: { totalEarned: "desc" },
    take: 100,
    select: { id: true, username: true, firstName: true, totalEarned: true, level: true },
  });
  return top.map((u, i) => ({ rank: i + 1, id: u.id, name: u.username || u.firstName || "Anonymous", totalEarned: u.totalEarned, level: u.level }));
}

// ─── getUserAchievements ──────────────────────────────────────────────────────

export async function getUserAchievements(tgUserId: number) {
  const id = String(tgUserId);
  const rows = await prisma.userAchievement.findMany({
    where: { userId: id },
    include: { achievement: true },
    orderBy: { unlockedAt: "desc" },
  });
  return rows.map((r) => ({
    type:        r.achievement.type,
    title:       r.achievement.title,
    description: r.achievement.description,
    iconEmoji:   r.achievement.iconEmoji,
    novaReward:  r.achievement.novaReward,
    unlockedAt:  r.unlockedAt,
  }));
}

// ─── getLiveStats ─────────────────────────────────────────────────────────────

export async function getLiveStats() {
  const [totalUsers, totalNova] = await Promise.all([
    prisma.user.count(),
    prisma.user.aggregate({ _sum: { totalEarned: true } }),
  ]);
  return { totalUsers, totalNovaEarned: totalNova._sum.totalEarned ?? 0 };
}

// ─── getReferralQuestProgress ─────────────────────────────────────────────────
// Returns the real referral count from DB and auto-completes INVITE_FRIENDS
// quests whose targetCount has been reached. Called on QuestsScreen load.

export async function syncReferralQuestProgress(tgUserId: number) {
  const id = String(tgUserId);

  // Count real referrals made by this user
  const referralCount = await prisma.referral.count({
    where: { referrerId: id },
  });

  // Find all INVITE_FRIENDS quests
  const inviteQuests = await prisma.quest.findMany({
    where: { type: "INVITE_FRIENDS", active: true },
  });

  const results: Array<{ questId: string; progress: number; completed: boolean; newlyCompleted: boolean }> = [];

  for (const quest of inviteQuests) {
    const progress = Math.min(referralCount, quest.targetCount);
    const shouldComplete = referralCount >= quest.targetCount;

    let uq = await prisma.userQuest.findUnique({
      where: { userId_questId: { userId: id, questId: quest.id } },
    });

    if (!uq) {
      uq = await prisma.userQuest.create({
        data: { userId: id, questId: quest.id, progress },
      });
    }

    // Already completed — skip
    if (uq.completed) {
      results.push({ questId: quest.id, progress, completed: true, newlyCompleted: false });
      continue;
    }

    // Update progress always
    await prisma.userQuest.update({
      where: { id: uq.id },
      data: { progress },
    });

    // Auto-complete if threshold reached
    if (shouldComplete) {
      await prisma.$transaction([
        prisma.userQuest.update({
          where: { id: uq.id },
          data: { completed: true, completedAt: new Date() },
        }),
        prisma.user.update({
          where: { id },
          data: {
            novaBalance: { increment: quest.novaReward },
            totalEarned: { increment: quest.novaReward },
            xp:          { increment: quest.xpReward },
          },
        }),
        prisma.transaction.create({
          data: {
            userId:      id,
            type:        TransactionType.QUEST_REWARD,
            amount:      quest.novaReward,
            description: `Quest completed: ${quest.title}`,
            meta:        { questId: quest.id, referralCount },
          },
        }),
      ]);
      distributePassiveIncome(id, quest.novaReward, "QUEST").catch(() => {});
      checkAchievements(id).catch(() => {});
      results.push({ questId: quest.id, progress, completed: true, newlyCompleted: true });
    } else {
      results.push({ questId: quest.id, progress, completed: false, newlyCompleted: false });
    }
  }

  return { referralCount, quests: results };
}
