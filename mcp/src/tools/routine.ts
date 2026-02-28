import path from "node:path";
import { promises as fs } from "node:fs";
import { z } from "zod";
import { loadConfig } from "../config.js";
import { appendText, exists, readText, writeText } from "../lib/fs.js";
import { makeEnvelope } from "../lib/envelope.js";
import type { Clock } from "../lib/clock.js";
import { systemClock } from "../lib/clock.js";
import { contextInputSchema, type ContextInput, type Envelope } from "../types/contracts.js";
import type { ExtractTranscriptResult, RoutineLogSummary } from "../types/domain.js";
import { resolveContextData } from "./context.js";
import { extractMessages, findSessionFiles, toTranscriptMarkdown } from "../lib/transcript.js";

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
      phase: z.number().int().min(0).max(6),
      type: z.string().min(1),
    })
    .passthrough(),
});

const readLogInputSchema = z.object({
  context: contextInputSchema.optional(),
  entriesMode: z.enum(["full", "recent", "none"]).default("recent"),
  recentCount: z.number().int().min(1).max(50).default(5),
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

  const emptyResult: RoutineLogSummary = {
    exists: false,
    topic: null,
    currentPhase: 0,
    qaCount: 0,
    entryCount: 0,
    entries: [],
    lastTs: null,
    checkpointResult: null,
    phaseSummaries: [],
    codingResult: null,
    elapsedMinutes: null,
  };

  if (!fileExists) {
    return makeEnvelope(emptyResult, clock);
  }

  const content = await readText(logPath);
  if (!content.trim()) {
    return makeEnvelope(emptyResult, clock);
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
  let firstTs: string | null = null;
  let checkpointResult: "PASS" | "FAIL" | "PENDING" | null = null;
  const phaseSummaries: Array<{ phase: number; summary: string }> = [];
  let codingResult: { challenge: string; result: string } | null = null;

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
      if (firstTs === null) {
        firstTs = entry.ts;
      }
      lastTs = entry.ts;
    }
    if (entry.type === "checkpoint") {
      const result = entry.result;
      if (result === "PASS" || result === "FAIL" || result === "PENDING") {
        checkpointResult = result;
      }
    }
    if (entry.type === "phase_end" && typeof entry.phase === "number") {
      const summary = typeof entry.summary === "string" ? entry.summary : `Phase ${entry.phase} 완료`;
      phaseSummaries.push({ phase: entry.phase, summary });
    }
    if (entry.type === "coding") {
      const challenge = typeof entry.challenge === "string" ? entry.challenge : "";
      const result = typeof entry.result === "string" ? entry.result : "";
      codingResult = { challenge, result };
    }
  }

  // Compute elapsed minutes
  let elapsedMinutes: number | null = null;
  if (firstTs && lastTs) {
    const elapsed = new Date(lastTs).getTime() - new Date(firstTs).getTime();
    elapsedMinutes = Math.round(elapsed / 60000);
  }

  // Apply entriesMode filter
  let filteredEntries: Record<string, unknown>[];
  if (parsed.entriesMode === "none") {
    filteredEntries = [];
  } else if (parsed.entriesMode === "recent") {
    filteredEntries = entries.slice(-parsed.recentCount);
  } else {
    filteredEntries = entries;
  }

  return makeEnvelope(
    {
      exists: true,
      topic,
      currentPhase,
      qaCount,
      entryCount: entries.length,
      entries: filteredEntries,
      lastTs,
      checkpointResult,
      phaseSummaries,
      codingResult,
      elapsedMinutes,
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

const extractTranscriptInputSchema = z.object({
  context: contextInputSchema.optional(),
  client: z.enum(["claude-code", "codex", "auto"]).default("auto"),
});

export async function routineExtractTranscript(
  input: z.input<typeof extractTranscriptInputSchema>,
  clock: Clock = systemClock,
): Promise<Envelope<ExtractTranscriptResult>> {
  const parsed = extractTranscriptInputSchema.parse(input);
  const logPath = await getLogPath(parsed.context);
  const logContent = await readText(logPath);

  if (!logContent.trim()) {
    throw new Error("No routine session log found. Run a routine session first.");
  }

  // Extract init entry to get topic and startTs
  let topic: string | null = null;
  let startTs: number | null = null;

  for (const line of logContent.trim().split("\n")) {
    try {
      const entry = JSON.parse(line) as Record<string, unknown>;
      if (entry.type === "init" && typeof entry.topic === "string") {
        topic = entry.topic;
      }
      if (typeof entry.ts === "string" && startTs === null) {
        startTs = new Date(entry.ts as string).getTime();
      }
    } catch {
      // skip
    }
  }

  if (!topic) {
    throw new Error("No init entry with topic found in session log.");
  }
  if (startTs === null) {
    throw new Error("No timestamp found in session log.");
  }

  const endTs = clock.now().getTime();

  // Determine CWD for session file discovery
  let cwd: string;
  if (parsed.context?.mode === "project" && parsed.context.projectPath) {
    cwd = path.resolve(parsed.context.projectPath);
  } else {
    cwd = loadConfig().studyRoot;
  }

  // Find session files
  const { client, files } = await findSessionFiles(cwd, startTs, endTs, parsed.client);

  if (files.length === 0) {
    throw new Error(
      `No session files found for client=${client}, cwd=${cwd}. ` +
      `Looked for sessions between ${new Date(startTs).toISOString()} and ${new Date(endTs).toISOString()}.`,
    );
  }

  // Extract messages
  const messages = await extractMessages(files, client, startTs, endTs);

  // Generate markdown
  const date = clock.now().toISOString().slice(0, 10);
  const markdown = toTranscriptMarkdown(topic, date, client, messages);

  // Determine output path
  let transcriptsDir: string;
  if (parsed.context?.mode === "project" && parsed.context.projectPath) {
    const resolved = await resolveContextData(parsed.context);
    transcriptsDir = path.join(resolved.studyDir!, ".routine", "transcripts");
  } else {
    const config = loadConfig();
    transcriptsDir = path.join(config.notesDir, ".routine", "transcripts");
  }

  const transcriptPath = path.join(
    transcriptsDir,
    `${date}-${sanitizeTopicForFilename(topic)}.md`,
  );

  await writeText(transcriptPath, markdown);

  return makeEnvelope(
    {
      ok: true,
      transcriptPath,
      sessionFiles: files,
      messageCount: messages.length,
      client,
    },
    clock,
  );
}

export const routineSchemas = {
  appendEntry: appendEntryInputSchema,
  readLog: readLogInputSchema,
  resetLog: resetLogInputSchema,
  extractTranscript: extractTranscriptInputSchema,
};
