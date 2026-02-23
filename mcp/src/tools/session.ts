import path from "node:path";
import { z } from "zod";
import { MemoryCache, buildCacheKey } from "../lib/cache.js";
import { appendText, getDirSnapshot, listFiles, readText, toTitleCaseTopic } from "../lib/fs.js";
import { makeEnvelope } from "../lib/envelope.js";
import { getResumePoint } from "../parsers/session-parser.js";
import { resolveContextData } from "./context.js";
import type { Clock } from "../lib/clock.js";
import { systemClock } from "../lib/clock.js";
import type { CacheMeta, ContextInput, Envelope } from "../types/contracts.js";
import type { SessionResumePoint } from "../types/domain.js";

const cache = new MemoryCache();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PARSER_VERSION = "1.0.0";

const contextSchema = z.object({
  mode: z.enum(["skill", "project"]),
  skill: z.string().optional(),
  topic: z.string().optional(),
  projectPath: z.string().optional(),
  docsDir: z.string().optional(),
  studyDir: z.string().optional(),
});

const resumeInputSchema = z.object({
  context: contextSchema,
  skill: z.string().optional(),
  topic: z.string(),
});

const appendInputSchema = z.object({
  context: contextSchema,
  skill: z.string().optional(),
  topic: z.string(),
  content: z.string(),
});

const sourcePathInputSchema = z.object({
  context: contextSchema,
  skill: z.string().optional(),
});

async function resolveTopicFile(baseDir: string, topic: string): Promise<string> {
  const direct = topic.endsWith(".md") ? topic : `${topic}.md`;
  const candidateA = path.join(baseDir, direct);
  const candidateB = path.join(baseDir, `${toTitleCaseTopic(topic)}.md`);

  const files = await listFiles(baseDir, { extension: ".md", maxDepth: 1 });
  const map = new Map(files.map((file) => [path.basename(file).toLowerCase(), file]));

  const normalizedA = path.basename(candidateA).toLowerCase();
  const normalizedB = path.basename(candidateB).toLowerCase();

  return map.get(normalizedA) ?? map.get(normalizedB) ?? candidateB;
}

function resolveSessionDir(context: Awaited<ReturnType<typeof resolveContextData>>, skillOverride?: string): string {
  if (context.mode === "project") {
    return context.studyDir!;
  }

  const skill = skillOverride ?? context.skill;
  if (!skill) {
    throw new Error("skill is required for skill mode");
  }

  return path.join(context.docsDir, skill);
}

async function getCachedSourcePaths(sourceDir: string): Promise<{ files: string[]; cacheMeta: CacheMeta }> {
  const snapshot = await getDirSnapshot(sourceDir, {
    maxDepth: 4,
    ignoreDirs: ["node_modules", ".git", "dist", "build", ".next"],
  });
  const cacheKey = buildCacheKey(sourceDir, {
    ...snapshot,
    parserVersion: PARSER_VERSION,
  });

  const cached = cache.get<string[]>(cacheKey);
  if (cached) {
    return {
      files: cached,
      cacheMeta: { hit: true, key: cacheKey },
    };
  }

  const files = await listFiles(sourceDir, { maxDepth: 3, ignoreDirs: ["node_modules", ".git", "dist", "build", ".next"] });
  cache.set(cacheKey, files, CACHE_TTL_MS);
  return {
    files,
    cacheMeta: { hit: false, key: cacheKey, invalidatedReason: "cold-start" },
  };
}

export async function sessionGetResumePoint(
  input: z.input<typeof resumeInputSchema>,
): Promise<Envelope<SessionResumePoint>> {
  const parsed = resumeInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);
  const dir = resolveSessionDir(context, parsed.skill);
  const file = await resolveTopicFile(dir, parsed.topic);
  const text = await readText(file);
  const resume = getResumePoint(text);
  return makeEnvelope(resume);
}

export async function sessionAppendLog(
  input: z.input<typeof appendInputSchema>,
  clock: Clock = systemClock,
): Promise<Envelope<{ ok: boolean; filePath: string }>> {
  const parsed = appendInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);
  const dir = resolveSessionDir(context, parsed.skill);
  const file = await resolveTopicFile(dir, parsed.topic);
  const today = clock.now().toISOString().slice(0, 10);
  const marker = context.mode === "project" ? "via /project-learn" : "via /learn";

  const payload = `\n\n---\n\n## ${today} (${marker})\n\n${parsed.content.trim()}\n`;
  await appendText(file, payload);

  return makeEnvelope({
    ok: true,
    filePath: file,
  });
}

export async function sessionGetSourcePaths(
  input: z.input<typeof sourcePathInputSchema>,
): Promise<Envelope<{ sourceDir: string; docsDir: string; files: string[] }>> {
  const parsed = sourcePathInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);

  const sourceDir = context.sourceDir ?? context.projectPath;
  if (!sourceDir) {
    throw new Error("sourceDir not found");
  }

  const { files, cacheMeta } = await getCachedSourcePaths(sourceDir);

  return makeEnvelope(
    {
      sourceDir,
      docsDir: context.mode === "project" ? context.studyDir! : path.join(context.docsDir, parsed.skill ?? context.skill ?? ""),
      files,
    },
    undefined,
    cacheMeta,
  );
}

export const sessionSchemas = {
  getResumePoint: resumeInputSchema,
  appendLog: appendInputSchema,
  getSourcePaths: sourcePathInputSchema,
};
