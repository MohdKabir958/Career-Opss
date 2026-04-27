import { chatComplete, safeJsonParse } from "./openai.js";

export interface KeywordSuggestion {
  positive: string[];
  negative: string[];
  rationale: string;
  detectedRoles: string[];
}

interface SuggesterOptions {
  resume: string;
  targetRole?: string;
  existingPositive?: string[];
  existingNegative?: string[];
  model?: string;
}

const SYSTEM_PROMPT = `You are a recruiting and search-keyword expert helping a candidate
configure a job-board scanner. Given a resume and an optional target role, you must
output short, scanner-friendly TITLE keywords that maximize relevant matches and
minimize noise.

Rules:
- Each keyword must be 1–4 words, useful in a job title (not in a job description).
- Prefer specific role titles, technologies, and seniority modifiers seen in real postings.
- "positive" keywords: titles the candidate should apply to. Include synonyms (e.g.,
  "AI Engineer", "ML Engineer", "Machine Learning Engineer", "GenAI", "LLM Engineer").
- "negative" keywords: roles to exclude (wrong stack, wrong seniority, wrong domain).
- Do NOT include generic words like "Senior" alone, or "Engineer" alone.
- Do NOT include locations or company names.
- Return STRICT JSON only — no markdown, no commentary.

JSON schema:
{
  "positive": string[],   // 12–25 items, ordered by relevance
  "negative": string[],   // 6–15 items
  "rationale": string,    // 2-3 sentences explaining the picks
  "detectedRoles": string[]  // 1–5 short role labels detected from the resume
}`;

function buildUserPrompt(opts: SuggesterOptions): string {
  const target = opts.targetRole?.trim();
  const trimmedResume = opts.resume.length > 8000 ? opts.resume.slice(0, 8000) : opts.resume;
  const exPos = (opts.existingPositive ?? []).slice(0, 30);
  const exNeg = (opts.existingNegative ?? []).slice(0, 30);

  const lines: string[] = [];
  lines.push("=== TARGET ROLE ===");
  lines.push(target && target.length > 0 ? target : "(not specified — infer from resume)");
  lines.push("");
  lines.push("=== EXISTING POSITIVE KEYWORDS (for reference) ===");
  lines.push(exPos.length > 0 ? exPos.join(", ") : "(none)");
  lines.push("");
  lines.push("=== EXISTING NEGATIVE KEYWORDS (for reference) ===");
  lines.push(exNeg.length > 0 ? exNeg.join(", ") : "(none)");
  lines.push("");
  lines.push("=== RESUME ===");
  lines.push(trimmedResume);
  lines.push("");
  lines.push(
    "Return only the JSON object as specified. Make 'positive' tightly aligned with the target role and resume strengths.",
  );
  return lines.join("\n");
}

export async function suggestTitleFilters(
  opts: SuggesterOptions,
): Promise<KeywordSuggestion> {
  const text = await chatComplete({
    model: opts.model,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(opts),
    temperature: 0.3,
    responseFormat: "json_object",
    maxTokens: 1200,
  });

  const parsed = safeJsonParse<{
    positive?: unknown;
    negative?: unknown;
    rationale?: unknown;
    detectedRoles?: unknown;
  }>(text);

  const dedupe = (arr: unknown): string[] => {
    if (!Array.isArray(arr)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of arr) {
      if (typeof v !== "string") continue;
      const trimmed = v.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
    return out;
  };

  return {
    positive: dedupe(parsed?.positive),
    negative: dedupe(parsed?.negative),
    rationale: typeof parsed?.rationale === "string" ? parsed.rationale : "",
    detectedRoles: dedupe(parsed?.detectedRoles),
  };
}
