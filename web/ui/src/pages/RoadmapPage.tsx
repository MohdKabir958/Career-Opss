import { useEffect, useState } from "react";
import { useApi } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { RoadmapView } from "../components/RoadmapView";
import type { ResumeSummary, RoadmapContent } from "../types";

interface RoadmapResponse {
  id: string;
  targetRole: string;
  inputJobDescription: string | null;
  contentJson: string;
  content: RoadmapContent;
  createdAt: string;
}

export function RoadmapPage() {
  const api = useApi();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [jd, setJd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoadmapResponse | null>(null);

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

  async function generate() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const out = await api.post<RoadmapResponse>("/api/roadmaps", {
        targetRole,
        jobDescription: jd || undefined,
        resumeId: resumeId || undefined,
      });
      setResult(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Roadmap generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Personalized roadmap"
        description="Generate a 3-phase plan to land a target role, tailored to your current resume."
      />
      {error && <div className="callout danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid-2">
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
              <label className="label">Target role</label>
              <input
                className="input"
                placeholder="e.g., Senior Data Engineer at a fintech"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>
          </div>
          <div className="stack">
            <label className="label">Reference job description (optional)</label>
            <textarea
              className="textarea"
              style={{ minHeight: 140 }}
              placeholder="Paste a JD that represents the role you want…"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
          </div>
        </div>
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
          <button
            className="button"
            onClick={() => void generate()}
            disabled={busy || targetRole.trim().length < 2 || !resumeId}
          >
            {busy ? "Generating…" : "Generate roadmap"}
          </button>
        </div>
      </div>

      {!result ? (
        <div className="empty-state">Generate a roadmap to see your personalized plan.</div>
      ) : (
        <RoadmapView content={result.content} />
      )}
    </>
  );
}
