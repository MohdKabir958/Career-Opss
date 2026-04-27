import { Router } from "express";
export function reportsRouter(store) {
    const router = Router();
    router.get("/", (_req, res) => {
        const reports = store.getReports();
        res.json(reports);
    });
    router.get("/:name", (req, res) => {
        const content = store.getReportContent(req.params.name);
        if (content == null)
            return res.status(404).json({ error: "Report not found" });
        return res.json({ name: req.params.name, content });
    });
    return router;
}
