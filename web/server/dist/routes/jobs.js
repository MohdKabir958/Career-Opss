import { Router } from "express";
import path from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { globSync } from "glob";
import { z } from "zod";
import { summarizeDoctorOutput, summarizeVerifyOutput } from "../parsers/healthParser.js";
import { resolveRepoRoot } from "../services/commandRunner.js";
const evaluateSchema = z.object({
    jdText: z.string().min(10),
    provider: z.enum(["auto", "openai", "gemini"]).default("auto"),
    model: z.string().optional(),
});
const pdfSchema = z.object({
    inputHtml: z.string().optional(),
    outputPdf: z.string().optional(),
    format: z.enum(["a4", "letter"]).default("a4"),
});
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
export function jobsRouter(runner) {
    const router = Router();
    const repoRoot = resolveRepoRoot();
    router.post("/evaluate", (req, res) => {
        const parsed = evaluateSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { jdText, provider, model } = parsed.data;
        const args = ["run", "ai:eval", "--", "--provider", provider];
        if (model)
            args.push("--model", model);
        args.push(jdText);
        const job = runner.createJob({ type: "evaluate", command: "npm", args });
        return res.json(job);
    });
    router.post("/pdf", (req, res) => {
        const parsed = pdfSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const { format } = parsed.data;
        let inputHtml = parsed.data.inputHtml;
        let outputPdf = parsed.data.outputPdf;
        if (!inputHtml) {
            const htmlCandidates = globSync(path.join(repoRoot, "output", "*.html")).sort().reverse();
            inputHtml = htmlCandidates[0];
        }
        if (!inputHtml || !existsSync(inputHtml)) {
            return res.status(400).json({
                error: "No HTML input found for PDF generation. Provide inputHtml or generate an HTML CV first in output/.",
            });
        }
        if (!outputPdf) {
            const base = path.basename(inputHtml, ".html");
            outputPdf = path.join(repoRoot, "output", `${base}.pdf`);
        }
        const args = ["generate-pdf.mjs", inputHtml, outputPdf, `--format=${format}`];
        const job = runner.createJob({ type: "pdf", command: "node", args });
        return res.json(job);
    });
    router.post("/pdf/from-cv", (req, res) => {
        const parsed = pdfSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        const cvPath = path.join(repoRoot, "cv.md");
        if (!existsSync(cvPath)) {
            return res.status(400).json({ error: "cv.md not found. Add your resume first in Setup." });
        }
        const cvText = readFileSync(cvPath, "utf8").trim();
        if (!cvText) {
            return res.status(400).json({ error: "cv.md is empty. Add resume content before generating PDF." });
        }
        const outputDir = path.join(repoRoot, "output");
        mkdirSync(outputDir, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const generatedHtml = path.join(outputDir, `cv-from-markdown-${stamp}.html`);
        const escaped = escapeHtml(cvText);
        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Career-Ops CV</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 36px; color: #111; }
    .content { white-space: pre-wrap; line-height: 1.45; font-size: 12pt; }
  </style>
</head>
<body>
  <div class="content">${escaped}</div>
</body>
</html>`;
        writeFileSync(generatedHtml, html, "utf8");
        const outputPdf = parsed.data.outputPdf ||
            path.join(outputDir, `cv-from-markdown-${stamp}.pdf`);
        const args = ["generate-pdf.mjs", generatedHtml, outputPdf, `--format=${parsed.data.format}`];
        const job = runner.createJob({ type: "pdf", command: "node", args });
        return res.json(job);
    });
    const simpleCommands = {
        scan: ["run", "scan"],
        verify: ["run", "verify"],
        normalize: ["run", "normalize"],
        dedup: ["run", "dedup"],
        doctor: ["run", "doctor"],
        merge: ["run", "merge"],
        liveness: ["run", "liveness"],
        updateCheck: ["run", "update:check"],
        updateApply: ["run", "update"],
        rollback: ["run", "rollback"],
    };
    Object.entries(simpleCommands).forEach(([routeName, args]) => {
        router.post(`/${routeName}`, (_req, res) => {
            const job = runner.createJob({ type: routeName, command: "npm", args });
            res.json(job);
        });
    });
    router.get("/", (_req, res) => {
        res.json(runner.listJobs());
    });
    router.get("/:jobId", (req, res) => {
        const job = runner.getJob(req.params.jobId);
        if (!job)
            return res.status(404).json({ error: "Job not found" });
        let summary;
        const fullLog = job.logs.join("");
        if (job.type === "doctor")
            summary = summarizeDoctorOutput(fullLog);
        if (job.type === "verify")
            summary = summarizeVerifyOutput(fullLog);
        return res.json({ ...job, summary });
    });
    router.get("/:jobId/logs", (req, res) => {
        const job = runner.getJob(req.params.jobId);
        if (!job)
            return res.status(404).json({ error: "Job not found" });
        return res.json({ id: job.id, logs: job.logs });
    });
    return router;
}
