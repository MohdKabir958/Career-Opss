import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { resolveRepoRoot, userStorageDir } from "./repoPaths.js";

marked.setOptions({
  gfm: true,
  breaks: false,
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const RESUME_CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
body {
  font-family: 'Calibri', 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.45;
  color: #1a1a1a;
  padding: 36px 44px 36px 44px;
}
.resume { max-width: 100%; }
.resume > *:first-child { margin-top: 0; }

h1 {
  font-size: 22pt;
  font-weight: 700;
  letter-spacing: 0.4px;
  margin: 0 0 4px 0;
  color: #0f172a;
  page-break-after: avoid;
}

h1 + p,
h1 + blockquote {
  margin-top: 0;
  font-size: 10pt;
  color: #475569;
}

h2 {
  font-size: 10.5pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.6px;
  color: #0f172a;
  margin: 18px 0 6px 0;
  padding: 0 0 4px 0;
  border-bottom: 1px solid #cbd5e1;
  page-break-after: avoid;
}

h3 {
  font-size: 11.5pt;
  font-weight: 600;
  margin: 10px 0 2px 0;
  color: #111827;
  page-break-after: avoid;
}

h4 {
  font-size: 10.5pt;
  font-weight: 600;
  margin: 6px 0 2px 0;
  color: #1f2937;
  page-break-after: avoid;
}

p { margin: 4px 0; }
ul, ol { margin: 4px 0 8px 0; padding-left: 18px; }
li { margin: 2px 0; }
li > p { margin: 0; }
li > ul, li > ol { margin: 2px 0 2px 0; }

strong { font-weight: 600; color: #0f172a; }
em { color: #334155; font-style: italic; }

a { color: #1d4ed8; text-decoration: none; }
a:hover { text-decoration: underline; }

hr {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 12px 0;
}

blockquote {
  border-left: 3px solid #e5e7eb;
  margin: 6px 0;
  padding: 0 0 0 10px;
  color: #475569;
}

code {
  font-family: 'Consolas', 'Menlo', 'Courier New', monospace;
  font-size: 9.5pt;
  background: #f3f4f6;
  padding: 1px 4px;
  border-radius: 3px;
  color: #111;
}

pre {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 9.5pt;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  page-break-inside: avoid;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 6px 0;
  page-break-inside: avoid;
}
th, td {
  border: 1px solid #e5e7eb;
  padding: 4px 8px;
  font-size: 10pt;
  text-align: left;
  vertical-align: top;
}
th { background: #f8fafc; font-weight: 600; }

/* Avoid awkward orphan headings near a page break */
h1, h2, h3, h4 { page-break-after: avoid; }
img { max-width: 100%; }

/* Subtle "tagline" support: bold text right after H1 reads like a role line */
h1 + p strong { color: #0f172a; }
`;

function renderMarkdownToHtml(markdown: string): string {
  const trimmed = (markdown ?? "").trim();
  if (!trimmed) return "";
  try {
    return marked.parse(trimmed, { async: false }) as string;
  } catch {
    return `<pre>${escapeHtml(trimmed)}</pre>`;
  }
}

function buildHtmlDocument(opts: { title: string; markdown: string }): string {
  const body = renderMarkdownToHtml(opts.markdown);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(opts.title)}</title>
  <style>${RESUME_CSS}</style>
</head>
<body>
  <main class="resume">
${body}
  </main>
</body>
</html>`;
}

export interface PdfRenderResult {
  ok: boolean;
  exitCode: number;
  outputPdf: string;
  htmlPath: string;
  stdout: string;
  stderr: string;
}

interface RenderOptions {
  userId: string;
  /** Used as filename + storage namespace (e.g. "resume", "optimization"). */
  namespace: string;
  /** Stable id for this render — typically the resumeId or optimizationId. */
  id: string;
  markdown: string;
  /** PDF document title (fallback "Resume"). */
  documentTitle?: string;
  format?: "a4" | "letter";
}

export async function renderMarkdownPdf(opts: RenderOptions): Promise<PdfRenderResult> {
  const repoRoot = resolveRepoRoot();
  const userDir = userStorageDir(repoRoot, opts.userId);
  mkdirSync(userDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeNs = opts.namespace.replace(/[^a-zA-Z0-9_-]/g, "_") || "resume";
  const safeId = opts.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  const baseName = `${safeNs}-${safeId}-${stamp}`;
  const htmlPath = path.join(userDir, `${baseName}.html`);
  const pdfPath = path.join(userDir, `${baseName}.pdf`);

  const html = buildHtmlDocument({
    title: opts.documentTitle ?? "Resume",
    markdown: opts.markdown,
  });
  writeFileSync(htmlPath, html, "utf8");

  return new Promise((resolve) => {
    const args = [
      "generate-pdf.mjs",
      htmlPath,
      pdfPath,
      `--format=${opts.format ?? "a4"}`,
    ];
    const child = spawn("node", args, {
      cwd: repoRoot,
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    child.on("close", (exitCode) => {
      resolve({
        ok: exitCode === 0,
        exitCode: exitCode ?? -1,
        outputPdf: pdfPath,
        htmlPath,
        stdout,
        stderr,
      });
    });

    child.on("error", (err) => {
      resolve({
        ok: false,
        exitCode: -1,
        outputPdf: pdfPath,
        htmlPath,
        stdout,
        stderr: stderr + (err.message || String(err)),
      });
    });
  });
}

export async function renderResumePdf(opts: {
  userId: string;
  resumeId: string;
  resumeMarkdown: string;
  format?: "a4" | "letter";
  documentTitle?: string;
}): Promise<PdfRenderResult> {
  return renderMarkdownPdf({
    userId: opts.userId,
    namespace: "resume",
    id: opts.resumeId,
    markdown: opts.resumeMarkdown,
    documentTitle: opts.documentTitle ?? "Resume",
    format: opts.format,
  });
}
