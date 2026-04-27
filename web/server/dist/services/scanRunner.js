import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { resolveRepoRoot } from "./repoPaths.js";
import { __scanTestables } from "./scanRunnerTestables.js";
const { parseRowsFromMarkdown, parseRowsFromStdout } = __scanTestables;
export async function runScanScript() {
    const repoRoot = resolveRepoRoot();
    return new Promise((resolve) => {
        const child = spawn("npm", ["run", "scan"], {
            cwd: repoRoot,
            env: process.env,
            shell: true,
            stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (d) => {
            stdout += d.toString();
        });
        child.stderr.on("data", (d) => {
            stderr += d.toString();
        });
        child.on("close", (exitCode) => {
            const rows = [];
            const seen = new Set();
            const pipelinePath = path.join(repoRoot, "data", "pipeline.md");
            if (existsSync(pipelinePath)) {
                try {
                    const fileContent = readFileSync(pipelinePath, "utf8");
                    for (const r of parseRowsFromMarkdown(fileContent)) {
                        if (seen.has(r.url))
                            continue;
                        seen.add(r.url);
                        rows.push(r);
                    }
                }
                catch {
                    /* ignore */
                }
            }
            for (const r of parseRowsFromStdout(stdout)) {
                if (seen.has(r.url))
                    continue;
                seen.add(r.url);
                rows.push(r);
            }
            resolve({
                ok: exitCode === 0,
                exitCode: exitCode ?? -1,
                stdout,
                stderr,
                rows,
            });
        });
        child.on("error", (err) => {
            resolve({
                ok: false,
                exitCode: -1,
                stdout,
                stderr: stderr + (err.message || String(err)),
                rows: [],
            });
        });
    });
}
