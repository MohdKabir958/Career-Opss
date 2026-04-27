import { useEffect, useState } from "react";
import { useApi } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Markdown } from "../components/Markdown";
import { ScoreGauge } from "../components/ScoreGauge";
import type { EvaluationFull, ResumeSummary } from "../types";

export function EvaluatePage() {
  const api = useApi();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [resumeId, setResumeId] = useState<string>("");
  const [model, setModel] = useState("");
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationFull | null>(null);

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

  async function evaluate() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const out = await api.post<EvaluationFull>("/api/evaluations", {
        jobDescription: jd,
        resumeId: resumeId || undefined,
        model: model || undefined,
      });
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Evaluate a job"
        description="Paste a job description and get a structured 7-block report against your resume."
      />
      {error && <div className="callout danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid-2" style={{ alignItems: "flex-start" }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">New evaluation</h3>
          </div>
          <div className="stack">
            <div>
              <label className="label">Resume</label>
              <select className="select" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                {resumes.length === 0 && <option value="">— No resumes — upload one first —</option>}
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.isActive ? " (active)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Model (optional)</label>
              <input
                className="input"
                placeholder="gpt-4o-mini (default)"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Job description</label>
              <textarea
                className="textarea"
                placeholder="Paste the full job description here…"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                className="button"
                onClick={() => void evaluate()}
                disabled={busy || jd.trim().length < 20 || !resumeId}
              >
                {busy ? "Evaluating…" : "Run evaluation"}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Result</h3>
            {result && (
              <span className="badge info">{result.provider}{result.model ? ` · ${result.model}` : ""}</span>
            )}
          </div>
          {!result ? (
            <div className="empty-state">Run an evaluation to see results here.</div>
          ) : (
            <div className="stack">
              {(() => {
                const derivedScore = result.score ?? parseScoreFromMarkdown(result.reportMarkdown) ?? 0;
                const derivedArchetype = cleanBadgeValue(result.archetype);
                const derivedLegitimacy = cleanBadgeValue(result.legitimacy);
                return (
                  <>
              <div className="row" style={{ alignItems: "flex-start" }}>
                <ScoreGauge value={derivedScore} label="Compatibility" />
                <div className="stack" style={{ gap: 6, flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{result.jobTitle || "Untitled job"}</div>
                  <div className="row" style={{ gap: 6 }}>
                    {derivedArchetype && <span className="badge info">{derivedArchetype}</span>}
                    {derivedLegitimacy && (
                      <span className={`badge ${legitClass(derivedLegitimacy)}`}>{derivedLegitimacy}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="divider" />
              <div className="scroll-y" style={{ maxHeight: 560 }}>
                <Markdown>{result.reportMarkdown}</Markdown>
              </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function legitClass(legit: string): string {
  const v = legit.toLowerCase();
  if (v.includes("scam")) return "danger";
  if (v.includes("susp")) return "warn";
  return "success";
}

function parseScoreFromMarkdown(markdown: string): number | null {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1");
  const match =
    plain.match(/(?:compatibility\s*)?score\s*[:\-]\s*(\d{1,3})\s*\/\s*100/i) ||
    plain.match(/\b(\d{1,3})\s*\/\s*100\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function cleanBadgeValue(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[*_`]+/g, "").trim();
  return cleaned || null;
}
