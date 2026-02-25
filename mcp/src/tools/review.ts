import path from "node:path";
import { z } from "zod";
import { makeEnvelope } from "../lib/envelope.js";
import { appendText, listFiles, readText, writeText } from "../lib/fs.js";
import { parseMeta } from "../parsers/meta-parser.js";
import { resolveContextData } from "./context.js";
import type { Clock } from "../lib/clock.js";
import { systemClock } from "../lib/clock.js";
import type { ContextInput, Envelope, ReviewLevel, ReviewScore } from "../types/contracts.js";
import type { ReviewConcept, ReviewMeta, ReviewQueueItem } from "../types/domain.js";

const contextSchema = z.object({
  mode: z.enum(["skill", "project"]),
  skill: z.string().optional(),
  topic: z.string().optional(),
  projectPath: z.string().optional(),
  notesDir: z.string().optional(),
  studyDir: z.string().optional(),
});

const getQueueInputSchema = z.object({
  context: contextSchema,
  skill: z.string().optional(),
});

const recordResultInputSchema = z.object({
  context: contextSchema,
  skill: z.string().optional(),
  topic: z.string(),
  concept: z.string(),
  score: z.enum(["wrong", "retry_pass", "first_pass"]),
  attempt: z.number().int().min(1).default(1),
});

const getMetaInputSchema = z.object({
  context: contextSchema,
  skill: z.string().optional(),
  topic: z.string(),
});

const saveMetaInputSchema = z.object({
  context: contextSchema,
  skill: z.string().optional(),
  topic: z.string(),
  meta: z.object({
    concepts: z.array(
      z.object({
        name: z.string(),
        level: z.enum(["L1", "L2", "L3", "L4"]),
        streak: z.number().int().nonnegative(),
        nextReview: z.string(),
        graduated: z.boolean(),
        attempts: z.number().int().nonnegative().default(0),
      }),
    ),
    sessionCount: z.number().int().nonnegative().default(0),
  }),
});

const appendQnAInputSchema = z.object({
  context: contextSchema,
  skill: z.string().optional(),
  topic: z.string(),
  items: z.array(
    z.object({
      concept: z.string(),
      question: z.string(),
      userAnswer: z.string(),
      hint: z.string().optional(),
      score: z.enum(["wrong", "retry_pass", "first_pass"]),
      level: z.enum(["L1", "L2", "L3", "L4"]),
    }),
  ),
});

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function nextLevel(level: ReviewLevel): ReviewLevel {
  if (level === "L1") return "L2";
  if (level === "L2") return "L3";
  return "L4";
}

function prevLevel(level: ReviewLevel): ReviewLevel {
  if (level === "L4") return "L3";
  if (level === "L3") return "L2";
  return "L1";
}

export function calculateNextReview(input: {
  score: ReviewScore;
  streak: number;
  level: ReviewLevel;
  now?: Date;
}): { nextInterval: number; streak: number; level: ReviewLevel; graduated: boolean; nextReviewDate: string } {
  const now = input.now ?? new Date();

  if (input.score === "wrong") {
    const next = addDays(now, 1);
    return {
      nextInterval: 1,
      streak: 0,
      level: prevLevel(input.level),
      graduated: false,
      nextReviewDate: toDateOnly(next),
    };
  }

  if (input.score === "retry_pass") {
    const next = addDays(now, 3);
    return {
      nextInterval: 3,
      streak: 0,
      level: input.level,
      graduated: false,
      nextReviewDate: toDateOnly(next),
    };
  }

  const streak = input.streak + 1;
  const interval = Math.min(30, 7 * 2 ** Math.max(0, streak - 1));
  const next = addDays(now, interval);

  return {
    nextInterval: interval,
    streak,
    level: nextLevel(input.level),
    graduated: streak >= 3,
    nextReviewDate: toDateOnly(next),
  };
}

function resolveReviewDir(context: Awaited<ReturnType<typeof resolveContextData>>, skill?: string): string {
  if (context.mode === "project") {
    return context.studyDir!;
  }
  const resolvedSkill = skill ?? context.skill;
  if (!resolvedSkill) {
    throw new Error("skill is required in skill mode");
  }
  return path.join(context.notesDir, resolvedSkill);
}

function topicFromMetaFile(file: string): string {
  return path.basename(file).replace(/-meta\.md$/i, "");
}

function metaToMarkdown(topic: string, meta: ReviewMeta): string {
  const rows = meta.concepts
    .map((concept) => `| ${concept.name} | ${concept.level} | ${concept.streak} | ${concept.nextReview} | ${concept.graduated ? "true" : "false"} | ${concept.attempts} |`)
    .join("\n");

  return `# ${topic} Review Meta\n\nsessionCount: ${meta.sessionCount}\n\n| Concept | Level | Streak | NextReview | Graduated | Attempts |\n|---|---|---:|---|---|---:|\n${rows}\n`;
}

async function readMetaFile(dir: string, topic: string): Promise<{ path: string; meta: ReviewMeta }> {
  const filePath = path.join(dir, `${topic}-meta.md`);
  const text = await readText(filePath);
  return {
    path: filePath,
    meta: parseMeta(text, topic),
  };
}

function daysDiff(today: string, targetDate: string): number {
  const t1 = new Date(`${today}T00:00:00.000Z`).getTime();
  const t2 = new Date(`${targetDate}T00:00:00.000Z`).getTime();
  return Math.floor((t1 - t2) / (24 * 60 * 60 * 1000));
}

export async function reviewGetMeta(input: z.input<typeof getMetaInputSchema>): Promise<Envelope<ReviewMeta>> {
  const parsed = getMetaInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);
  const dir = resolveReviewDir(context, parsed.skill);
  const { meta } = await readMetaFile(dir, parsed.topic);
  return makeEnvelope(meta);
}

export async function reviewSaveMeta(
  input: z.input<typeof saveMetaInputSchema>,
): Promise<Envelope<{ ok: boolean; filePath: string }>> {
  const parsed = saveMetaInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);
  const dir = resolveReviewDir(context, parsed.skill);
  const filePath = path.join(dir, `${parsed.topic}-meta.md`);

  const meta: ReviewMeta = {
    topic: parsed.topic,
    concepts: parsed.meta.concepts,
    sessionCount: parsed.meta.sessionCount,
  };

  await writeText(filePath, metaToMarkdown(parsed.topic, meta));
  return makeEnvelope({ ok: true, filePath });
}

export async function reviewRecordResult(
  input: z.input<typeof recordResultInputSchema>,
  clock: Clock = systemClock,
): Promise<Envelope<{ nextReviewDate: string; streak: number; level: ReviewLevel; graduated: boolean }>> {
  const parsed = recordResultInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);
  const dir = resolveReviewDir(context, parsed.skill);

  const { path: filePath, meta } = await readMetaFile(dir, parsed.topic);
  const now = clock.now();

  let concept = meta.concepts.find((item) => item.name === parsed.concept);
  if (!concept) {
    concept = {
      name: parsed.concept,
      level: "L1",
      streak: 0,
      nextReview: toDateOnly(now),
      graduated: false,
      attempts: 0,
    };
    meta.concepts.push(concept);
  }

  const result = calculateNextReview({
    score: parsed.score,
    streak: concept.streak,
    level: concept.level,
    now,
  });

  concept.streak = result.streak;
  concept.level = result.level;
  concept.graduated = result.graduated;
  concept.nextReview = result.nextReviewDate;
  concept.attempts = concept.attempts + 1;
  meta.sessionCount += 1;

  await writeText(filePath, metaToMarkdown(parsed.topic, meta));

  return makeEnvelope({
    nextReviewDate: result.nextReviewDate,
    streak: result.streak,
    level: result.level,
    graduated: result.graduated,
  });
}

export async function reviewGetQueue(
  input: z.input<typeof getQueueInputSchema>,
  clock: Clock = systemClock,
): Promise<Envelope<{ today: string; items: ReviewQueueItem[]; graduated: number; totalActive: number }>> {
  const parsed = getQueueInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);

  const today = toDateOnly(clock.now());
  const dirs: Array<{ skill: string; dir: string }> = [];

  if (context.mode === "project") {
    dirs.push({ skill: path.basename(context.projectPath ?? "project"), dir: context.studyDir! });
  } else {
    // mode=skill is validated at context resolution and always has context.skill.
    const skill = context.skill!;
    dirs.push({ skill, dir: path.join(context.notesDir, skill) });
  }

  const items: ReviewQueueItem[] = [];
  let graduated = 0;
  let totalActive = 0;

  for (const { skill, dir } of dirs) {
    const metaFiles = await listFiles(dir, { extension: "-meta.md", maxDepth: 1 });

    if (metaFiles.length === 0) {
      const topicFiles = (await listFiles(dir, { extension: ".md", maxDepth: 1 })).filter(
        (file) => !file.endsWith("plan.md") && !file.endsWith("-quiz.md") && !file.endsWith("-meta.md") && !file.endsWith("-qa.md"),
      );
      for (const topicFile of topicFiles) {
        items.push({
          skill,
          topic: path.basename(topicFile, ".md"),
          concept: "핵심 개념",
          level: "L1",
          nextReview: today,
          streak: 0,
          overdueDays: 0,
        });
        totalActive += 1;
      }
      continue;
    }

    for (const file of metaFiles) {
      const topic = topicFromMetaFile(file);
      const text = await readText(file);
      const meta = parseMeta(text, topic);
      for (const concept of meta.concepts) {
        if (concept.graduated) {
          graduated += 1;
          continue;
        }
        totalActive += 1;
        const overdueDays = daysDiff(today, concept.nextReview);
        if (overdueDays >= 0) {
          items.push({
            skill,
            topic,
            concept: concept.name,
            level: concept.level,
            nextReview: concept.nextReview,
            streak: concept.streak,
            overdueDays,
          });
        }
      }
    }
  }

  items.sort((a, b) => b.overdueDays - a.overdueDays || a.skill.localeCompare(b.skill) || a.topic.localeCompare(b.topic));

  return makeEnvelope({
    today,
    items,
    graduated,
    totalActive,
  });
}

export async function reviewAppendQnA(
  input: z.input<typeof appendQnAInputSchema>,
  clock: Clock = systemClock,
): Promise<Envelope<{ ok: boolean; filePath: string }>> {
  const parsed = appendQnAInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);
  const dir = resolveReviewDir(context, parsed.skill);
  const filePath = path.join(dir, `${parsed.topic}-qa.md`);

  const existing = await readText(filePath);
  const today = toDateOnly(clock.now());
  const marker = context.mode === "project" ? "via /project-review" : "via /review";

  const itemsText = parsed.items
    .map((item) => {
      const lines = [
        `### ${item.concept} [${item.score} → ${item.level}]`,
        `**Q**: ${item.question}`,
        `**A**: ${item.userAnswer}`,
      ];
      if (item.hint) lines.push(`**Hint**: ${item.hint}`);
      lines.push(`**Score**: ${item.score}`);
      return lines.join("\n");
    })
    .join("\n\n");

  const header = existing.trim() === "" ? `# ${parsed.topic} Review QnA\n` : "";
  const payload = `${header}\n---\n\n## ${today} (${marker})\n\n${itemsText}\n`;

  await appendText(filePath, payload);
  return makeEnvelope({ ok: true, filePath });
}

export const reviewSchemas = {
  getQueue: getQueueInputSchema,
  recordResult: recordResultInputSchema,
  getMeta: getMetaInputSchema,
  saveMeta: saveMetaInputSchema,
  appendQnA: appendQnAInputSchema,
};
