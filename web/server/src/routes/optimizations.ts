import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { optimizeForAts } from "../services/atsOptimizer.js";
import { renderMarkdownPdf } from "../services/pdfRenderer.js";

const createSchema = z.object({
  jobDescription: z.string().min(20),
  resumeId: z.string().optional(),
  model: z.string().optional(),
});

export function optimizationsRouter(): Router {
  const router = Router();

  router.get("/", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const items = await prisma.optimization.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          atsScore: true,
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
      const item = await prisma.optimization.findFirst({
        where: { id: req.params.id, userId },
        include: { resume: { select: { id: true, name: true, content: true } } },
      });
      if (!item) throw new HttpError(404, "Optimization not found");
      res.json({
        ...item,
        missingKeywords: safeJsonArray(item.missingKeywords),
        changes: safeJsonArray(item.changes),
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

      const result = await optimizeForAts({
        resume: resume.content,
        jobDescription: body.jobDescription,
        model: body.model,
      });

      const created = await prisma.optimization.create({
        data: {
          userId,
          resumeId: resume.id,
          jobDescription: body.jobDescription,
          optimizedMarkdown: result.optimizedResumeMarkdown,
          atsScore: result.atsScore,
          missingKeywords: JSON.stringify(result.missingKeywords),
          changes: JSON.stringify(result.changes),
        },
      });

      res.json({
        ...created,
        missingKeywords: result.missingKeywords,
        changes: result.changes,
        summary: result.summary,
      });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const existing = await prisma.optimization.findFirst({
        where: { id: req.params.id, userId },
      });
      if (!existing) throw new HttpError(404, "Optimization not found");
      await prisma.optimization.delete({ where: { id: existing.id } });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/pdf", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const existing = await prisma.optimization.findFirst({
        where: { id: req.params.id, userId },
        include: { resume: { select: { name: true } } },
      });
      if (!existing) throw new HttpError(404, "Optimization not found");

      const docTitle = existing.resume?.name
        ? `${existing.resume.name} — ATS Optimized`
        : "ATS Optimized Resume";

      const result = await renderMarkdownPdf({
        userId,
        namespace: "optimization",
        id: existing.id,
        markdown: existing.optimizedMarkdown,
        documentTitle: docTitle,
      });
      if (!result.ok) {
        throw new HttpError(
          500,
          `PDF generation failed: ${result.stderr || "unknown error"}`,
        );
      }
      res.json({
        ok: true,
        outputPdf: result.outputPdf,
        htmlPath: result.htmlPath,
        downloadUrl: `/api/optimizations/${existing.id}/pdf/download?path=${encodeURIComponent(result.outputPdf)}`,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/pdf/download", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const existing = await prisma.optimization.findFirst({
        where: { id: req.params.id, userId },
        include: { resume: { select: { name: true } } },
      });
      if (!existing) throw new HttpError(404, "Optimization not found");
      const filePath = String(req.query.path || "");
      const safeMarker = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
      if (!filePath.includes(safeMarker) || !filePath.toLowerCase().endsWith(".pdf")) {
        throw new HttpError(400, "Invalid download path");
      }
      const friendlyBase = (existing.resume?.name || "resume")
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 80) || "resume";
      const friendlyName = `${friendlyBase}_ATS_Optimized.pdf`;
      res.download(filePath, friendlyName);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function safeJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
