import { prisma } from "@/lib/prisma";
import { WithdrawalStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

// ─── Server actions for admin panel ──────────────────────────────────────────

async function approveWithdrawal(formData: FormData) {
  "use server";
  const id    = formData.get("id") as string;
  const txHash = formData.get("txHash") as string | null;
  await prisma.withdrawal.update({
    where: { id },
    data: {
      status:      WithdrawalStatus.PAID,
      txHash:      txHash || null,
      processedAt: new Date(),
    },
  });
  revalidatePath("/admin");
}

async function rejectWithdrawal(formData: FormData) {
  "use server";
  const id   = formData.get("id") as string;
  const note = formData.get("note") as string | null;
  // Refund the NOVA back to user
  const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
  if (withdrawal && withdrawal.status === WithdrawalStatus.PENDING) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: withdrawal.userId },
        data:  { novaBalance: { increment: withdrawal.novaAmount } },
      }),
      prisma.withdrawal.update({
        where: { id },
        data:  { status: WithdrawalStatus.REJECTED, note: note || "Rejected by admin", processedAt: new Date() },
      }),
    ]);
  }
  revalidatePath("/admin");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const ADMIN_SECRET = process.env.ADMIN_SECRET;

  const [pending, paid, rejected, userCount, totalNova] = await Promise.all([
    prisma.withdrawal.findMany({
      where:   { status: WithdrawalStatus.PENDING },
      include: { user: { select: { username: true, firstName: true } } },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.withdrawal.count({ where: { status: WithdrawalStatus.PAID } }),
    prisma.withdrawal.count({ where: { status: WithdrawalStatus.REJECTED } }),
    prisma.user.count(),
    prisma.user.aggregate({ _sum: { novaBalance: true } }),
  ]);

  const pendingTon = pending.reduce((sum, w) => sum + w.tonAmount, 0);

  return (
    <div style={{ fontFamily: "system-ui", background: "#0d0b1a", minHeight: "100vh", color: "white", padding: "24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>🪙 NovaDrop Admin</h1>
          <p style={{ color: "rgba(167,139,250,0.6)", fontSize: 13 }}>
            Withdrawal management dashboard
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Users",    value: userCount,                                  color: "#a855f7" },
            { label: "Pending TON",    value: `${pendingTon.toFixed(2)} TON`,             color: "#f59e0b" },
            { label: "Paid Out",       value: paid,                                       color: "#22c55e" },
            { label: "Total NOVA",     value: (totalNova._sum.novaBalance ?? 0).toLocaleString(), color: "#38bdf8" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "rgba(42,26,94,0.6)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 16, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, color: "rgba(167,139,250,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 900, color, marginTop: 2 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Pending withdrawals */}
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
          Pending Withdrawals ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <div style={{ background: "rgba(42,26,94,0.3)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 16, padding: 32, textAlign: "center" }}>
            <p style={{ color: "rgba(167,139,250,0.5)" }}>No pending withdrawals 🎉</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pending.map((w) => (
              <div key={w.id} style={{ background: "rgba(42,26,94,0.5)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 16, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>
                      {w.user.username ? `@${w.user.username}` : w.user.firstName ?? "Unknown"}{" "}
                      <span style={{ color: "rgba(167,139,250,0.5)", fontSize: 12 }}>({w.userId})</span>
                    </p>
                    <p style={{ fontSize: 13, color: "#f59e0b", fontWeight: 700, marginTop: 2 }}>
                      {w.novaAmount.toLocaleString()} NOVA → {w.tonAmount.toFixed(4)} TON
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(167,139,250,0.5)", marginTop: 2 }}>
                      Wallet: {w.tonWallet}
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(167,139,250,0.4)", marginTop: 1 }}>
                      Requested: {new Date(w.requestedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Approve form */}
                <form action={approveWithdrawal} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input type="hidden" name="id" value={w.id} />
                  <input
                    type="text"
                    name="txHash"
                    placeholder="TON tx hash (optional)"
                    style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: "8px 12px", color: "white", fontSize: 12, outline: "none" }}
                  />
                  <button
                    type="submit"
                    style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", border: "none", borderRadius: 10, padding: "8px 16px", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    ✓ Mark Paid
                  </button>
                </form>

                {/* Reject form */}
                <form action={rejectWithdrawal} style={{ display: "flex", gap: 8 }}>
                  <input type="hidden" name="id" value={w.id} />
                  <input
                    type="text"
                    name="note"
                    placeholder="Rejection reason (optional)"
                    style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: "8px 12px", color: "white", fontSize: 12, outline: "none" }}
                  />
                  <button
                    type="submit"
                    style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 10, padding: "8px 16px", color: "#ef4444", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    ✕ Reject
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 24, padding: 16, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12 }}>
          <p style={{ fontSize: 12, color: "rgba(239,68,68,0.8)" }}>
            ⚠️ This page is publicly accessible. Set <code>ADMIN_SECRET</code> in your env vars and add password protection via Vercel middleware.
            {ADMIN_SECRET ? " ✅ ADMIN_SECRET is set." : " ❌ ADMIN_SECRET not set — protect this page!"}
          </p>
        </div>
      </div>
    </div>
  );
}
