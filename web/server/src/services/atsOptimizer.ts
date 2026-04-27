import { chatComplete, safeJsonParse } from "./openai.js";
import { HttpError } from "../middleware/error.js";

export interface AtsChange {
  section: string;
  before: string;
  after: string;
  rationale: string;
}

export interface AtsOptimizationResult {
  atsScore: number;
  missingKeywords: string[];
  optimizedResumeMarkdown: string;
  changes: AtsChange[];
  summary: string;
}

const SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) optimizer.
You help candidates rewrite resumes to maximize ATS keyword match while staying truthful and natural.
You MUST respond in valid JSON matching this TypeScript interface:

interface AtsOptimizationResult {
  atsScore: number;            // 0-100 estimated ATS score AFTER optimization
  missingKeywords: string[];   // important keywords from the JD missing from the original resume
  optimizedResumeMarkdown: string; // FULL improved resume in markdown
  changes: Array<{
    section: string;           // section name (e.g. "Summary", "Experience: Acme Corp")
    before: string;            // original snippet
    after: string;             // rewritten snippet
    rationale: string;         // why this change matters for ATS
  }>;
  summary: string;             // 2-3 sentence summary of biggest improvements
}

Rules:
- Never invent jobs, dates, or qualifications. Only rewrite/reorder/highlight what is in the resume.
- Add missing keywords ONLY if they are truthful given the candidate's actual experience.
- Keep markdown structure clean: # Heading, ## Section, bullet lists.
- Output ONLY JSON, no commentary, no markdown fences.`;

function buildUserPrompt(resume: string, jobDescription: string): string {
  return `## Original Resume\n\n${resume}\n\n---\n\n## Target Job Description\n\n${jobDescription}\n\n---\n\nReturn the full optimization JSON now.`;
}

export async function optimizeForAts(opts: {
  resume: string;
  jobDescription: string;
  model?: string;
}): Promise<AtsOptimizationResult> {
  const raw = await chatComplete({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(opts.resume, opts.jobDescription),
    model: opts.model,
    temperature: 0.3,
    responseFormat: "json_object",
  });

  const parsed = safeJsonParse<AtsOptimizationResult>(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new HttpError(502, "ATS optimizer returned invalid JSON");
  }

  return {
    atsScore: Math.max(0, Math.min(100, Number(parsed.atsScore) || 0)),
    missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords.map(String) : [],
    optimizedResumeMarkdown: String(parsed.optimizedResumeMarkdown || ""),
    changes: Array.isArray(parsed.changes)
      ? parsed.changes.map((c) => ({
          section: String(c.section || ""),
          before: String(c.before || ""),
          after: String(c.after || ""),
          rationale: String(c.rationale || ""),
        }))
      : [],
    summary: String(parsed.summary || ""),
  };
}
