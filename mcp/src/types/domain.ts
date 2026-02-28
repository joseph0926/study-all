import type { ReviewLevel, ReviewScore } from "./contracts.js";

export type CoverageStatus = "covered" | "uncovered" | "orphan";

export interface CoverageRow {
  status: CoverageStatus;
  module: string;
  target: string;
}

export interface PlanStep {
  name: string;
  done: boolean;
}

export interface PlanTopic {
  id: string;
  name: string;
  module: string;
  status: CoverageStatus;
  sourceFiles: number;
  docsFile?: string | undefined;
  steps: PlanStep[];
  completionRate: number;
}

export interface PlanPhase {
  name: string;
  description?: string | undefined;
  topics: PlanTopic[];
}

export interface PlanData {
  skill: string;
  description: string;
  coverage: {
    total: number;
    covered: number;
    uncovered: number;
    rate: number;
  };
  coverageRows: CoverageRow[];
  phases: PlanPhase[];
  topicDocsMapping: Record<string, string>;
}

export interface SessionResumePoint {
  exists: boolean;
  lastStep?: string | undefined;
  lastDate?: string | undefined;
  completedSteps: string[];
  totalSteps: number;
  pendingSteps: string[];
  summary: string;
}

export interface ModuleInfo {
  name: string;
  dir: string;
  fileCount: number;
  files: string[];
  entryPoints: string[];
}

export interface ModuleMapResult {
  sourceDir: string;
  modules: ModuleInfo[];
}

export interface CoverageMapResult {
  covered: string[];
  uncovered: string[];
  orphanRefs: string[];
}

export interface QnAItem {
  concept: string;
  question: string;
  userAnswer: string;
  hint?: string;
  score: ReviewScore;
  level: ReviewLevel;
}

export interface ReviewConcept {
  name: string;
  level: ReviewLevel;
  streak: number;
  nextReview: string;
  graduated: boolean;
  attempts: number;
}

export interface ReviewMeta {
  topic: string;
  concepts: ReviewConcept[];
  sessionCount: number;
}

export interface ReviewQueueItem {
  skill: string;
  topic: string;
  concept: string;
  level: ReviewLevel;
  nextReview?: string | undefined;
  lastReview?: string | undefined;
  streak: number;
  overdueDays: number;
}

export interface DashboardSkill {
  name: string;
  totalTopics: number;
  completedTopics: number;
  progressRate: number;
  coverageRate: number;
  lastActivity?: string | undefined;
  reviewPending: number;
  graduated: number;
}

export interface DashboardData {
  skills: DashboardSkill[];
  recentSessions: Array<{ date: string; skill: string; topic: string }>;
  streak: number;
  totalReviewPending: number;
}

export interface SourceDigestEntry {
  path: string;
  type: "file" | "dir";
  size?: number;
}

export interface SourceDigest {
  sourceDir: string;
  tree: SourceDigestEntry[];
  overview: string;
  existingTopics: string[];
}

export interface RoutineLogSummary {
  exists: boolean;
  topic: string | null;
  currentPhase: number;
  qaCount: number;
  entryCount: number;
  entries: Record<string, unknown>[];
  lastTs: string | null;
  checkpointResult: "PASS" | "FAIL" | "PENDING" | null;
  phaseSummaries: Array<{ phase: number; summary: string }>;
  codingResult: { challenge: string; result: string } | null;
  elapsedMinutes: number | null;
}

export interface ExtractTranscriptResult {
  ok: boolean;
  transcriptPath: string;
  sessionFiles: string[];
  messageCount: number;
  client: "claude-code" | "codex";
}
