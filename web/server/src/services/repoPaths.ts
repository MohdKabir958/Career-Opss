import { existsSync } from "node:fs";
import path from "node:path";

export function resolveRepoRoot(): string {
  let current = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    if (
      existsSync(path.join(current, "gemini-eval.mjs")) &&
      existsSync(path.join(current, "package.json"))
    ) {
      return current;
    }
    const next = path.dirname(current);
    if (next === current) break;
    current = next;
  }
  return process.cwd();
}

export function userStorageDir(repoRoot: string, userId: string): string {
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(repoRoot, "web", "server", "storage", safe);
}
