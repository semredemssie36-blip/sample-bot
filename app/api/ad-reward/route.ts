import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";

const AD_REWARD   = 100;   // NOVA per ad view
const COOLDOWN_MS = 60_000; // 60 seconds between views

// ─── Shared reward logic ──────────────────────────────────────────────────────

async function creditUser(userId: string) {
  if (!userId || userId === "0" || userId === "null") {
    return NextResponse.json({ success: false, error: "Invalid user" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  // Rate-limit: check last AD_REWARD transaction
  const lastAd = await prisma.transaction.findFirst({
    where: { userId, type: TransactionType.AD_REWARD },
    orderBy: { createdAt: "desc" },
  });

  if (lastAd) {
    const msSinceLast = Date.now() - new Date(lastAd.createdAt).getTime();
    if (msSinceLast < COOLDOWN_MS) {
      const waitSecs = Math.ceil((COOLDOWN_MS - msSinceLast) / 1000);
      return NextResponse.json(
        { success: false, error: `Cooldown active. Wait ${waitSecs}s.` },
        { status: 429 }
      );
    }
  }

  // Credit the user
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        novaBalance: { increment: AD_REWARD },
        totalEarned: { increment: AD_REWARD },
      },
    }),
    prisma.transaction.create({
      data: {
        userId,
        type:        TransactionType.AD_REWARD,
        amount:      AD_REWARD,
        description: "Watched ad",
      },
    }),
  ]);

  return NextResponse.json({ success: true, reward: AD_REWARD });
}

// ─── GET — Adsgram server-side reward callback ────────────────────────────────
// Adsgram calls: GET /api/ad-reward?userId=[userid]
// [userid] is automatically replaced by Adsgram with the real Telegram user ID

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = String(searchParams.get("userId") ?? "");
    return await creditUser(userId);
  } catch (err) {
    console.error("[ad-reward GET] error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

// ─── POST — client-side reward call from EarnScreen ──────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = String(body.userId ?? "");
    return await creditUser(userId);
  } catch (err) {
    console.error("[ad-reward POST] error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
