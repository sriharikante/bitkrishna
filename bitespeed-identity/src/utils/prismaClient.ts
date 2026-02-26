import { PrismaClient } from "@prisma/client";

// Singleton exported instance — safe on Render (long-running) and avoids
// "too many clients" on hot-reloading in dev (via global caching).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
