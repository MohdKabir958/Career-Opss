import { useEffect, useMemo, useState } from "react";
import { useApi } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { ChipEditor } from "../components/ChipEditor";
import type {
  PortalsConfig,
  ResumeSummary,
  SuggestResponse,
} from "../types";

interface SaveResponse {
  ok: boolean;
  title_filter: { positive: string[]; negative: string[]; seniority_boost: string[] };
  savedAt: string;
}

function dedupeMerge(a: string[], b: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of [...a, ...b]) {
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export function TargetingPage() {
  const api = useApi();

  const [portals, setPortals] = useState<PortalsConfig | null>(null);
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [resumeId, setResumeId] = useState<string>("");
  const [targetRole, setTargetRole] = useState<string>("");

  const [positive, setPositive] = useState<string[]>([]);
  const [negative, setNegative] = useState<string[]>([]);
  const [originalPositive, setOriginalPositive] = useState<string[]>([]);
  const [originalNegative, setOriginalNegative] = useState<string[]>([]);

  const [suggestion, setSuggestion] = useState<SuggestResponse | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [openAiConfigured, setOpenAiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [me, p, rl] = await Promise.all([
          api.get<{ config: { openAiConfigured: boolean } }>("/api/me"),
          api.get<PortalsConfig>("/api/portals"),
          api.get<{ items: ResumeSummary[] }>("/api/resumes"),
        ]);
        setOpenAiConfigured(me.config.openAiConfigured);
        setPortals(p);
        setPositive(p.title_filter.positive);
        setNegative(p.title_filter.negative);
        setOriginalPositive(p.title_filter.positive);
        setOriginalNegative(p.title_filter.negative);
        setResumes(rl.items);
        const active = rl.items.find((r) => r.isActive);
        setResumeId(active?.id ?? rl.items[0]?.id ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load targeting config");
      }
    })();
  }, [api]);

  const dirty = useMemo(() => {
    if (positive.length !== originalPositive.length) return true;
    if (negative.length !== originalNegative.length) return true;
    const sameSet = (a: string[], b: string[]) =>
      a.every((v, i) => v.toLowerCase() === (b[i] ?? "").toLowerCase());
    return !(sameSet(positive, originalPositive) && sameSet(negative, originalNegative));
  }, [positive, negative, originalPositive, originalNegative]);

  async function suggest() {
    setSuggesting(true);
    setError(null);
    setSuggestion(null);
    try {
      const out = await api.post<SuggestResponse>("/api/portals/suggest", {
        resumeId: resumeId || undefined,
        targetRole: targetRole.trim() || undefined,
        mergeWithExisting: false,
      });
      setSuggestion(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suggestion failed");
    } finally {
      setSuggesting(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const out = await api.put<SaveResponse>("/api/portals/title-filter", {
        positive,
        negative,
        seniority_boost: portals?.title_filter.seniority_boost ?? [],
      });
      setOriginalPositive(out.title_filter.positive);
      setOriginalNegative(out.title_filter.negative);
      setPositive(out.title_filter.positive);
      setNegative(out.title_filter.negative);
      setSavedAt(out.savedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function resetChanges() {
    setPositive(originalPositive);
    setNegative(originalNegative);
  }

  function applyAllPositive() {
    if (!suggestion) return;
    setPositive((cur) => dedupeMerge(cur, suggestion.suggestion.positive));
  }
  function applyAllNegative() {
    if (!suggestion) return;
    setNegative((cur) => dedupeMerge(cur, suggestion.suggestion.negative));
  }
  function replaceWithSuggestion() {
    if (!suggestion) return;
    setPositive(suggestion.suggestion.positive);
    setNegative(suggestion.suggestion.negative);
  }
  function addPositiveChip(v: string) {
    setPositive((cur) => dedupeMerge(cur, [v]));
  }
  function addNegativeChip(v: string) {
    setNegative((cur) => dedupeMerge(cur, [v]));
  }

  const hasResumes = resumes.length > 0;

  return (
    <>
      <PageHeader
        title="Targeting & Filters"
        description="Tune the keywords the scanner uses to keep relevant titles and drop the rest. Changes are written to portals.yml."
        actions={
          <div className="row" style={{ gap: 8 }}>
            <button className="button secondary" onClick={resetChanges} disabled={!dirty || saving}>
              Reset
            </button>
            <button className="button" onClick={() => void save()} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save to portals.yml"}
            </button>
          </div>
        }
      />

      {error && <div className="callout danger" style={{ marginBottom: 16 }}>{error}</div>}
      {savedAt && !dirty && (
        <div className="callout success" style={{ marginBottom: 16 }}>
          Filters saved to <code>portals.yml</code>. Run the scanner to use the new keywords.
        </div>
      )}
      {openAiConfigured === false && (
        <div className="callout warn" style={{ marginBottom: 16 }}>
          OpenAI key isn't configured — manual editing still works, but "Suggest from my resume" needs <code>OPENAI_API_KEY</code> in <code>web/server/.env</code>.
        </div>
      )}

      <div className="targeting-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Your filter</h3>
              <p className="card-sub">
                Title must match at least one positive and zero negatives (case-insensitive).
              </p>
            </div>
            {portals && (
              <span className="badge info">
                {portals.enabledCompanies}/{portals.totalCompanies} companies tracked
              </span>
            )}
          </div>

          <div className="stack" style={{ gap: 14 }}>
            <div>
              <label className="label">
                Positive keywords <span className="chip-meta">— titles to include ({positive.length})</span>
              </label>
              <ChipEditor
                values={positive}
                onChange={setPositive}
                variant="positive"
                placeholder="e.g. AI Engineer, LLM, Solutions Architect…"
                ariaLabel="Positive keywords"
              />
            </div>

            <div>
              <label className="label">
                Negative keywords <span className="chip-meta">— titles to exclude ({negative.length})</span>
              </label>
              <ChipEditor
                values={negative}
                onChange={setNegative}
                variant="negative"
                placeholder="e.g. Junior, Intern, Embedded…"
                ariaLabel="Negative keywords"
              />
            </div>

            {portals && portals.title_filter.seniority_boost.length > 0 && (
              <div>
                <label className="label">Seniority boost (read-only)</label>
                <div className="tag-list">
                  {portals.title_filter.seniority_boost.map((s) => (
                    <span key={s} className="badge">{s}</span>
                  ))}
                </div>
                <div className="chip-meta" style={{ marginTop: 6 }}>
                  Edit these directly in <code>portals.yml</code> if you need to change boosting prefixes.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Suggest from my resume</h3>
              <p className="card-sub">
                AI reads your active resume + target role and proposes scanner-friendly title keywords.
              </p>
            </div>
          </div>

          <div className="stack" style={{ gap: 12 }}>
            <div>
              <label className="label">Resume</label>
              <select
                className="select"
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
                disabled={!hasResumes}
              >
                {!hasResumes && <option value="">— Upload a resume first —</option>}
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.isActive ? " (active)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Target role (optional)</label>
              <input
                className="input"
                placeholder="e.g. Senior AI Engineer, Solutions Architect, GenAI PM…"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
              <div className="chip-meta" style={{ marginTop: 6 }}>
                Leave blank to let AI infer from your resume.
              </div>
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                className="button"
                onClick={() => void suggest()}
                disabled={suggesting || !hasResumes || openAiConfigured === false}
              >
                {suggesting ? "Thinking…" : "Suggest filters"}
              </button>
            </div>

            {suggestion && (
              <div className="stack" style={{ gap: 12 }}>
                <div className="divider" />

                {suggestion.suggestion.detectedRoles.length > 0 && (
                  <div>
                    <div className="chip-meta" style={{ marginBottom: 4 }}>Detected from resume</div>
                    <div className="tag-list">
                      {suggestion.suggestion.detectedRoles.map((r) => (
                        <span key={r} className="badge info">{r}</span>
                      ))}
                    </div>
                  </div>
                )}

                {suggestion.suggestion.rationale && (
                  <div className="text-2" style={{ fontSize: 13 }}>
                    {suggestion.suggestion.rationale}
                  </div>
                )}

                <div>
                  <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="label" style={{ marginBottom: 0 }}>
                      Suggested positive ({suggestion.suggestion.positive.length})
                    </span>
                    <button className="button ghost small" onClick={applyAllPositive}>
                      Add all to positive
                    </button>
                  </div>
                  <div className="tag-list">
                    {suggestion.suggestion.positive.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="chip suggested positive"
                        onClick={() => addPositiveChip(v)}
                        title="Click to add"
                      >
                        + {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="label" style={{ marginBottom: 0 }}>
                      Suggested negative ({suggestion.suggestion.negative.length})
                    </span>
                    <button className="button ghost small" onClick={applyAllNegative}>
                      Add all to negative
                    </button>
                  </div>
                  <div className="tag-list">
                    {suggestion.suggestion.negative.map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="chip suggested negative"
                        onClick={() => addNegativeChip(v)}
                        title="Click to add"
                      >
                        + {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <button className="button secondary small" onClick={replaceWithSuggestion}>
                    Replace my filter with these
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
