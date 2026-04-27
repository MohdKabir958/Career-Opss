import { useCallback, useEffect, useState } from "react";
import { useApi } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { ResumeUploader } from "../components/ResumeUploader";
import { Markdown } from "../components/Markdown";
import type { ResumeFull, ResumeSummary } from "../types";

export function ResumesPage() {
  const api = useApi();
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ResumeFull | null>(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ items: ResumeSummary[] }>("/api/resumes");
      setResumes(res.items);
      if (!selectedId && res.items[0]) setSelectedId(res.items[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load resumes");
    }
  }, [api, selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedId) {
      setSelected(null);
      return;
    }
    (async () => {
      try {
        const r = await api.get<ResumeFull>(`/api/resumes/${selectedId}`);
        if (cancelled) return;
        setSelected(r);
        setEditName(r.name);
        setEditContent(r.content);
        setEditMode(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load resume");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, selectedId]);

  async function activate(id: string) {
    setBusy(true);
    try {
      await api.post(`/api/resumes/${id}/activate`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to activate");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this resume? This cannot be undone.")) return;
    setBusy(true);
    try {
      await api.del(`/api/resumes/${id}`);
      if (selectedId === id) setSelectedId(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await api.put<ResumeFull>(`/api/resumes/${selected.id}`, {
        name: editName,
        content: editContent,
      });
      setSelected(updated);
      setEditMode(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await api.post<{ downloadUrl: string }>(`/api/resumes/${selected.id}/pdf`);
      const url = res.downloadUrl.startsWith("http")
        ? res.downloadUrl
        : `${import.meta.env.VITE_API_URL || ""}${res.downloadUrl}`;
      window.open(url, "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to render PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Resumes"
        description="Upload, edit, and switch between multiple resume versions. The active resume is used by AI features by default."
      />
      {error && <div className="callout danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid-2" style={{ alignItems: "flex-start" }}>
        <div className="stack">
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Upload a resume</h3>
                <p className="card-sub">PDF, Markdown, or plain text</p>
              </div>
            </div>
            <ResumeUploader onUploaded={async (r) => {
              setSelectedId(r.id);
              await refresh();
            }} />
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Your resumes ({resumes.length})</h3>
                <p className="card-sub">Click to view, set active, or delete</p>
              </div>
            </div>
            {resumes.length === 0 ? (
              <div className="empty-state">No resumes yet. Upload one to get started.</div>
            ) : (
              <div className="stack" style={{ gap: 0 }}>
                {resumes.map((r) => (
                  <div
                    key={r.id}
                    className="row"
                    style={{
                      padding: "10px 8px",
                      borderTop: "1px solid var(--border)",
                      cursor: "pointer",
                      background: selectedId === r.id ? "rgba(99,102,241,0.08)" : "transparent",
                      borderRadius: 8,
                    }}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.name}
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        Updated {new Date(r.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    {r.isActive && <span className="badge success">Active</span>}
                    {!r.isActive && (
                      <button
                        className="button ghost small"
                        onClick={(e) => {
                          e.stopPropagation();
                          void activate(r.id);
                        }}
                        disabled={busy}
                      >
                        Set active
                      </button>
                    )}
                    <button
                      className="button ghost small"
                      onClick={(e) => {
                        e.stopPropagation();
                        void remove(r.id);
                      }}
                      disabled={busy}
                      style={{ color: "var(--danger)" }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">{selected ? selected.name : "Resume preview"}</h3>
              <p className="card-sub">
                {selected ? `Updated ${new Date(selected.updatedAt).toLocaleString()}` : "Select a resume to view"}
              </p>
            </div>
            {selected && (
              <div className="row" style={{ gap: 6 }}>
                <button className="button secondary small" onClick={() => setEditMode((v) => !v)} disabled={busy}>
                  {editMode ? "Cancel" : "Edit"}
                </button>
                <button className="button small" onClick={() => void downloadPdf()} disabled={busy}>
                  Download PDF
                </button>
              </div>
            )}
          </div>
          {!selected ? (
            <div className="empty-state">Pick a resume on the left to preview it.</div>
          ) : editMode ? (
            <div className="stack">
              <label className="label">Name</label>
              <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <label className="label">Content (markdown)</label>
              <textarea
                className="textarea"
                style={{ minHeight: 360 }}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button className="button" onClick={() => void save()} disabled={busy}>
                  Save changes
                </button>
              </div>
            </div>
          ) : (
            <div className="scroll-y" style={{ maxHeight: 560 }}>
              <Markdown>{selected.content}</Markdown>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
