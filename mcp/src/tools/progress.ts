import path from "node:path";
import { z } from "zod";
import { MemoryCache, buildCacheKey } from "../lib/cache.js";
import { makeEnvelope } from "../lib/envelope.js";
import { getDirSnapshot, listFiles, readText, writeText } from "../lib/fs.js";
import { buildModuleMap } from "../parsers/module-map.js";
import { parsePlan } from "../parsers/plan-parser.js";
import { resolveContextData } from "./context.js";
import type { CoverageMapResult, ModuleMapResult, PlanData, PlanTopic } from "../types/domain.js";
import type { CacheMeta, Envelope, ContextInput } from "../types/contracts.js";

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

const planInputSchema = z.object({
  context: contextSchema,
  skill: z.string().optional(),
});

const nextTopicInputSchema = z.object({
  context: contextSchema,
  skill: z.string().optional(),
});

const updateCheckboxInputSchema = z.object({
  context: contextSchema,
  skill: z.string().optional(),
  topic: z.string(),
  step: z.string(),
  done: z.boolean(),
});

const moduleMapInputSchema = z.object({
  context: contextSchema,
  skill: z.string().optional(),
  sourceDir: z.string().optional(),
});

const coverageMapInputSchema = z.object({
  context: contextSchema,
  skill: z.string().optional(),
  sourceDir: z.string().optional(),
  refsDir: z.string().optional(),
});

function resolvePlanPath(context: Awaited<ReturnType<typeof resolveContextData>>, skillOverride?: string): string {
  if (context.mode === "project") {
    return path.join(context.studyDir!, "plan.md");
  }
  const skill = (skillOverride ?? context.skill)!;
  return path.join(context.docsDir, skill, "plan.md");
}

function flattenTopics(plan: PlanData): PlanTopic[] {
  return plan.phases.flatMap((phase) => phase.topics);
}

function pickNextTopic(plan: PlanData): {
  topic: string;
  step: string;
  phase: string;
  estimatedTime: string;
  sourceFiles: number;
} {
  for (const phase of plan.phases) {
    for (const topic of phase.topics) {
      const pending = topic.steps.find((step) => !step.done);
      if (pending) {
        return {
          topic: topic.name,
          step: pending.name,
          phase: phase.name,
          estimatedTime: "40-60min",
          sourceFiles: topic.sourceFiles,
        };
      }
    }
  }

  const fallback = flattenTopics(plan)[0];
  return {
    topic: fallback?.name ?? "",
    step: fallback?.steps[0]?.name ?? "",
    phase: plan.phases[0]?.name ?? "",
    estimatedTime: "40-60min",
    sourceFiles: fallback?.sourceFiles ?? 0,
  };
}

function replaceCheckboxInRange(lines: string[], start: number, end: number, step: string, done: boolean): boolean {
  for (let i = start; i < end; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const match = line.match(/^(\s*-\s+)\[(x|X|\s)\](\s+.+)$/);
    if (!match) continue;
    const captured = match[3];
    if (!captured || !captured.toLowerCase().includes(step.trim().toLowerCase())) {
      continue;
    }
    const marker = done ? "x" : " ";
    lines[i] = `${match[1]}[${marker}]${captured}`;
    return true;
  }
  return false;
}

async function getCachedModuleMap(sourceDir: string): Promise<{ value: ModuleMapResult; cacheMeta: CacheMeta }> {
  const snapshot = await getDirSnapshot(sourceDir, {
    maxDepth: 3,
    ignoreDirs: ["node_modules", ".git", "dist", "build", ".next"],
  });
  const cacheKey = buildCacheKey(sourceDir, {
    ...snapshot,
    parserVersion: PARSER_VERSION,
  });

  const cached = cache.get<ModuleMapResult>(cacheKey);
  if (cached) {
    return {
      value: cached,
      cacheMeta: {
        hit: true,
        key: cacheKey,
      },
    };
  }

  const value = await buildModuleMap(sourceDir);
  cache.set(cacheKey, value, CACHE_TTL_MS);

  return {
    value,
    cacheMeta: {
      hit: false,
      key: cacheKey,
      invalidatedReason: "cold-start",
    },
  };
}

export async function progressGetPlan(input: z.input<typeof planInputSchema>): Promise<Envelope<PlanData>> {
  const parsed = planInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);
  const skill = parsed.skill ?? context.skill ?? path.basename(context.projectPath ?? context.studyDir ?? "project");
  const planPath = resolvePlanPath(context, parsed.skill);
  const markdown = await readText(planPath);
  const plan = parsePlan(markdown, skill);
  return makeEnvelope(plan);
}

export async function progressGetNextTopic(
  input: z.input<typeof nextTopicInputSchema>,
): Promise<Envelope<{ topic: string; step: string; phase: string; estimatedTime: string; sourceFiles: number }>> {
  const plan = (await progressGetPlan(input)).data;
  return makeEnvelope(pickNextTopic(plan));
}

export async function progressUpdateCheckbox(
  input: z.input<typeof updateCheckboxInputSchema>,
): Promise<Envelope<{ ok: boolean; updated: boolean; filePath: string }>> {
  const parsed = updateCheckboxInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);
  const planPath = resolvePlanPath(context, parsed.skill);
  const markdown = await readText(planPath);
  const lines = markdown.split(/\r?\n/);

  let updated = false;
  let sectionStart = 0;
  let sectionEnd = lines.length;

  for (let i = 0; i < lines.length; i += 1) {
    const currentLine = lines[i]!;
    if (currentLine.startsWith("### ") && currentLine.toLowerCase().includes(parsed.topic.toLowerCase())) {
      sectionStart = i;
      sectionEnd = lines.length;
      for (let j = i + 1; j < lines.length; j += 1) {
        const innerLine = lines[j]!;
        if (innerLine.startsWith("### ") || innerLine.startsWith("## ")) {
          sectionEnd = j;
          break;
        }
      }
      break;
    }
  }

  updated = replaceCheckboxInRange(lines, sectionStart, sectionEnd, parsed.step, parsed.done);
  if (!updated) {
    updated = replaceCheckboxInRange(lines, 0, lines.length, parsed.step, parsed.done);
  }

  if (updated) {
    await writeText(planPath, `${lines.join("\n")}\n`);
  }

  return makeEnvelope({
    ok: true,
    updated,
    filePath: planPath,
  });
}

export async function progressGetModuleMap(
  input: z.input<typeof moduleMapInputSchema>,
): Promise<Envelope<ModuleMapResult>> {
  const parsed = moduleMapInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);
  const sourceDir = parsed.sourceDir ?? context.sourceDir ?? context.projectPath;
  if (!sourceDir) {
    throw new Error("sourceDir not found");
  }

  const { value, cacheMeta } = await getCachedModuleMap(sourceDir);
  return makeEnvelope(value, undefined, cacheMeta);
}

export async function progressGetCoverageMap(
  input: z.input<typeof coverageMapInputSchema>,
): Promise<Envelope<CoverageMapResult>> {
  const parsed = coverageMapInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);
  const sourceDir = parsed.sourceDir ?? context.sourceDir ?? context.projectPath;
  if (!sourceDir) {
    throw new Error("sourceDir not found");
  }

  const refsDir =
    parsed.refsDir ??
    (context.mode === "skill" && context.skill
      ? path.join(context.skillsDir, `${context.skill}-aio`, "references")
      : path.join(context.studyDir ?? context.projectPath ?? sourceDir, "references"));

  const { value: moduleMap, cacheMeta } = await getCachedModuleMap(sourceDir);
  const refFiles = await listFiles(refsDir, { extension: ".md", maxDepth: 5 });

  const refTexts = await Promise.all(refFiles.map((file) => readText(file)));
  const covered = new Set<string>();
  const uncovered = new Set<string>();

  for (const mod of moduleMap.modules) {
    const moduleName = mod.name.toLowerCase();
    let hit = false;
    for (let i = 0; i < refFiles.length; i += 1) {
      const refFile = refFiles[i]!;
      const refText = refTexts[i]!;
      const fileName = path.basename(refFile).toLowerCase();
      if (fileName.includes(moduleName)) {
        hit = true;
        break;
      }
      if (refText.toLowerCase().includes(moduleName)) {
        hit = true;
        break;
      }
    }

    if (hit) covered.add(mod.name);
    else uncovered.add(mod.name);
  }

  const orphanRefs: string[] = [];
  for (let i = 0; i < refFiles.length; i += 1) {
    const refFile = refFiles[i]!;
    const refText = refTexts[i]!;
    const fileName = path.basename(refFile);
    const hasAny = moduleMap.modules.some((mod) => refText.toLowerCase().includes(mod.name.toLowerCase()));
    if (!hasAny) {
      orphanRefs.push(fileName);
    }
  }

  return makeEnvelope(
    {
      covered: [...covered].sort(),
      uncovered: [...uncovered].sort(),
      orphanRefs: orphanRefs.sort(),
    },
    undefined,
    cacheMeta,
  );
}

export const progressSchemas = {
  getPlan: planInputSchema,
  getNextTopic: nextTopicInputSchema,
  updateCheckbox: updateCheckboxInputSchema,
  getModuleMap: moduleMapInputSchema,
  getCoverageMap: coverageMapInputSchema,
};
