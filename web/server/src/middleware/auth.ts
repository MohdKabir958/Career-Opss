import type { NextFunction, Request, Response } from "express";
import { clerkMiddleware, getAuth, clerkClient } from "@clerk/express";
import { prisma } from "../db/client.js";
import { env } from "../env.js";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
    userEmail?: string | null;
  }
}

export interface AuthedRequest extends Request {
  userId: string;
  userEmail: string | null;
}

export const clerkAuthMiddleware = clerkMiddleware({
  publishableKey: env.CLERK_PUBLISHABLE_KEY,
  secretKey: env.CLERK_SECRET_KEY,
});

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    let email: string | null = null;
    try {
      const user = await clerkClient.users.getUser(auth.userId);
      email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
    } catch {
      email = null;
    }

    await prisma.user.upsert({
      where: { id: auth.userId },
      update: email ? { email } : {},
      create: { id: auth.userId, email },
    });

    req.userId = auth.userId;
    req.userEmail = email;
    next();
  } catch (error) {
    next(error);
  }
}
