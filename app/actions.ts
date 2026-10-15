"use server";

import { prisma } from "@/lib/prisma";

/**
 * Result returned by {@link syncPlayerAndScore}.
 */
interface SyncResult {
  success: boolean;
  highScore: number;
  error?: string;
}

/**
 * Synchronise a Telegram player's identity and game score with the database.
 *
 * The function uses a Prisma `upsert` to guarantee the player row exists
 * (creating it on first launch with the incoming score, or caching their
 * latest Telegram handle on subsequent visits).  It then evaluates whether
 * the current run's score beats the stored all-time best and, if so,
 * updates the record accordingly.
 *
 * @param tgUserId     The Telegram user's numeric ID (used as the primary key).
 * @param username     The Telegram handle to cache (may be an empty string).
 * @param currentScore The score achieved in the current game run (0 on boot).
 *
 * @returns `{ success, highScore }` on success, or `{ success: false, error }` on failure.
 */
export async function syncPlayerAndScore(
  tgUserId: number,
  username: string,
  currentScore: number,
): Promise<SyncResult> {
  try {
    // The Prisma primary key is a String, so we cast the numeric Telegram ID.
    const id = String(tgUserId);

    // Upsert ensures the player always exists after this call.
    //   • On create: store the ID, cached handle, and current score as the
    //     initial high score (a brand-new player's first run IS their best).
    //   • On update: refresh the cached username so it stays current, but
    //     leave highScore untouched — we evaluate it separately below.
    const player = await prisma.player.upsert({
      where: { id },
      create: {
        id,
        username: username || null,
        highScore: currentScore,
      },
      update: {
        username: username || null,
      },
    });

    // Evaluate whether the current run beats the stored all-time best.
    // This is a separate, conditional update so we never lower the high score.
    let finalHighScore = player.highScore;

    if (currentScore > player.highScore) {
      const updated = await prisma.player.update({
        where: { id },
        data: { highScore: currentScore },
      });
      finalHighScore = updated.highScore;
    }

    return { success: true, highScore: finalHighScore };
  } catch (error) {
    console.error("[syncPlayerAndScore] Database error:", error);
    return {
      success: false,
      highScore: 0,
      error: "Failed to sync player score to the database.",
    };
  }
}
