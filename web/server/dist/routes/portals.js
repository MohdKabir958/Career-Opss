import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client.js";
import { HttpError } from "../middleware/error.js";
import { readPortals, writeTitleFilter } from "../services/portalsService.js";
import { suggestTitleFilters } from "../services/keywordSuggester.js";
const titleFilterSchema = z.object({
    positive: z.array(z.string().min(1).max(80)).max(200),
    negative: z.array(z.string().min(1).max(80)).max(200),
    seniority_boost: z.array(z.string().min(1).max(80)).max(50).optional(),
});
const suggestSchema = z.object({
    targetRole: z.string().max(200).optional(),
    resumeId: z.string().optional(),
    model: z.string().optional(),
    mergeWithExisting: z.boolean().optional().default(false),
});
export function portalsRouter() {
    const router = Router();
    router.get("/", (_req, res, next) => {
        try {
            const config = readPortals();
            res.json(config);
        }
        catch (error) {
            next(error);
        }
    });
    router.put("/title-filter", (req, res, next) => {
        try {
            const body = titleFilterSchema.parse(req.body ?? {});
            const current = readPortals();
            const merged = writeTitleFilter({
                positive: body.positive,
                negative: body.negative,
                seniority_boost: body.seniority_boost ?? current.title_filter.seniority_boost,
            });
            res.json({
                ok: true,
                title_filter: merged,
                savedAt: new Date().toISOString(),
            });
        }
        catch (error) {
            next(error);
        }
    });
    router.post("/suggest", async (req, res, next) => {
        try {
            const { userId } = req;
            const body = suggestSchema.parse(req.body ?? {});
            const resume = body.resumeId
                ? await prisma.resume.findFirst({ where: { id: body.resumeId, userId } })
                : await prisma.resume.findFirst({ where: { userId, isActive: true } });
            if (!resume) {
                throw new HttpError(400, "No resume available. Upload a resume first or pass an explicit resumeId.");
            }
            const current = readPortals();
            const suggestion = await suggestTitleFilters({
                resume: resume.content,
                targetRole: body.targetRole,
                existingPositive: current.title_filter.positive,
                existingNegative: current.title_filter.negative,
                model: body.model,
            });
            let mergedPositive = suggestion.positive;
            let mergedNegative = suggestion.negative;
            if (body.mergeWithExisting) {
                const seenP = new Set();
                mergedPositive = [...current.title_filter.positive, ...suggestion.positive].filter((v) => {
                    const key = v.toLowerCase();
                    if (seenP.has(key))
                        return false;
                    seenP.add(key);
                    return true;
                });
                const seenN = new Set();
                mergedNegative = [...current.title_filter.negative, ...suggestion.negative].filter((v) => {
                    const key = v.toLowerCase();
                    if (seenN.has(key))
                        return false;
                    seenN.add(key);
                    return true;
                });
            }
            res.json({
                ok: true,
                resumeId: resume.id,
                resumeName: resume.name,
                targetRole: body.targetRole ?? null,
                suggestion: {
                    positive: mergedPositive,
                    negative: mergedNegative,
                    rationale: suggestion.rationale,
                    detectedRoles: suggestion.detectedRoles,
                },
                existing: current.title_filter,
            });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
