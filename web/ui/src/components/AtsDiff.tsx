import type { OptimizationChange } from "../types";

export function AtsDiff({ changes }: { changes: OptimizationChange[] }) {
  if (!changes || changes.length === 0) {
    return <div className="muted">No structural changes were proposed.</div>;
  }
  return (
    <div className="stack">
      {changes.map((c, idx) => (
        <div key={idx} className="card" style={{ padding: 16 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div style={{ fontWeight: 600 }}>{c.section || `Change ${idx + 1}`}</div>
            <span className="badge info">edit</span>
          </div>
          <div className="grid-2" style={{ marginTop: 10, gap: 10 }}>
            <div>
              <div className="label">Before</div>
              <div
                className="mono"
                style={{
                  background: "var(--danger-bg)",
                  borderRadius: 8,
                  padding: 10,
                  color: "var(--danger-fg)",
                  whiteSpace: "pre-wrap",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                {c.before || "—"}
              </div>
            </div>
            <div>
              <div className="label">After</div>
              <div
                className="mono"
                style={{
                  background: "var(--success-bg)",
                  borderRadius: 8,
                  padding: 10,
                  color: "var(--success-fg)",
                  whiteSpace: "pre-wrap",
                  border: "1px solid rgba(34,197,94,0.25)",
                }}
              >
                {c.after || "—"}
              </div>
            </div>
          </div>
          {c.rationale && (
            <div className="muted" style={{ marginTop: 10, fontSize: 12.5 }}>
              <strong style={{ color: "var(--text-2)" }}>Why:</strong> {c.rationale}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
