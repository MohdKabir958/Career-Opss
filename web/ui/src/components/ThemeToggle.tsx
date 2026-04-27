import { useTheme, type Theme } from "../lib/theme";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  const choose = (t: Theme) => () => setTheme(t);

  return (
    <div
      className="theme-toggle"
      role="radiogroup"
      aria-label="Theme"
      style={compact ? { padding: 2 } : undefined}
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === "light"}
        aria-label="Light theme"
        title="Light theme"
        className={theme === "light" ? "active" : ""}
        onClick={choose("light")}
      >
        <SunIcon />
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={theme === "dark"}
        aria-label="Dark theme"
        title="Dark theme"
        className={theme === "dark" ? "active" : ""}
        onClick={choose("dark")}
      >
        <MoonIcon />
      </button>
    </div>
  );
}
