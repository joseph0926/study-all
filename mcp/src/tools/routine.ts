import path from "node:path";
import { promises as fs } from "node:fs";
import { z } from "zod";
import { loadConfig } from "../config.js";
import { appendText, exists, readText, writeText } from "../lib/fs.js";
import { makeEnvelope } from "../lib/envelope.js";
import type { Clock } from "../lib/clock.js";
import { systemClock } from "../lib/clock.js";
import { contextInputSchema, type ContextInput, type Envelope } from "../types/contracts.js";
import type { RoutineLogSummary } from "../types/domain.js";
import { resolveContextData } from "./context.js";

async function getLogPath(context?: ContextInput): Promise<string> {
  if (context?.mode === "project") {
    const resolved = await resolveContextData(context);
    return path.join(resolved.studyDir!, ".routine", ".session-log.jsonl");
  }

  const config = loadConfig();
  return path.join(config.notesDir, ".routine", ".session-log.jsonl");
}

const appendEntryInputSchema = z.object({
  context: contextInputSchema.optional(),
  entry: z
    .object({
      phase: z.number().int().min(0).max(5),
      type: z.string().min(1),
    })
    .passthrough(),
});

const readLogInputSchema = z.object({
  context: contextInputSchema.optional(),
});

const resetLogInputSchema = z.object({
  context: contextInputSchema.optional(),
});

function sanitizeTopicForFilename(topic: string): string {
  return topic
    .trim()
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function routineAppendEntry(
  input: z.input<typeof appendEntryInputSchema>,
  clock: Clock = systemClock,
): Promise<Envelope<{ ok: boolean; logPath: string; entryCount: number }>> {
  const parsed = appendEntryInputSchema.parse(input);
  const logPath = await getLogPath(parsed.context);

  const entry = {
    ...parsed.entry,
    ts: clock.now().toISOString(),
  };

  await appendText(logPath, JSON.stringify(entry) + "\n");

  const content = await readText(logPath);
  const lines = content.trim().split("\n").filter(Boolean);

  return makeEnvelope({ ok: true, logPath, entryCount: lines.length }, clock);
}

export async function routineReadLog(
  input: z.input<typeof readLogInputSchema>,
  clock: Clock = systemClock,
): Promise<Envelope<RoutineLogSummary>> {
  const parsed = readLogInputSchema.parse(input);
  const logPath = await getLogPath(parsed.context);
  const fileExists = await exists(logPath);

  if (!fileExists) {
    return makeEnvelope(
      {
        exists: false,
        topic: null,
        currentPhase: 0,
        qaCount: 0,
        entryCount: 0,
        entries: [],
        lastTs: null,
        checkpointResult: null,
      },
      clock,
    );
  }

  const content = await readText(logPath);
  if (!content.trim()) {
    return makeEnvelope(
      {
        exists: false,
        topic: null,
        currentPhase: 0,
        qaCount: 0,
        entryCount: 0,
        entries: [],
        lastTs: null,
        checkpointResult: null,
      },
      clock,
    );
  }

  const lines = content.trim().split("\n").filter(Boolean);
  const entries: Record<string, unknown>[] = [];

  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as Record<string, unknown>);
    } catch {
      // skip malformed lines
    }
  }

  let topic: string | null = null;
  let currentPhase = 0;
  let qaCount = 0;
  let lastTs: string | null = null;
  let checkpointResult: "PASS" | "FAIL" | "PENDING" | null = null;

  for (const entry of entries) {
    if (typeof entry.phase === "number") {
      currentPhase = entry.phase;
    }
    if (typeof entry.topic === "string") {
      topic = entry.topic;
    }
    if (entry.type === "qa") {
      qaCount++;
    }
    if (typeof entry.ts === "string") {
      lastTs = entry.ts;
    }
    if (entry.type === "checkpoint") {
      const result = entry.result;
      if (result === "PASS" || result === "FAIL" || result === "PENDING") {
        checkpointResult = result;
      }
    }
  }

  return makeEnvelope(
    {
      exists: true,
      topic,
      currentPhase,
      qaCount,
      entryCount: entries.length,
      entries,
      lastTs,
      checkpointResult,
    },
    clock,
  );
}

export async function routineResetLog(
  input: z.input<typeof resetLogInputSchema>,
  clock: Clock = systemClock,
): Promise<Envelope<{ ok: boolean; archived?: string }>> {
  const parsed = resetLogInputSchema.parse(input);
  const logPath = await getLogPath(parsed.context);
  const fileExists = await exists(logPath);

  if (!fileExists) {
    return makeEnvelope({ ok: true }, clock);
  }

  const content = await readText(logPath);
  if (!content.trim()) {
    return makeEnvelope({ ok: true }, clock);
  }

  // Extract topic from init entry for archive filename
  let topic = "";
  for (const line of content.trim().split("\n")) {
    try {
      const entry = JSON.parse(line) as Record<string, unknown>;
      if (entry.type === "init" && typeof entry.topic === "string") {
        topic = entry.topic;
        break;
      }
    } catch {
      // skip
    }
  }

  const date = clock.now().toISOString().slice(0, 10);
  const dir = path.dirname(logPath);
  const suffix = topic ? `-${sanitizeTopicForFilename(topic)}` : "";
  const archivePath = path.join(dir, `.session-log.${date}${suffix}.jsonl`);
  await fs.copyFile(logPath, archivePath);
  await writeText(logPath, "");
  return makeEnvelope({ ok: true, archived: archivePath }, clock);
}

export const routineSchemas = {
  appendEntry: appendEntryInputSchema,
  readLog: readLogInputSchema,
  resetLog: resetLogInputSchema,
};
