const FEATURES: Array<{ icon: string; title: string; sub: string }> = [
  {
    icon: "✦",
    title: "AI job evaluation",
    sub: "7-block reports with score, archetype, and red-flag detection.",
  },
  {
    icon: "◈",
    title: "ATS optimization",
    sub: "Keyword scoring and tailored rewrites for every JD.",
  },
  {
    icon: "➤",
    title: "Personalized roadmap",
    sub: "3-phase plan with goals, projects, and weekly actions.",
  },
  {
    icon: "⌘",
    title: "Job scanner",
    sub: "Discover new offers from configured portals automatically.",
  },
];

export function AuthHero() {
  return (
    <aside className="auth-hero">
      <div className="auth-brand">
        <div className="brand-mark">CO</div>
        <div>
          <div className="brand-name">Career-Ops</div>
          <div className="brand-sub">Production Dashboard</div>
        </div>
      </div>

      <div>
        <h1>Run your job search like an operator.</h1>
        <p className="lead">
          Upload your resume once. Evaluate any JD, optimize for ATS, generate a personalized
          roadmap, and surface new opportunities — all in one workspace.
        </p>

        <div className="auth-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="auth-feature">
              <div className="dot" aria-hidden>{f.icon}</div>
              <div>
                <div className="ft-title">{f.title}</div>
                <div className="ft-sub">{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="footnote">
        Secured by Clerk · Your resume data stays on your local SQLite database.
      </div>
    </aside>
  );
}
