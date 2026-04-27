import { Router } from "express";
import { z } from "zod";
const patchSchema = z.object({
    status: z.string().min(1),
});
export function trackerRouter(store) {
    const router = Router();
    router.get("/", (_req, res) => {
        res.json(store.getTrackerRows());
    });
    router.patch("/:id/status", (req, res) => {
        const parsed = patchSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const ok = store.updateTrackerStatus(req.params.id, parsed.data.status);
        if (!ok)
            return res.status(404).json({ error: "Row not found" });
        return res.json({ ok: true });
    });
    return router;
}
