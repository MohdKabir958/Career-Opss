import { Router } from "express";
import { prisma } from "../db/client.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { runScanScript } from "../services/scanRunner.js";

export function scanRouter(): Router {
  const router = Router();

  router.get("/results", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const items = await prisma.scanResult.findMany({
        where: { OR: [{ userId }, { userId: null }] },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  router.post("/run", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const result = await runScanScript();

      let inserted = 0;
      for (const row of result.rows) {
        try {
          await prisma.scanResult.upsert({
            where: { url: row.url },
            update: {
              company: row.company,
              title: row.title,
              location: row.location ?? null,
              source: row.source ?? null,
              userId,
            },
            create: {
              userId,
              company: row.company,
              title: row.title,
              url: row.url,
              location: row.location ?? null,
              source: row.source ?? null,
            },
          });
          inserted += 1;
        } catch {
          /* ignore duplicates */
        }
      }

      res.json({
        ok: result.ok,
        exitCode: result.exitCode,
        rowsParsed: result.rows.length,
        rowsPersisted: inserted,
        stdout: result.stdout.slice(-4000),
        stderr: result.stderr.slice(-4000),
      });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/results/:id", async (req, res, next) => {
    try {
      const { userId } = req as AuthedRequest;
      const existing = await prisma.scanResult.findFirst({
        where: { id: req.params.id, OR: [{ userId }, { userId: null }] },
      });
      if (!existing) {
        res.status(404).json({ error: "Scan result not found" });
        return;
      }
      await prisma.scanResult.delete({ where: { id: existing.id } });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
