import path from "node:path";
import { z } from "zod";
import { makeEnvelope } from "../lib/envelope.js";
import { exists, listFiles, readText, writeText } from "../lib/fs.js";
import { resolveContextData } from "./context.js";
import type { Clock } from "../lib/clock.js";
import { systemClock } from "../lib/clock.js";
import type { ContextInput, Envelope } from "../types/contracts.js";
import type { DailyStatus } from "../types/domain.js";

const contextSchema = z.object({
  mode: z.enum(["skill", "project"]),
  skill: z.string().optional(),
  topic: z.string().optional(),
  projectPath: z.string().optional(),
  docsDir: z.string().optional(),
  studyDir: z.string().optional(),
});

const getStatusInputSchema = z.object({
  context: contextSchema,
});

const logPlanInputSchema = z.object({
  context: contextSchema,
  plan: z.string(),
});

const logDoneInputSchema = z.object({
  context: contextSchema,
  report: z.string(),
});

const finalizeInputSchema = z.object({
  context: contextSchema,
});

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function todayFile(logDir: string, clock: Clock = systemClock): string {
  return path.join(logDir, `${dateOnly(clock.now())}.md`);
}

function detectState(text: string): DailyStatus["todayState"] {
  if (text.includes("🟣 완료")) return "DONE";
  if (text.includes("🔵 피드백 완료")) return "FEEDBACK";
  if (text.includes("🟢 계획 확정")) return "CONFIRMED";
  if (text.includes("🟡 계획 수립 중")) return "PLANNING";
  return "NONE";
}

function inferAchievement(report: string): number {
  const match = report.match(/(\d{1,3})%/);
  if (match) {
    return Math.min(100, Number(match[1]));
  }
  if (/못|미달|부족/.test(report)) {
    return 60;
  }
  if (/완료|다 함|전부/.test(report)) {
    return 100;
  }
  return 80;
}

function replaceSection(text: string, heading: string, body: string): string {
  const lines = text.split(/\r?\n/);
  const headingLine = `## ${heading}`;
  const start = lines.findIndex((line) => line.trim() === headingLine);

  if (start === -1) {
    return `${text.trim()}\n\n${headingLine}\n\n${body.trim()}\n`;
  }

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i]!.startsWith("## ")) {
      end = i;
      break;
    }
  }

  const prefix = lines.slice(0, start).join("\n");
  const suffix = lines.slice(end).join("\n");
  return `${prefix}\n${headingLine}\n\n${body.trim()}\n${suffix}`.trimEnd() + "\n";
}

function replaceStatus(text: string, statusLabel: string, clock: Clock = systemClock): string {
  const statusLine = `> 상태: ${statusLabel}`;
  if (!text.trim()) {
    return `# ${dateOnly(clock.now())}\n\n${statusLine}\n`;
  }

  if (/>\s*상태:\s*/.test(text)) {
    return text.replace(/>\s*상태:\s*.*/g, statusLine);
  }

  const lines = text.split(/\r?\n/);
  const insertAt = lines.findIndex((line) => line.startsWith("# "));
  if (insertAt >= 0) {
    lines.splice(insertAt + 1, 0, "", statusLine);
    return `${lines.join("\n")}\n`;
  }

  return `${statusLine}\n\n${text}`;
}

async function computeStreak(logDir: string, clock: Clock = systemClock): Promise<number> {
  const files = await listFiles(logDir, { extension: ".md", maxDepth: 1 });
  const dateFiles = files
    .map((file) => path.basename(file, ".md"))
    .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort();

  let streak = 0;
  const now = new Date(`${dateOnly(clock.now())}T00:00:00.000Z`);
  for (let i = 0; i < 366; i += 1) {
    const target = new Date(now);
    target.setUTCDate(now.getUTCDate() - i);
    const key = target.toISOString().slice(0, 10);
    if (dateFiles.includes(key)) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

async function computeAchievementRate7d(logDir: string): Promise<number> {
  const files = await listFiles(logDir, { extension: ".md", maxDepth: 1 });
  const dateFiles = files
    .map((file) => ({ file, date: path.basename(file, ".md") }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  const rates: number[] = [];
  for (const item of dateFiles) {
    const text = await readText(item.file);
    const match = text.match(/달성률[^\d]*(\d{1,3})%/);
    if (match) {
      rates.push(Number(match[1]));
    }
  }

  if (rates.length === 0) {
    return 0;
  }

  const sum = rates.reduce((acc, cur) => acc + cur, 0);
  return Math.round((sum / rates.length) * 10) / 10;
}

export async function dailyGetStatus(input: z.input<typeof getStatusInputSchema>, clock: Clock = systemClock): Promise<Envelope<DailyStatus>> {
  const parsed = getStatusInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);
  const logDir = context.studyLogsDir;
  const filePath = todayFile(logDir, clock);
  const text = await readText(filePath);

  const status: DailyStatus = {
    streak: await computeStreak(logDir, clock),
    todayState: detectState(text),
    achievementRate7d: await computeAchievementRate7d(logDir),
    lastSession: (await exists(filePath)) ? dateOnly(clock.now()) : undefined,
  };

  return makeEnvelope(status, clock);
}

export async function dailyLogPlan(
  input: z.input<typeof logPlanInputSchema>,
  clock: Clock = systemClock,
): Promise<Envelope<{ ok: boolean; logPath: string }>> {
  const parsed = logPlanInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);
  const logPath = todayFile(context.studyLogsDir, clock);

  let text = await readText(logPath);
  if (!text.trim()) {
    text = `# ${dateOnly(clock.now())}\n\n> 상태: 🟡 계획 수립 중\n`;
  }

  text = replaceStatus(text, "🟡 계획 수립 중", clock);
  text = replaceSection(text, "계획", parsed.plan);
  await writeText(logPath, text.trimEnd() + "\n");

  return makeEnvelope({ ok: true, logPath }, clock);
}

export async function dailyLogDone(
  input: z.input<typeof logDoneInputSchema>,
  clock: Clock = systemClock,
): Promise<Envelope<{ ok: boolean; achievementRate: number }>> {
  const parsed = logDoneInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);
  const logPath = todayFile(context.studyLogsDir, clock);

  let text = await readText(logPath);
  if (!text.trim()) {
    text = `# ${dateOnly(clock.now())}\n\n> 상태: 🔵 피드백 완료\n`;
  }

  const achievementRate = inferAchievement(parsed.report);
  text = replaceStatus(text, "🔵 피드백 완료", clock);
  text = replaceSection(text, "실제 수행", parsed.report);
  text = replaceSection(text, "달성률", `${achievementRate}%`);

  await writeText(logPath, text.trimEnd() + "\n");

  return makeEnvelope({ ok: true, achievementRate }, clock);
}

export async function dailyFinalize(
  input: z.input<typeof finalizeInputSchema>,
  clock: Clock = systemClock,
): Promise<Envelope<{ ok: boolean }>> {
  const parsed = finalizeInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);
  const logPath = todayFile(context.studyLogsDir, clock);
  let text = await readText(logPath);
  if (!text.trim()) {
    text = `# ${dateOnly(clock.now())}\n\n> 상태: 🟣 완료\n`;
  }
  text = replaceStatus(text, "🟣 완료", clock);
  await writeText(logPath, text.trimEnd() + "\n");

  return makeEnvelope({ ok: true }, clock);
}

export const dailySchemas = {
  getStatus: getStatusInputSchema,
  logPlan: logPlanInputSchema,
  logDone: logDoneInputSchema,
  finalize: finalizeInputSchema,
};
