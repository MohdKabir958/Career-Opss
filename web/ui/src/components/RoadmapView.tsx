import type { RoadmapContent } from "../types";

export function RoadmapView({ content }: { content: RoadmapContent }) {
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Executive summary</h3>
        </div>
        <div className="text-2" style={{ whiteSpace: "pre-wrap" }}>{content.summary || "—"}</div>
      </div>

      {content.gaps?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top gaps</h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {content.gaps.map((g, i) => <li key={i}>{g}</li>)}
          </ul>
        </div>
      )}

      <div className="grid-2">
        {(content.phases || []).map((phase, idx) => (
          <div key={idx} className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">{phase.name || `Phase ${idx + 1}`}</h3>
                <div className="card-sub">{phase.durationWeeks || 4} weeks</div>
              </div>
              <span className="badge info">Phase {idx + 1}</span>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              <Section title="Goals" items={phase.goals} />
              <Section title="Projects" items={phase.projects} />
              <Section title="Certifications" items={phase.certifications} />
              <Section title="Tasks" items={phase.tasks} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">First-week actions</h3>
          </div>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {(content.firstWeekActions || []).map((a, i) => <li key={i}>{a}</li>)}
          </ol>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Networking moves</h3>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {(content.networkingMoves || []).map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="label">{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}
