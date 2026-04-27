import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import type {
  EvaluationSummary,
  MeResponse,
  OptimizationSummary,
  RoadmapSummary,
  ScanResult,
} from "../types";

export function DashboardPage() {
  const api = useApi();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [recentEvals, setRecentEvals] = useState<EvaluationSummary[]>([]);
  const [recentOpts, setRecentOpts] = useState<OptimizationSummary[]>([]);
  const [recentRoads, setRecentRoads] = useState<RoadmapSummary[]>([]);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [meRes, evalRes, optRes, roadRes, scanRes] = await Promise.all([
          api.get<MeResponse>("/api/me"),
          api.get<{ items: EvaluationSummary[] }>("/api/evaluations"),
          api.get<{ items: OptimizationSummary[] }>("/api/optimizations"),
          api.get<{ items: RoadmapSummary[] }>("/api/roadmaps"),
          api.get<{ items: ScanResult[] }>("/api/scan/results"),
        ]);
        if (cancelled) return;
        setMe(meRes);
        setRecentEvals(evalRes.items.slice(0, 5));
        setRecentOpts(optRes.items.slice(0, 5));
        setRecentRoads(roadRes.items.slice(0, 5));
        setRecentScans(scanRes.items.slice(0, 6));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const counts = me?.counts ?? { resumes: 0, evaluations: 0, optimizations: 0, roadmaps: 0, scanResults: 0 };

  return (
    <>
      <PageHeader
        title={`Welcome back${me?.email ? `, ${me.email.split("@")[0]}` : ""}`}
        description="Your AI-powered career operations workspace."
        actions={<Link to="/resumes" className="button">Manage resumes</Link>}
      />

      {error && <div className="callout danger" style={{ marginBottom: 16 }}>{error}</div>}

      {me && !me.config.openAiConfigured && (
        <div className="callout warn" style={{ marginBottom: 16 }}>
          <div>
            <strong>OpenAI key not configured.</strong> Add <span className="kbd">OPENAI_API_KEY</span> to{" "}
            <span className="kbd">web/server/.env</span> to enable evaluation, ATS optimization, and roadmaps.
          </div>
        </div>
      )}

      {me && counts.resumes === 0 && (
        <div className="callout info" style={{ marginBottom: 16 }}>
          <div>
            <strong>Upload your first resume</strong> to unlock all AI features.{" "}
            <Link to="/resumes" style={{ textDecoration: "underline" }}>Go to Resumes →</Link>
          </div>
        </div>
      )}

      <div className="grid-stats">
        <Stat label="Resumes" value={counts.resumes} foot={me?.activeResume ? `Active: ${me.activeResume.name}` : "No active resume"} />
        <Stat label="Evaluations" value={counts.evaluations} foot="Job-fit reports" />
        <Stat label="ATS Optimizations" value={counts.optimizations} foot="Tailored rewrites" />
        <Stat label="Roadmaps" value={counts.roadmaps} foot="Personalized plans" />
        <Stat label="Scanned offers" value={counts.scanResults} foot="From job portals" />
      </div>

      <div className="grid-2">
        <Recent title="Recent evaluations" emptyHint="No evaluations yet" items={recentEvals.map((e) => ({
          id: e.id,
          primary: e.jobTitle || "Untitled job",
          secondary: e.score != null ? `Score ${e.score}/100` : (e.archetype || ""),
          date: e.createdAt,
          to: `/reports?evaluation=${e.id}`,
        }))} viewAll={{ to: "/reports", label: "All reports" }} />

        <Recent title="ATS optimizations" emptyHint="No optimizations yet" items={recentOpts.map((o) => ({
          id: o.id,
          primary: `ATS score ${o.atsScore}`,
          secondary: "Open to view diff & rewrite",
          date: o.createdAt,
          to: `/reports?optimization=${o.id}`,
        }))} viewAll={{ to: "/optimize", label: "Run optimizer" }} />

        <Recent title="Roadmaps" emptyHint="No roadmaps yet" items={recentRoads.map((r) => ({
          id: r.id,
          primary: r.targetRole,
          secondary: "Open roadmap",
          date: r.createdAt,
          to: `/reports?roadmap=${r.id}`,
        }))} viewAll={{ to: "/roadmap", label: "Generate roadmap" }} />

        <Recent title="Scanner — latest matches" emptyHint="Run scanner to find new offers" items={recentScans.map((s) => ({
          id: s.id,
          primary: s.title,
          secondary: `${s.company}${s.location ? ` · ${s.location}` : ""}`,
          date: s.createdAt,
          to: s.url,
          external: true,
        }))} viewAll={{ to: "/scanner", label: "Open scanner" }} />
      </div>
    </>
  );
}

function Stat({ label, value, foot }: { label: string; value: number; foot?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

interface RecentItem {
  id: string;
  primary: string;
  secondary?: string;
  date: string;
  to: string;
  external?: boolean;
}

function Recent({
  title,
  items,
  emptyHint,
  viewAll,
}: {
  title: string;
  items: RecentItem[];
  emptyHint: string;
  viewAll: { to: string; label: string };
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
        </div>
        <Link to={viewAll.to} className="button ghost small">{viewAll.label}</Link>
      </div>
      {items.length === 0 ? (
        <div className="muted" style={{ fontSize: 13 }}>{emptyHint}</div>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {items.map((item) => (
            <div key={item.id} className="row" style={{ justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.primary}</div>
                {item.secondary && <div className="muted" style={{ fontSize: 12 }}>{item.secondary}</div>}
              </div>
              <div className="muted" style={{ fontSize: 11.5 }}>{new Date(item.date).toLocaleDateString()}</div>
              {item.external ? (
                <a href={item.to} target="_blank" rel="noreferrer" className="button ghost small">Open</a>
              ) : (
                <Link to={item.to} className="button ghost small">Open</Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
