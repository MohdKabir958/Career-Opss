import { PrismaClient } from "@prisma/client";
export const prisma = global.__careerOpsPrisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
    });
if (process.env.NODE_ENV !== "production") {
    global.__careerOpsPrisma = prisma;
}
