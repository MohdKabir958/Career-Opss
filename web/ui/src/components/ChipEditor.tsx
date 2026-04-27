import { useState, type KeyboardEvent } from "react";

interface ChipEditorProps {
  values: string[];
  onChange: (next: string[]) => void;
  variant?: "positive" | "negative" | "neutral";
  placeholder?: string;
  ariaLabel?: string;
}

function dedupePush(values: string[], next: string): string[] {
  const trimmed = next.trim();
  if (!trimmed) return values;
  const lower = trimmed.toLowerCase();
  if (values.some((v) => v.toLowerCase() === lower)) return values;
  return [...values, trimmed];
}

export function ChipEditor({
  values,
  onChange,
  variant = "neutral",
  placeholder = "Type and press Enter…",
  ariaLabel,
}: ChipEditorProps) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    if (!draft.trim()) return;
    const segments = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    let next = values;
    for (const s of segments) next = dedupePush(next, s);
    onChange(next);
    setDraft("");
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (draft.trim()) {
        e.preventDefault();
        commitDraft();
      }
    } else if (e.key === "Backspace" && draft.length === 0 && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  function remove(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  const chipClass = variant === "neutral" ? "chip" : `chip ${variant}`;

  return (
    <div className="chip-editor" aria-label={ariaLabel}>
      {values.map((v) => (
        <span key={v} className={chipClass}>
          <span>{v}</span>
          <button
            type="button"
            className="x"
            aria-label={`Remove ${v}`}
            onClick={() => remove(v)}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="chip-input-field"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={commitDraft}
        placeholder={placeholder}
      />
    </div>
  );
}
