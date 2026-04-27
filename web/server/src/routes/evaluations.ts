import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { evaluateJob } from "../services/evaluator.js";

const createSchema = z.object({
  jobDescription: z.string().min(20, "Job description is too short"),
  resumeId: z.string().optional(),
  model: z.string().optional(),
  provider: z.enum(["openai"]).optional().default("openai"),
});

export function evaluationsRouter(): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const items = await prisma.evaluation.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          jobTitle: true,
          score: true,
          archetype: true,
          legitimacy: true,
          provider: true,
          model: true,
          createdAt: true,
          resumeId: true,
        },
      });
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const item = await prisma.evaluation.findFirst({
        where: { id: req.params.id, userId },
        include: { resume: { select: { id: true, name: true } } },
      });
      if (!item) throw new HttpError(404, "Evaluation not found");
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const body = createSchema.parse(req.body ?? {});

      const resume = body.resumeId
        ? await prisma.resume.findFirst({ where: { id: body.resumeId, userId } })
        : await prisma.resume.findFirst({ where: { userId, isActive: true } });
      if (!resume) {
        throw new HttpError(400, "No resume available. Upload a resume first.");
      }

      const result = await evaluateJob({
        resume: resume.content,
        jobDescription: body.jobDescription,
        model: body.model,
      });

      const created = await prisma.evaluation.create({
        data: {
          userId,
          resumeId: resume.id,
          jobTitle: result.jobTitle,
          jobDescription: body.jobDescription,
          provider: body.provider,
          model: body.model ?? null,
          reportMarkdown: result.reportMarkdown,
          score: result.score,
          archetype: result.archetype,
          legitimacy: result.legitimacy,
        },
      });

      res.json(created);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const existing = await prisma.evaluation.findFirst({
        where: { id: req.params.id, userId },
      });
      if (!existing) throw new HttpError(404, "Evaluation not found");
      await prisma.evaluation.delete({ where: { id: existing.id } });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
