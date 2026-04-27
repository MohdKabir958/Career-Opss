import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { env, hasOpenAIKey } from "./env.js";
import { resolveRepoRoot } from "./services/repoPaths.js";
import { clerkAuthMiddleware, requireAuth } from "./middleware/auth.js";
import { errorHandler, notFound, requestLogger } from "./middleware/error.js";
import { meRouter } from "./routes/me.js";
import { resumesRouter } from "./routes/resumes.js";
import { evaluationsRouter } from "./routes/evaluations.js";
import { optimizationsRouter } from "./routes/optimizations.js";
import { roadmapsRouter } from "./routes/roadmaps.js";
import { scanRouter } from "./routes/scan.js";
import { portalsRouter } from "./routes/portals.js";
const app = express();
const repoRoot = resolveRepoRoot();
app.set("trust proxy", 1);
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use(cors({
    origin: env.ALLOWED_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
}));
app.use(express.json({ limit: "4mb" }));
app.use(requestLogger);
app.use(clerkAuthMiddleware);
app.get("/api/ping", (_req, res) => {
    res.json({
        ok: true,
        repoRoot,
        now: new Date().toISOString(),
        openAiConfigured: hasOpenAIKey(),
    });
});
const aiLimiter = rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/api/me", requireAuth, meRouter());
app.use("/api/resumes", requireAuth, resumesRouter());
app.use("/api/evaluations", requireAuth, aiLimiter, evaluationsRouter());
app.use("/api/optimizations", requireAuth, aiLimiter, optimizationsRouter());
app.use("/api/roadmaps", requireAuth, aiLimiter, roadmapsRouter());
app.use("/api/scan", requireAuth, scanRouter());
app.use("/api/portals", requireAuth, aiLimiter, portalsRouter());
const uiDist = path.join(repoRoot, "web", "ui", "dist");
app.use(express.static(uiDist));
app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(uiDist, "index.html"), (err) => {
        if (err)
            res.status(404).end();
    });
});
app.use("/api", notFound);
app.use(errorHandler);
app.listen(env.PORT, "127.0.0.1", () => {
    // eslint-disable-next-line no-console
    console.log(`career-ops web server listening at http://127.0.0.1:${env.PORT}`);
    if (!hasOpenAIKey()) {
        // eslint-disable-next-line no-console
        console.warn("[warn] OPENAI_API_KEY is not set. AI endpoints will return 503.");
    }
});
