import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
export class CommandRunner {
    repoRoot;
    jobs = new Map();
    emitter = new EventEmitter();
    constructor(repoRoot) {
        this.repoRoot = repoRoot;
    }
    createJob(spec) {
        const id = randomUUID();
        const job = {
            id,
            type: spec.type,
            command: spec.command,
            args: spec.args ?? [],
            createdAt: new Date().toISOString(),
            status: "queued",
            logs: [],
        };
        this.jobs.set(id, job);
        this.run(job);
        return job;
    }
    listJobs() {
        return Array.from(this.jobs.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    getJob(jobId) {
        return this.jobs.get(jobId);
    }
    onLogs(jobId, cb) {
        const eventName = `log:${jobId}`;
        this.emitter.on(eventName, cb);
        return () => this.emitter.off(eventName, cb);
    }
    appendLog(job, line) {
        job.logs.push(line);
        if (job.logs.length > 2000) {
            job.logs.shift();
        }
        this.emitter.emit(`log:${job.id}`, line);
    }
    run(job) {
        job.status = "running";
        job.startedAt = new Date().toISOString();
        const child = spawn(job.command, job.args, {
            cwd: this.repoRoot,
            env: process.env,
            shell: true,
            stdio: ["ignore", "pipe", "pipe"],
        });
        child.stdout.on("data", (chunk) => {
            this.appendLog(job, chunk.toString());
        });
        child.stderr.on("data", (chunk) => {
            this.appendLog(job, chunk.toString());
        });
        child.on("close", (exitCode) => {
            job.exitCode = exitCode ?? -1;
            job.endedAt = new Date().toISOString();
            job.status = exitCode === 0 ? "completed" : "failed";
            if (exitCode !== 0) {
                job.error = `Command failed with exit code ${exitCode}`;
            }
            this.appendLog(job, `\n[process-exit] ${job.exitCode}\n`);
        });
        child.on("error", (err) => {
            job.status = "failed";
            job.endedAt = new Date().toISOString();
            job.error = err.message;
            this.appendLog(job, `\n[process-error] ${err.message}\n`);
        });
    }
}
export function resolveRepoRoot() {
    let current = process.cwd();
    for (let i = 0; i < 6; i += 1) {
        if (existsSync(path.join(current, "gemini-eval.mjs")) && existsSync(path.join(current, "package.json"))) {
            return current;
        }
        const next = path.dirname(current);
        if (next === current)
            break;
        current = next;
    }
    return process.cwd();
}
