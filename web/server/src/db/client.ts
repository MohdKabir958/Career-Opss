import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __careerOpsPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__careerOpsPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__careerOpsPrisma = prisma;
}
