"use server";

import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SyncResult {
  success: boolean;
  highScore: number;
  totalGames: number;
  error?: string;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  highScore: number;
  totalGames: number;
}

// ─── syncPlayerAndScore ────────────────────────────────────────────────────────

/**
 * Upsert the player record and conditionally update their high score.
 * Called on game boot (score=0, gameOver=false) to read the stored best,
 * and on game-over (score=N, gameOver=true) to persist results.
 *
 * @param tgUserId     Telegram numeric user ID.
 * @param username     Telegram handle to cache (may be empty string).
 * @param currentScore Score from the finished run (0 on boot).
 * @param gameOver     True only when a real run just ended.
 */
export async function syncPlayerAndScore(
  tgUserId: number,
  username: string,
  currentScore: number,
  gameOver = false,
): Promise<SyncResult> {
  try {
    const id = String(tgUserId);

    // Upsert ensures the player row always exists after this call.
    const player = await prisma.player.upsert({
      where: { id },
      create: {
        id,
        username: username || null,
        highScore: currentScore,
        totalGames: gameOver ? 1 : 0,
      },
      update: {
        username: username || null,
        // Only increment game count when a real run ended.
        ...(gameOver && { totalGames: { increment: 1 } }),
      },
    });

    // Evaluate whether this run beats the stored best.
    let finalHighScore = player.highScore;
    if (currentScore > player.highScore) {
      const updated = await prisma.player.update({
        where: { id },
        data: { highScore: currentScore },
      });
      finalHighScore = updated.highScore;
    }

    return {
      success: true,
      highScore: finalHighScore,
      totalGames: player.totalGames + (gameOver ? 1 : 0),
    };
  } catch (error) {
    console.error("[syncPlayerAndScore] DB error:", error);
    return { success: false, highScore: 0, totalGames: 0, error: String(error) };
  }
}

// ─── getLeaderboard ────────────────────────────────────────────────────────────

/**
 * Returns the top-10 players ranked by highScore descending.
 * Players without a username are shown as "Anonymous".
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const players = await prisma.player.findMany({
      orderBy: { highScore: "desc" },
      take: 10,
      select: {
        id: true,
        username: true,
        highScore: true,
        totalGames: true,
      },
    });

    return players.map((p, i) => ({
      rank: i + 1,
      id: p.id,
      username: p.username || "Anonymous",
      highScore: p.highScore,
      totalGames: p.totalGames,
    }));
  } catch (error) {
    console.error("[getLeaderboard] DB error:", error);
    return [];
  }
}
