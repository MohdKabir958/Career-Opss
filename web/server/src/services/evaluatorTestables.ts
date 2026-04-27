function normalizeMarkdownText(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1");
}

function parseScore(markdown: string): number | null {
  const normalized = normalizeMarkdownText(markdown);
  const match =
    normalized.match(/(?:compatibility\s*)?score\s*[:\-]\s*(\d{1,3})\s*\/\s*100/i) ||
    normalized.match(/\b(\d{1,3})\s*\/\s*100\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function parseArchetype(markdown: string): string | null {
  const normalized = normalizeMarkdownText(markdown);
  const match = normalized.match(/Archetype\s*[:\-]\s*([^\n\r]+)/i);
  if (!match) return null;
  return match[1]
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ")
    .replace(/[.,;:]+$/, "");
}

function parseLegitimacy(markdown: string): string | null {
  const normalized = normalizeMarkdownText(markdown);
  const match = normalized.match(/Legitimacy\s*[:\-]\s*([^\n\r]+)/i);
  if (!match) return null;
  return match[1]
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ")
    .replace(/[.,;:]+$/, "");
}

function parseJobTitle(markdown: string, jobDescription: string): string | null {
  const normalized = normalizeMarkdownText(markdown);
  const fromReport = normalized.match(/Title\s*[:\-]\s*([^\n]+)/i);
  if (fromReport) return fromReport[1].trim().slice(0, 200);
  const fromJD = jobDescription.match(/(?:title|role|position)[:\-]\s*([^\n]+)/i);
  if (fromJD) return fromJD[1].trim().slice(0, 200);
  const firstLine = jobDescription.split("\n").find((l) => l.trim().length > 0);
  return firstLine ? firstLine.trim().slice(0, 200) : null;
}

export const __testables = { parseScore, parseArchetype, parseLegitimacy, parseJobTitle };
