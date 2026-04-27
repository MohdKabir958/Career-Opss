import { useEffect, useState } from "react";
import { useApi } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Markdown } from "../components/Markdown";
import { ScoreGauge } from "../components/ScoreGauge";
import { AtsDiff } from "../components/AtsDiff";
import type { OptimizationFull, ResumeSummary } from "../types";

export function OptimizePage() {
  const api = useApi();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [resumeId, setResumeId] = useState<string>("");
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizationFull | null>(null);
  const [tab, setTab] = useState<"diff" | "preview">("diff");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ items: ResumeSummary[] }>("/api/resumes");
        setResumes(res.items);
        const active = res.items.find((r) => r.isActive);
        setResumeId(active?.id ?? res.items[0]?.id ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load resumes");
      }
    })();
  }, [api]);

  async function optimize() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const out = await api.post<OptimizationFull>("/api/optimizations", {
        jobDescription: jd,
        resumeId: resumeId || undefined,
      });
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Optimization failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (!result) return;
    setDownloading(true);
    setError(null);
    try {
      const out = await api.post<{ downloadUrl: string }>(
        `/api/optimizations/${result.id}/pdf`,
      );
      const url = out.downloadUrl.startsWith("http")
        ? out.downloadUrl
        : `${import.meta.env.VITE_API_URL || ""}${out.downloadUrl}`;
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to render PDF");
    } finally {
      setDownloading(false);
    }
  }

  function downloadMd() {
    if (!result) return;
    const blob = new Blob([result.optimizedMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "optimized-resume.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="ATS Optimize"
        description="Rewrite your resume for a specific job to maximize ATS keyword match."
      />
      {error && <div className="callout danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid-2" style={{ alignItems: "flex-start" }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Tailor resume to JD</h3>
          </div>
          <div className="stack">
            <div>
              <label className="label">Resume</label>
              <select className="select" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                {resumes.length === 0 && <option value="">— Upload one first —</option>}
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.isActive ? " (active)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Job description</label>
              <textarea
                className="textarea"
                placeholder="Paste the JD here…"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                className="button"
                onClick={() => void optimize()}
                disabled={busy || jd.trim().length < 20 || !resumeId}
              >
                {busy ? "Optimizing…" : "Run ATS optimizer"}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">ATS score & changes</h3>
            {result && (
              <div className="row" style={{ gap: 6 }}>
                <button
                  className="button small"
                  onClick={() => void downloadPdf()}
                  disabled={downloading}
                  title="Render the optimized resume as a clean, ATS-friendly PDF you can send to companies"
                >
                  {downloading ? "Rendering…" : "Download PDF"}
                </button>
                <button
                  className="button ghost small"
                  onClick={downloadMd}
                  title="Download the raw markdown source"
                >
                  .md
                </button>
              </div>
            )}
          </div>
          {!result ? (
            <div className="empty-state">Run optimizer to see ATS score, keywords, and rewrites.</div>
          ) : (
            <div className="stack">
              <div className="row" style={{ alignItems: "flex-start" }}>
                <ScoreGauge value={result.atsScore} label="ATS score" />
                <div className="stack" style={{ flex: 1, gap: 8, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>Missing keywords</div>
                  <div className="tag-list">
                    {result.missingKeywords.length === 0 ? (
                      <span className="muted">None — well-aligned.</span>
                    ) : (
                      result.missingKeywords.map((k, i) => (
                        <span key={i} className="badge warn">{k}</span>
                      ))
                    )}
                  </div>
                  {result.summary && <div className="text-2" style={{ fontSize: 13 }}>{result.summary}</div>}
                </div>
              </div>
              <div className="divider" />
              <div className="row" style={{ gap: 6 }}>
                <button className={`button small ${tab === "diff" ? "" : "secondary"}`} onClick={() => setTab("diff")}>
                  Changes
                </button>
                <button className={`button small ${tab === "preview" ? "" : "secondary"}`} onClick={() => setTab("preview")}>
                  Optimized preview
                </button>
              </div>
              <div className="scroll-y" style={{ maxHeight: 560 }}>
                {tab === "diff" ? (
                  <AtsDiff changes={result.changes} />
                ) : (
                  <Markdown>{result.optimizedMarkdown}</Markdown>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
