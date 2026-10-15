import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton.
 *
 * In development, Next.js hot-reloads modules which can spawn multiple
 * PrismaClient instances and exhaust database connections.  We stash the
 * client on the global object so every reload reuses the same instance.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
