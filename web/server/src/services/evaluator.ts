import { chatComplete } from "./openai.js";
import { __testables } from "./evaluatorTestables.js";

const { parseScore, parseArchetype, parseLegitimacy, parseJobTitle } = __testables;

export interface EvaluationResult {
  reportMarkdown: string;
  score: number | null;
  archetype: string | null;
  legitimacy: string | null;
  jobTitle: string | null;
}

const SYSTEM_PROMPT = `You are an expert career strategist who evaluates job opportunities for a candidate.
You ALWAYS return a thorough markdown report following EXACTLY this 7-block structure:

# Job Evaluation Report

## 1. Job Title and Company
Extract the job title (Title:) and company (Company:) from the description if present, otherwise infer.

## 2. Compatibility Score
A line "Score: NN/100" with a one-paragraph explanation.

## 3. Archetype Classification
A line "Archetype: <one of: Aspirational | Stretch | Match | Stable | Fallback | Risky>" with rationale.

## 4. Legitimacy Assessment
A line "Legitimacy: <Legit | Suspicious | Likely Scam>" with red/green flags as a bullet list.

## 5. Strengths Aligned with This Role
Bulleted strengths from the candidate's resume that match the JD.

## 6. Gaps and Risks
Concrete gaps, with severity (low/medium/high) and remediation suggestions.

## 7. Action Plan (Next 14 Days)
A numbered list of concrete steps the candidate should take to maximize chances if pursuing this role.`;

function buildUserPrompt(resume: string, jobDescription: string): string {
  return `## Candidate Resume\n\n${resume}\n\n---\n\n## Job Description\n\n${jobDescription}\n\n---\n\nProduce the full 7-block markdown report now. Be specific, quote exact phrases when relevant, and avoid generic advice.`;
}

export async function evaluateJob(opts: {
  resume: string;
  jobDescription: string;
  model?: string;
}): Promise<EvaluationResult> {
  const reportMarkdown = await chatComplete({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(opts.resume, opts.jobDescription),
    model: opts.model,
    temperature: 0.35,
  });

  return {
    reportMarkdown,
    score: parseScore(reportMarkdown),
    archetype: parseArchetype(reportMarkdown),
    legitimacy: parseLegitimacy(reportMarkdown),
    jobTitle: parseJobTitle(reportMarkdown, opts.jobDescription),
  };
}
