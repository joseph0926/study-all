import path from "node:path";
import os from "node:os";
import type { ResolvedContext } from "./types/contracts.js";

export interface AppConfig {
  studyRoot: string;
  docsDir: string;
  refDir: string;
  skillsDir: string;
  studyLogsDir: string;
}

export function expandHome(input: string): string {
  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return input;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rawRoot = env.STUDY_ROOT;
  if (!rawRoot) {
    throw new Error("STUDY_ROOT environment variable is required");
  }
  const studyRoot = expandHome(rawRoot);
  return {
    studyRoot,
    docsDir: env.DOCS_DIR ? path.resolve(studyRoot, env.DOCS_DIR) : path.join(studyRoot, "study"),
    refDir: env.REF_DIR ? path.resolve(studyRoot, env.REF_DIR) : path.join(studyRoot, "ref"),
    skillsDir: expandHome(env.SKILLS_DIR ?? "~/.claude/skills"),
    studyLogsDir: expandHome(env.STUDY_LOGS_DIR ?? "~/.claude/study-logs"),
  };
}

export function withResolvedPaths(context: ResolvedContext): ResolvedContext {
  return {
    ...context,
    docsDir: path.resolve(context.docsDir),
    refDir: path.resolve(context.refDir),
    skillsDir: path.resolve(context.skillsDir),
    studyRoot: path.resolve(context.studyRoot),
    studyLogsDir: path.resolve(context.studyLogsDir),
    skillDocsDir: context.skillDocsDir ? path.resolve(context.skillDocsDir) : undefined,
    studyDir: context.studyDir ? path.resolve(context.studyDir) : undefined,
    sourceDir: context.sourceDir ? path.resolve(context.sourceDir) : undefined,
    projectPath: context.projectPath ? path.resolve(context.projectPath) : undefined,
  };
}
