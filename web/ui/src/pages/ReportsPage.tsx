import { useCallback, useEffect, useState } from "react";
import { useApi } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Markdown } from "../components/Markdown";
import { ScoreGauge } from "../components/ScoreGauge";
import { AtsDiff } from "../components/AtsDiff";
import { RoadmapView } from "../components/RoadmapView";
import type {
  EvaluationFull,
  EvaluationSummary,
  OptimizationFull,
  OptimizationSummary,
  RoadmapFull,
  RoadmapSummary,
} from "../types";

type Tab = "evaluations" | "optimizations" | "roadmaps";

export function ReportsPage() {
  const api = useApi();
  const [tab, setTab] = useState<Tab>("evaluations");
  const [evaluations, setEvaluations] = useState<EvaluationSummary[]>([]);
  const [optimizations, setOptimizations] = useState<OptimizationSummary[]>([]);
  const [roadmaps, setRoadmaps] = useState<RoadmapSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EvaluationFull | OptimizationFull | RoadmapFull | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [e, o, r] = await Promise.all([
        api.get<{ items: EvaluationSummary[] }>("/api/evaluations"),
        api.get<{ items: OptimizationSummary[] }>("/api/optimizations"),
        api.get<{ items: RoadmapSummary[] }>("/api/roadmaps"),
      ]);
      setEvaluations(e.items);
      setOptimizations(o.items);
      setRoadmaps(r.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [api]);

  useEffect(() => {
    void load();
    // pre-select from query string
    const params = new URLSearchParams(window.location.search);
    const evId = params.get("evaluation");
    const optId = params.get("optimization");
    const roadId = params.get("roadmap");
    if (evId) {
      setTab("evaluations");
      setSelectedId(evId);
    } else if (optId) {
      setTab("optimizations");
      setSelectedId(optId);
    } else if (roadId) {
      setTab("roadmaps");
      setSelectedId(roadId);
    }
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    if (!selectedId) return;
    (async () => {
      try {
        let url = "";
        if (tab === "evaluations") url = `/api/evaluations/${selectedId}`;
        else if (tab === "optimizations") url = `/api/optimizations/${selectedId}`;
        else url = `/api/roadmaps/${selectedId}`;
        const data = await api.get<EvaluationFull | OptimizationFull | RoadmapFull>(url);
        if (cancelled) return;
        setDetail(data);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load detail");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, selectedId, tab]);

  const list = tab === "evaluations" ? evaluations : tab === "optimizations" ? optimizations : roadmaps;

  return (
    <>
      <PageHeader title="Reports" description="Browse all your past evaluations, optimizations, and roadmaps." />
      {error && <div className="callout danger" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="row" style={{ marginBottom: 16, gap: 6 }}>
        {(["evaluations", "optimizations", "roadmaps"] as const).map((t) => (
          <button
            key={t}
            className={`button small ${tab === t ? "" : "secondary"}`}
            onClick={() => {
              setTab(t);
              setSelectedId(null);
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)} ({t === "evaluations" ? evaluations.length : t === "optimizations" ? optimizations.length : roadmaps.length})
          </button>
        ))}
      </div>

      <div className="grid-2" style={{ alignItems: "flex-start" }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{tab.charAt(0).toUpperCase() + tab.slice(1)}</h3>
          </div>
          {list.length === 0 ? (
            <div className="empty-state">No {tab} yet.</div>
          ) : (
            <div className="stack" style={{ gap: 0 }}>
              {tab === "evaluations" &&
                evaluations.map((it) => (
                  <RowItem
                    key={it.id}
                    selected={selectedId === it.id}
                    onClick={() => setSelectedId(it.id)}
                    onDelete={async () => {
                      await api.del(`/api/evaluations/${it.id}`);
                      if (selectedId === it.id) setSelectedId(null);
                      await load();
                    }}
                    primary={it.jobTitle || "Untitled job"}
                    secondary={it.score != null ? `Score ${it.score}/100` : it.archetype || ""}
                    date={it.createdAt}
                  />
                ))}
              {tab === "optimizations" &&
                optimizations.map((it) => (
                  <RowItem
                    key={it.id}
                    selected={selectedId === it.id}
                    onClick={() => setSelectedId(it.id)}
                    onDelete={async () => {
                      await api.del(`/api/optimizations/${it.id}`);
                      if (selectedId === it.id) setSelectedId(null);
                      await load();
                    }}
                    primary={`Optimization (ATS ${it.atsScore})`}
                    secondary="Click to view diff & rewrite"
                    date={it.createdAt}
                  />
                ))}
              {tab === "roadmaps" &&
                roadmaps.map((it) => (
                  <RowItem
                    key={it.id}
                    selected={selectedId === it.id}
                    onClick={() => setSelectedId(it.id)}
                    onDelete={async () => {
                      await api.del(`/api/roadmaps/${it.id}`);
                      if (selectedId === it.id) setSelectedId(null);
                      await load();
                    }}
                    primary={it.targetRole}
                    secondary="Career roadmap"
                    date={it.createdAt}
                  />
                ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Details</h3>
          </div>
          {!detail ? (
            <div className="empty-state">Pick an item on the left to view its details.</div>
          ) : tab === "evaluations" ? (
            <EvaluationDetail data={detail as EvaluationFull} />
          ) : tab === "optimizations" ? (
            <OptimizationDetail data={detail as OptimizationFull} />
          ) : (
            <RoadmapDetail data={detail as RoadmapFull} />
          )}
        </div>
      </div>
    </>
  );
}

function RowItem({
  primary,
  secondary,
  date,
  selected,
  onClick,
  onDelete,
}: {
  primary: string;
  secondary?: string;
  date: string;
  selected: boolean;
  onClick: () => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <div
      className="row"
      style={{
        padding: "10px 8px",
        borderTop: "1px solid var(--border)",
        cursor: "pointer",
        background: selected ? "rgba(99,102,241,0.08)" : "transparent",
        borderRadius: 8,
      }}
      onClick={onClick}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {primary}
        </div>
        {secondary && <div className="muted" style={{ fontSize: 12 }}>{secondary}</div>}
      </div>
      <div className="muted" style={{ fontSize: 12 }}>{new Date(date).toLocaleDateString()}</div>
      <button
        className="button ghost small"
        style={{ color: "var(--danger)" }}
        onClick={(e) => {
          e.stopPropagation();
          if (confirm("Delete this item?")) void onDelete();
        }}
      >
        Delete
      </button>
    </div>
  );
}

function EvaluationDetail({ data }: { data: EvaluationFull }) {
  return (
    <div className="stack">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <ScoreGauge value={data.score ?? 0} label="Compatibility" />
        <div className="stack" style={{ flex: 1, gap: 6, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{data.jobTitle || "Untitled job"}</div>
          <div className="row" style={{ gap: 6 }}>
            {data.archetype && <span className="badge info">{data.archetype}</span>}
            {data.legitimacy && <span className="badge">{data.legitimacy}</span>}
            <span className="muted" style={{ fontSize: 12 }}>{new Date(data.createdAt).toLocaleString()}</span>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>Resume: {data.resume?.name || "—"}</div>
        </div>
      </div>
      <div className="divider" />
      <div className="scroll-y" style={{ maxHeight: 540 }}>
        <Markdown>{data.reportMarkdown}</Markdown>
      </div>
    </div>
  );
}

function OptimizationDetail({ data }: { data: OptimizationFull }) {
  const [tab, setTab] = useState<"diff" | "preview">("diff");
  return (
    <div className="stack">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <ScoreGauge value={data.atsScore} label="ATS score" />
        <div className="stack" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>Missing keywords</div>
          <div className="tag-list">
            {data.missingKeywords.length === 0 ? (
              <span className="muted">None</span>
            ) : (
              data.missingKeywords.map((k, i) => <span key={i} className="badge warn">{k}</span>)
            )}
          </div>
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
      <div className="scroll-y" style={{ maxHeight: 540 }}>
        {tab === "diff" ? <AtsDiff changes={data.changes} /> : <Markdown>{data.optimizedMarkdown}</Markdown>}
      </div>
    </div>
  );
}

function RoadmapDetail({ data }: { data: RoadmapFull }) {
  if (!data.content) return <div className="empty-state">Roadmap content unavailable.</div>;
  return (
    <div className="stack">
      <div style={{ fontSize: 18, fontWeight: 700 }}>{data.targetRole}</div>
      <div className="muted" style={{ fontSize: 12 }}>{new Date(data.createdAt).toLocaleString()}</div>
      <div className="divider" />
      <div className="scroll-y" style={{ maxHeight: 600 }}>
        <RoadmapView content={data.content} />
      </div>
    </div>
  );
}
