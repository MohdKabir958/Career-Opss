import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { generateRoadmap } from "../services/roadmapGenerator.js";

const createSchema = z.object({
  targetRole: z.string().min(2),
  jobDescription: z.string().optional(),
  resumeId: z.string().optional(),
  model: z.string().optional(),
});

export function roadmapsRouter(): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const items = await prisma.roadmap.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          targetRole: true,
          createdAt: true,
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
      const item = await prisma.roadmap.findFirst({
        where: { id: req.params.id, userId },
      });
      if (!item) throw new HttpError(404, "Roadmap not found");
      res.json({
        ...item,
        content: safeJson(item.contentJson),
      });
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

      const result = await generateRoadmap({
        resume: resume.content,
        targetRole: body.targetRole,
        jobDescription: body.jobDescription,
        model: body.model,
      });

      const created = await prisma.roadmap.create({
        data: {
          userId,
          targetRole: body.targetRole,
          inputJobDescription: body.jobDescription ?? null,
          contentJson: JSON.stringify(result),
        },
      });

      res.json({ ...created, content: result });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const existing = await prisma.roadmap.findFirst({
        where: { id: req.params.id, userId },
      });
      if (!existing) throw new HttpError(404, "Roadmap not found");
      await prisma.roadmap.delete({ where: { id: existing.id } });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
