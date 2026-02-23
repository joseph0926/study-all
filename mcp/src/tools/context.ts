import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { loadConfig, withResolvedPaths } from "../config.js";
import { makeEnvelope } from "../lib/envelope.js";
import type { Envelope, ResolvedContext } from "../types/contracts.js";
import { contextInputSchema, type ContextInput } from "../types/contracts.js";

const sourceCandidateSuffixes = [
  "-fork",
  "",
  ".js",
  ".dev",
  "-docs",
  "-source",
];

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase();
}

async function detectSourceDir(refDir: string, skill?: string): Promise<string | undefined> {
  if (!skill) {
    return undefined;
  }

  const normalized = normalizeSkill(skill);
  const directCandidates = new Set<string>([normalized]);

  if (normalized === "nextjs") {
    directCandidates.add("next.js");
  }
  if (normalized === "react") {
    directCandidates.add("react-fork");
  }

  for (const base of directCandidates) {
    for (const suffix of sourceCandidateSuffixes) {
      const candidate = path.join(refDir, `${base}${suffix}`);
      if (await exists(candidate)) {
        return candidate;
      }
    }
  }

  return undefined;
}

export async function resolveContextData(input: ContextInput): Promise<ResolvedContext> {
  const parsed = contextInputSchema.parse(input);
  const cfg = loadConfig();

  if (parsed.mode === "skill" && !parsed.skill) {
    throw new Error("mode=skill requires skill");
  }
  if (parsed.mode === "project" && !parsed.projectPath) {
    throw new Error("mode=project requires projectPath");
  }

  const skill = parsed.skill ? normalizeSkill(parsed.skill) : undefined;
  const docsDir = parsed.docsDir ? path.resolve(cfg.studyRoot, parsed.docsDir) : cfg.docsDir;
  const refDir = cfg.refDir;

  const skillDocsDir = skill ? path.join(docsDir, skill) : undefined;
  const projectPath = parsed.projectPath ? path.resolve(parsed.projectPath) : undefined;
  const studyDir =
    parsed.mode === "project"
      ? parsed.studyDir
        ? path.resolve(parsed.studyDir)
        : path.join(projectPath!, ".study")
      : undefined;

  const sourceDir = await detectSourceDir(refDir, skill);

  return withResolvedPaths({
    mode: parsed.mode,
    studyRoot: cfg.studyRoot,
    docsDir,
    refDir,
    skillsDir: cfg.skillsDir,
    studyLogsDir: cfg.studyLogsDir,
    skill,
    topic: parsed.topic,
    projectPath,
    skillDocsDir,
    studyDir,
    sourceDir,
  });
}

export const contextResolveInputSchema = contextInputSchema;

export type ContextResolveOutput = { context: ResolvedContext };

export async function contextResolve(input: z.input<typeof contextResolveInputSchema>): Promise<Envelope<ContextResolveOutput>> {
  const context = await resolveContextData(input);
  return makeEnvelope({ context });
}
