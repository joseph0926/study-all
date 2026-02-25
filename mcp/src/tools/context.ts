import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { loadConfig, withResolvedPaths } from "../config.js";
import { makeEnvelope } from "../lib/envelope.js";
import type { Envelope, ResolvedContext } from "../types/contracts.js";
import { contextInputSchema, type ContextInput } from "../types/contracts.js";

const STRIP_SUFFIXES = ["-fork", ".js", ".dev", "-docs", "-source"];

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

function stripPunctuation(name: string): string {
  return name.replace(/[.\-_]/g, "").toLowerCase();
}

function stripSuffix(name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const suffix of STRIP_SUFFIXES) {
    if (lower.endsWith(suffix)) {
      return lower.slice(0, -suffix.length);
    }
  }
  return undefined;
}

function scoreCandidate(name: string, normalized: string): number {
  const lower = name.toLowerCase();
  let score = 0;

  if (lower === normalized) score += 1000;
  if (lower === `${normalized}-fork`) score += 600;
  if (lower === `${normalized}-source`) score += 550;
  if (lower.startsWith(`${normalized}-`)) score += 300;
  if (lower === `${normalized}.js`) score += 250;

  if (lower.includes("fork")) score += 50;
  if (lower.includes("source")) score += 40;
  if (lower.includes("docs")) score -= 120;
  if (lower.endsWith(".dev")) score -= 80;

  return score;
}

function pickBestCandidate(candidates: string[], normalized: string): string | undefined {
  if (candidates.length === 0) return undefined;
  return [...candidates].sort((a, b) => scoreCandidate(b, normalized) - scoreCandidate(a, normalized) || a.localeCompare(b))[0];
}

export async function scanRefDirs(refDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(refDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

async function detectSourceDir(refDir: string, skill?: string): Promise<string | undefined> {
  if (!skill) {
    return undefined;
  }

  const normalized = normalizeSkill(skill);

  // Priority 1: exact match
  const exact = path.join(refDir, normalized);
  if (await exists(exact)) {
    return exact;
  }

  const dirs = await scanRefDirs(refDir);

  // Priority 2: stripped-punctuation match ("nextjs" → "next.js")
  const normalizedStripped = stripPunctuation(normalized);
  const punctuationMatches = dirs.filter((dir) => stripPunctuation(dir) === normalizedStripped);
  const punctuationMatch = pickBestCandidate(punctuationMatches, normalized);
  if (punctuationMatch) {
    return path.join(refDir, punctuationMatch);
  }

  // Priority 3: suffix-stripped match ("react" → "react-fork")
  const suffixMatches: string[] = [];
  for (const dir of dirs) {
    const base = stripSuffix(dir);
    if (base && base === normalized) {
      suffixMatches.push(dir);
    }
  }
  const suffixMatch = pickBestCandidate(suffixMatches, normalized);
  if (suffixMatch) {
    return path.join(refDir, suffixMatch);
  }

  // Priority 4: prefix match ("react" → "react-anything")
  const prefixMatches = dirs.filter((dir) => dir.toLowerCase().startsWith(normalized));
  const prefixMatch = pickBestCandidate(prefixMatches, normalized);
  if (prefixMatch) {
    return path.join(refDir, prefixMatch);
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
  const notesDir = parsed.notesDir ? path.resolve(cfg.studyRoot, parsed.notesDir) : cfg.notesDir;
  const refDir = cfg.refDir;

  const skillNotesDir = skill ? path.join(notesDir, skill) : undefined;
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
    notesDir,
    refDir,
    skillsDir: cfg.skillsDir,
    studyLogsDir: cfg.studyLogsDir,
    skill,
    topic: parsed.topic,
    projectPath,
    skillNotesDir,
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
