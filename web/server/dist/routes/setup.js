import { Router } from "express";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import multer from "multer";
import pdfParse from "pdf-parse";
import { z } from "zod";
import { resolveRepoRoot } from "../services/commandRunner.js";
const cvSchema = z.object({
    content: z.string().min(20),
});
function repoPath(...parts) {
    return path.join(resolveRepoRoot(), ...parts);
}
function getSetupStatus() {
    const files = {
        env: existsSync(repoPath(".env")),
        cv: existsSync(repoPath("cv.md")),
        profile: existsSync(repoPath("config", "profile.yml")),
        portals: existsSync(repoPath("portals.yml")),
    };
    return {
        files,
        ready: Object.values(files).every(Boolean),
    };
}
export function setupRouter() {
    const router = Router();
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
    });
    router.get("/status", (_req, res) => {
        res.json(getSetupStatus());
    });
    router.post("/bootstrap", (_req, res) => {
        const profileTarget = repoPath("config", "profile.yml");
        const portalsTarget = repoPath("portals.yml");
        if (!existsSync(profileTarget)) {
            copyFileSync(repoPath("config", "profile.example.yml"), profileTarget);
        }
        if (!existsSync(portalsTarget)) {
            copyFileSync(repoPath("templates", "portals.example.yml"), portalsTarget);
        }
        if (!existsSync(repoPath("cv.md"))) {
            writeFileSync(repoPath("cv.md"), "# Your Name\n\n## Professional Summary\n\nAdd your summary here.\n\n## Skills\n\n- SQL\n- Python\n", "utf8");
        }
        res.json(getSetupStatus());
    });
    router.get("/cv", (_req, res) => {
        const cvPath = repoPath("cv.md");
        if (!existsSync(cvPath)) {
            return res.status(404).json({ error: "cv.md not found" });
        }
        const content = readFileSync(cvPath, "utf8");
        return res.json({ content });
    });
    router.put("/cv", (req, res) => {
        const parsed = cvSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.flatten() });
        }
        writeFileSync(repoPath("cv.md"), parsed.data.content, "utf8");
        return res.json({ ok: true });
    });
    router.post("/cv/upload", upload.single("file"), async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        const { originalname, mimetype, buffer } = req.file;
        const ext = path.extname(originalname).toLowerCase();
        let content = "";
        try {
            if (ext === ".pdf" || mimetype === "application/pdf") {
                const parsed = await pdfParse(buffer);
                const extracted = parsed.text?.trim();
                if (!extracted) {
                    return res.status(400).json({ error: "Could not extract text from PDF" });
                }
                content = `# Imported Resume\n\n_Source: ${originalname}_\n\n${extracted}\n`;
            }
            else {
                content = buffer.toString("utf8");
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Failed to parse uploaded file";
            return res.status(400).json({ error: message });
        }
        if (content.trim().length < 20) {
            return res.status(400).json({ error: "Uploaded file content is too short" });
        }
        writeFileSync(repoPath("cv.md"), content, "utf8");
        return res.json({ ok: true, length: content.length, source: originalname });
    });
    return router;
}
