import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { ThemeToggle } from "../components/ThemeToggle";

const NAV: Array<{ to: string; label: string; icon: string; section?: string }> = [
  { to: "/", label: "Dashboard", icon: "▦", section: "Overview" },
  { to: "/resumes", label: "Resumes", icon: "▤", section: "Manage" },
  { to: "/evaluate", label: "Evaluate JD", icon: "✦", section: "AI" },
  { to: "/optimize", label: "ATS Optimize", icon: "◈" },
  { to: "/roadmap", label: "Roadmap", icon: "➤" },
  { to: "/scanner", label: "Job Scanner", icon: "⌘", section: "Discover" },
  { to: "/targeting", label: "Targeting", icon: "◎" },
  { to: "/reports", label: "Reports", icon: "❐" },
  { to: "/settings", label: "Settings", icon: "⚙", section: "Account" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="row" style={{ gap: 10 }}>
            <div className="brand-mark">CO</div>
            <div>
              <div className="brand-name">Career-Ops</div>
              <div className="brand-sub">Production Dashboard</div>
            </div>
          </div>
          <ThemeToggle compact />
        </div>

        <nav className="stack" style={{ gap: 2 }}>
          {NAV.map((item) => (
            <div key={item.to}>
              {item.section && <div className="nav-section">{item.section}</div>}
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
              >
                <span className="icon" aria-hidden>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <UserButton afterSignOutUrl="/sign-in" />
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>Account</div>
            <div className="muted" style={{ fontSize: 11.5 }}>Manage profile</div>
          </div>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
