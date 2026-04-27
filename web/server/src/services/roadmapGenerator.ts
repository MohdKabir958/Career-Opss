import { chatComplete, safeJsonParse } from "./openai.js";
import { HttpError } from "../middleware/error.js";

export interface RoadmapPhase {
  name: string;
  durationWeeks: number;
  goals: string[];
  projects: string[];
  certifications: string[];
  tasks: string[];
}

export interface RoadmapResult {
  summary: string;
  gaps: string[];
  phases: RoadmapPhase[];
  networkingMoves: string[];
  firstWeekActions: string[];
}

const SYSTEM_PROMPT = `You are a senior career coach. You build personalized roadmaps to help candidates land target roles.
You MUST respond in valid JSON matching this TypeScript interface:

interface RoadmapResult {
  summary: string;             // 3-5 sentence executive summary
  gaps: string[];              // top skill/experience gaps
  phases: Array<{
    name: string;              // e.g. "Phase 1: Foundations"
    durationWeeks: number;
    goals: string[];
    projects: string[];
    certifications: string[];
    tasks: string[];
  }>;
  networkingMoves: string[];
  firstWeekActions: string[];  // 5-7 concrete actions for week 1
}

Rules:
- Always produce 3 phases (Foundations, Build, Land).
- Tasks must be concrete and time-bound where reasonable.
- Output ONLY JSON, no markdown fences, no commentary.`;

function buildUserPrompt(resume: string, targetRole: string, jobDescription?: string): string {
  return `## Target Role\n\n${targetRole}\n\n## Candidate Resume\n\n${resume}\n\n${
    jobDescription ? `## Reference Job Description\n\n${jobDescription}\n\n` : ""
  }Generate the personalized roadmap JSON now.`;
}

export async function generateRoadmap(opts: {
  resume: string;
  targetRole: string;
  jobDescription?: string;
  model?: string;
}): Promise<RoadmapResult> {
  const raw = await chatComplete({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(opts.resume, opts.targetRole, opts.jobDescription),
    model: opts.model,
    temperature: 0.5,
    responseFormat: "json_object",
  });

  const parsed = safeJsonParse<RoadmapResult>(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new HttpError(502, "Roadmap generator returned invalid JSON");
  }

  const phases = Array.isArray(parsed.phases) ? parsed.phases : [];
  return {
    summary: String(parsed.summary || ""),
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps.map(String) : [],
    phases: phases.map((p) => ({
      name: String(p?.name || ""),
      durationWeeks: Math.max(1, Number(p?.durationWeeks) || 4),
      goals: Array.isArray(p?.goals) ? p.goals.map(String) : [],
      projects: Array.isArray(p?.projects) ? p.projects.map(String) : [],
      certifications: Array.isArray(p?.certifications) ? p.certifications.map(String) : [],
      tasks: Array.isArray(p?.tasks) ? p.tasks.map(String) : [],
    })),
    networkingMoves: Array.isArray(parsed.networkingMoves) ? parsed.networkingMoves.map(String) : [],
    firstWeekActions: Array.isArray(parsed.firstWeekActions)
      ? parsed.firstWeekActions.map(String)
      : [],
  };
}
