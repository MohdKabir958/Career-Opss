import { Router } from "express";
export function healthRouter(store, runner) {
    const router = Router();
    router.get("/summary", (_req, res) => {
        const reports = store.getReports();
        const tracker = store.getTrackerRows();
        const jobs = runner.listJobs();
        const running = jobs.filter((job) => job.status === "running").length;
        const failed = jobs.filter((job) => job.status === "failed").length;
        const completed = jobs.filter((job) => job.status === "completed").length;
        res.json({
            reportsCount: reports.length,
            trackerCount: tracker.length,
            runningJobs: running,
            failedJobs: failed,
            completedJobs: completed,
            lastRun: jobs[0]?.createdAt ?? null,
        });
    });
    return router;
}
