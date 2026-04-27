import { Router } from "express";
import { prisma } from "../db/client.js";
import { hasOpenAIKey } from "../env.js";
import type { AuthedRequest } from "../middleware/auth.js";

export function meRouter(): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const { userId, userEmail } = req as AuthedRequest;
      const [resumes, evaluations, optimizations, roadmaps, scanResults, activeResume] =
        await Promise.all([
          prisma.resume.count({ where: { userId } }),
          prisma.evaluation.count({ where: { userId } }),
          prisma.optimization.count({ where: { userId } }),
          prisma.roadmap.count({ where: { userId } }),
          prisma.scanResult.count({ where: { userId } }),
          prisma.resume.findFirst({
            where: { userId, isActive: true },
            select: { id: true, name: true, updatedAt: true },
          }),
        ]);

      res.json({
        userId,
        email: userEmail,
        counts: { resumes, evaluations, optimizations, roadmaps, scanResults },
        activeResume,
        config: {
          openAiConfigured: hasOpenAIKey(),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
