import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import type { PortalsConfig, ScanResult } from "../types";

interface ScanRunResponse {
  ok: boolean;
  exitCode: number;
  rowsParsed: number;
  rowsPersisted: number;
  stdout: string;
  stderr: string;
}

export function ScannerPage() {
  const api = useApi();
  const [items, setItems] = useState<ScanResult[]>([]);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<ScanRunResponse | null>(null);
  const [portals, setPortals] = useState<PortalsConfig | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ items: ScanResult[] }>("/api/scan/results");
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load scan results");
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    (async () => {
      try {
        const p = await api.get<PortalsConfig>("/api/portals");
        setPortals(p);
      } catch {
        /* ignore — Targeting page surfaces this error */
      }
    })();
  }, [api]);

  async function runScan() {
    setBusy(true);
    setError(null);
    setLastRun(null);
    try {
      const out = await api.post<ScanRunResponse>("/api/scan/run");
      setLastRun(out);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scanner failed");
    } finally {
      setBusy(false);
    }
  }

  const visible = items.filter((it) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return [it.title, it.company, it.location, it.source].some((v) => (v || "").toLowerCase().includes(q));
  });

  return (
    <>
      <PageHeader
        title="Job Scanner"
        description="Discover new offers from configured portals (uses scan.mjs under the hood)."
        actions={
          <div className="row" style={{ gap: 8 }}>
            <Link to="/targeting" className="button secondary">Tune filters</Link>
            <button className="button" onClick={() => void runScan()} disabled={busy}>
              {busy ? "Scanning…" : "Run scanner"}
            </button>
          </div>
        }
      />
      {portals && (
        <div className="callout info" style={{ marginBottom: 16 }}>
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              Scanning <strong>{portals.enabledCompanies}</strong> of {portals.totalCompanies} tracked companies, with{" "}
              <strong>{portals.title_filter.positive.length}</strong> positive and{" "}
              <strong>{portals.title_filter.negative.length}</strong> negative title keywords.
            </div>
            <Link to="/targeting" className="button ghost small">Personalize from resume →</Link>
          </div>
        </div>
      )}
      {error && <div className="callout danger" style={{ marginBottom: 16 }}>{error}</div>}
      {lastRun && (
        <div className={`callout ${lastRun.ok ? "info" : "danger"}`} style={{ marginBottom: 16 }}>
          <div>
            Scan finished — parsed <strong>{lastRun.rowsParsed}</strong> rows, persisted{" "}
            <strong>{lastRun.rowsPersisted}</strong>.
            {!lastRun.ok && <span> Exit code {lastRun.exitCode}.</span>}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Latest opportunities ({visible.length})</h3>
            <p className="card-sub">Click a row to open the offer in a new tab</p>
          </div>
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="Filter by title, company, location…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        {visible.length === 0 ? (
          <div className="empty-state">No scan results yet. Hit "Run scanner" above.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Source</th>
                  <th style={{ width: 100 }}>Date</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((it) => (
                  <tr key={it.id}>
                    <td style={{ fontWeight: 600 }}>{it.title}</td>
                    <td>{it.company}</td>
                    <td className="muted">{it.location || "—"}</td>
                    <td className="muted">{it.source || "—"}</td>
                    <td className="muted">{new Date(it.createdAt).toLocaleDateString()}</td>
                    <td>
                      <a className="button ghost small" href={it.url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
