import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { resolve } from "path";

function createPrismaClient() {
  try {
    const dbPath = resolve(process.cwd(), "prisma/dev.db");
    const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
    return new PrismaClient({ adapter });
  } catch {
    // Fallback: try without adapter (may fail at query time, but won't crash at build)
    return new PrismaClient();
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
