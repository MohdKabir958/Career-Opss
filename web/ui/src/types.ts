export interface MeResponse {
  userId: string;
  email: string | null;
  counts: {
    resumes: number;
    evaluations: number;
    optimizations: number;
    roadmaps: number;
    scanResults: number;
  };
  activeResume: { id: string; name: string; updatedAt: string } | null;
  config: { openAiConfigured: boolean };
}

export interface ResumeSummary {
  id: string;
  name: string;
  sourceFileName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeFull extends ResumeSummary {
  content: string;
}

export interface EvaluationSummary {
  id: string;
  jobTitle: string | null;
  score: number | null;
  archetype: string | null;
  legitimacy: string | null;
  provider: string;
  model: string | null;
  createdAt: string;
  resumeId: string;
}

export interface EvaluationFull extends EvaluationSummary {
  jobDescription: string;
  reportMarkdown: string;
  resume: { id: string; name: string };
}

export interface OptimizationSummary {
  id: string;
  atsScore: number;
  createdAt: string;
  resumeId: string;
}

export interface OptimizationChange {
  section: string;
  before: string;
  after: string;
  rationale: string;
}

export interface OptimizationFull extends OptimizationSummary {
  jobDescription: string;
  optimizedMarkdown: string;
  missingKeywords: string[];
  changes: OptimizationChange[];
  summary?: string;
  resume: { id: string; name: string; content: string };
}

export interface RoadmapPhase {
  name: string;
  durationWeeks: number;
  goals: string[];
  projects: string[];
  certifications: string[];
  tasks: string[];
}

export interface RoadmapContent {
  summary: string;
  gaps: string[];
  phases: RoadmapPhase[];
  networkingMoves: string[];
  firstWeekActions: string[];
}

export interface RoadmapSummary {
  id: string;
  targetRole: string;
  createdAt: string;
}

export interface RoadmapFull extends RoadmapSummary {
  inputJobDescription: string | null;
  content: RoadmapContent | null;
}

export interface ScanResult {
  id: string;
  company: string;
  title: string;
  url: string;
  location: string | null;
  source: string | null;
  createdAt: string;
}

export interface TitleFilter {
  positive: string[];
  negative: string[];
  seniority_boost: string[];
}

export interface TrackedCompany {
  name: string;
  careers_url?: string;
  api?: string;
  scan_method?: string;
  scan_query?: string;
  notes?: string;
  enabled?: boolean;
}

export interface PortalsConfig {
  title_filter: TitleFilter;
  tracked_companies: TrackedCompany[];
  totalCompanies: number;
  enabledCompanies: number;
  searchQueriesCount: number;
}

export interface KeywordSuggestion {
  positive: string[];
  negative: string[];
  rationale: string;
  detectedRoles: string[];
}

export interface SuggestResponse {
  ok: boolean;
  resumeId: string;
  resumeName: string;
  targetRole: string | null;
  suggestion: KeywordSuggestion;
  existing: TitleFilter;
}
