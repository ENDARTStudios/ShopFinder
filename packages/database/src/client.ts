/**
 * @workspace/database — Prisma client singleton.
 *
 * Re-exports the generated PrismaClient from @prisma/client.
 * The singleton pattern ensures one connection pool per process.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type { PrismaClient } from "@prisma/client";
export type { Prisma } from "@prisma/client";
