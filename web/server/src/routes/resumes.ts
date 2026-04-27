import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../db/client.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { HttpError } from "../middleware/error.js";
import { extractResumeText } from "../services/pdfExtract.js";
import { renderResumePdf } from "../services/pdfRenderer.js";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  content: z.string().min(20).optional(),
});

const uploadFieldsSchema = z.object({
  name: z.string().max(200).optional(),
  setActive: z.union([z.boolean(), z.string()]).optional(),
});

function parseSetActive(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") return ["true", "1", "yes", "on"].includes(raw.toLowerCase());
  return false;
}

export function resumesRouter(): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  router.get("/", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const items = await prisma.resume.findMany({
        where: { userId },
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          name: true,
          sourceFileName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  router.get("/active", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const active = await prisma.resume.findFirst({
        where: { userId, isActive: true },
      });
      if (!active) {
        res.status(404).json({ error: "No active resume" });
        return;
      }
      res.json(active);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const item = await prisma.resume.findFirst({
        where: { id: req.params.id, userId },
      });
      if (!item) {
        throw new HttpError(404, "Resume not found");
      }
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  router.post("/upload", upload.single("file"), async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      if (!req.file) {
        throw new HttpError(400, "No file uploaded");
      }
      const fields = uploadFieldsSchema.parse(req.body ?? {});
      const setActive = parseSetActive(fields.setActive);

      const text = await extractResumeText(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
      );

      const baseName = (fields.name || req.file.originalname || "Resume").trim().slice(0, 200);

      const created = await prisma.$transaction(async (tx) => {
        if (setActive) {
          await tx.resume.updateMany({ where: { userId }, data: { isActive: false } });
        } else {
          const existing = await tx.resume.count({ where: { userId } });
          if (existing === 0) {
            // First upload becomes active automatically
          }
        }
        return tx.resume.create({
          data: {
            userId,
            name: baseName,
            sourceFileName: req.file?.originalname ?? null,
            content: text,
            isActive: setActive ? true : (await tx.resume.count({ where: { userId } })) === 0,
          },
        });
      });

      res.json(created);
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const body = z
        .object({
          name: z.string().min(1).max(200),
          content: z.string().min(20),
          setActive: z.boolean().optional(),
        })
        .parse(req.body ?? {});

      const created = await prisma.$transaction(async (tx) => {
        if (body.setActive) {
          await tx.resume.updateMany({ where: { userId }, data: { isActive: false } });
        }
        const isFirst = (await tx.resume.count({ where: { userId } })) === 0;
        return tx.resume.create({
          data: {
            userId,
            name: body.name,
            content: body.content,
            isActive: body.setActive || isFirst,
          },
        });
      });

      res.json(created);
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const data = updateSchema.parse(req.body ?? {});
      const existing = await prisma.resume.findFirst({
        where: { id: req.params.id, userId },
      });
      if (!existing) throw new HttpError(404, "Resume not found");
      const updated = await prisma.resume.update({
        where: { id: existing.id },
        data,
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/activate", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const existing = await prisma.resume.findFirst({
        where: { id: req.params.id, userId },
      });
      if (!existing) throw new HttpError(404, "Resume not found");
      await prisma.$transaction([
        prisma.resume.updateMany({ where: { userId }, data: { isActive: false } }),
        prisma.resume.update({ where: { id: existing.id }, data: { isActive: true } }),
      ]);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const existing = await prisma.resume.findFirst({
        where: { id: req.params.id, userId },
      });
      if (!existing) throw new HttpError(404, "Resume not found");
      await prisma.resume.delete({ where: { id: existing.id } });
      if (existing.isActive) {
        const next = await prisma.resume.findFirst({
          where: { userId },
          orderBy: { updatedAt: "desc" },
        });
        if (next) {
          await prisma.resume.update({ where: { id: next.id }, data: { isActive: true } });
        }
      }
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/pdf", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const existing = await prisma.resume.findFirst({
        where: { id: req.params.id, userId },
      });
      if (!existing) throw new HttpError(404, "Resume not found");
      const result = await renderResumePdf({
        userId,
        resumeId: existing.id,
        resumeMarkdown: existing.content,
        documentTitle: existing.name || "Resume",
      });
      if (!result.ok) {
        throw new HttpError(500, `PDF generation failed: ${result.stderr || "unknown error"}`);
      }
      res.json({
        ok: true,
        outputPdf: result.outputPdf,
        htmlPath: result.htmlPath,
        downloadUrl: `/api/resumes/${existing.id}/pdf/download?path=${encodeURIComponent(result.outputPdf)}`,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/pdf/download", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const existing = await prisma.resume.findFirst({
        where: { id: req.params.id, userId },
      });
      if (!existing) throw new HttpError(404, "Resume not found");
      const filePath = String(req.query.path || "");
      const safeMarker = `${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      if (!filePath.includes(safeMarker) || !filePath.toLowerCase().endsWith(".pdf")) {
        throw new HttpError(400, "Invalid download path");
      }
      const friendlyBase = (existing.name || "resume")
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 80) || "resume";
      const friendlyName = `${friendlyBase}.pdf`;
      res.download(filePath, friendlyName);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
