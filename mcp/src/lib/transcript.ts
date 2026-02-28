import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TranscriptMessage {
  timestamp: string;
  role: "user" | "assistant";
  text: string;
  toolNames?: string[] | undefined;
}

type ClientType = "claude-code" | "codex";

// ---------------------------------------------------------------------------
// Path encoding helpers
// ---------------------------------------------------------------------------

/**
 * Encode a CWD path to the directory name Claude Code uses under
 * `~/.claude/projects/`.  Special chars (/, @, ., space, ~) → `-`.
 */
export function encodeClaudeCodeProjectPath(cwd: string): string {
  return cwd.replace(/[/@.~ ]/g, "-");
}

// ---------------------------------------------------------------------------
// Session file discovery
// ---------------------------------------------------------------------------

export async function findClaudeCodeSessionFiles(
  cwd: string,
  startTs: number,
  endTs: number,
): Promise<string[]> {
  const encoded = encodeClaudeCodeProjectPath(cwd);
  const projectDir = path.join(os.homedir(), ".claude", "projects", encoded);

  let entries: string[];
  try {
    entries = await fs.readdir(projectDir);
  } catch {
    return [];
  }

  const jsonlFiles = entries
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => path.join(projectDir, f));

  // Filter by mtime – keep files modified after startTs
  const results: string[] = [];
  for (const file of jsonlFiles) {
    try {
      const stat = await fs.stat(file);
      // A file is relevant if it was modified after the session started
      if (stat.mtimeMs >= startTs - 60_000) {
        results.push(file);
      }
    } catch {
      // skip
    }
  }

  // 2nd pass: keep only files that contain messages overlapping [startTs, endTs]
  const overlapping: string[] = [];
  for (const file of results) {
    if (await fileOverlapsRange(file, startTs, endTs)) {
      overlapping.push(file);
    }
  }

  return overlapping.sort();
}

export async function findCodexSessionFiles(
  cwd: string,
  startTs: number,
  endTs: number,
): Promise<string[]> {
  const sessionsDir = path.join(os.homedir(), ".codex", "sessions");
  const results: string[] = [];

  // Walk Y/M/D directories
  let years: string[];
  try {
    years = await fs.readdir(sessionsDir);
  } catch {
    return [];
  }

  for (const year of years) {
    const yearDir = path.join(sessionsDir, year);
    let months: string[];
    try {
      months = await fs.readdir(yearDir);
    } catch {
      continue;
    }
    for (const month of months) {
      const monthDir = path.join(yearDir, month);
      let days: string[];
      try {
        days = await fs.readdir(monthDir);
      } catch {
        continue;
      }
      for (const day of days) {
        const dayDir = path.join(monthDir, day);
        let files: string[];
        try {
          files = await fs.readdir(dayDir);
        } catch {
          continue;
        }
        for (const file of files) {
          if (!file.endsWith(".jsonl")) continue;
          const fullPath = path.join(dayDir, file);

          // Quick date-based filter from filename: rollout-YYYY-MM-DDTHH-MM-SS-...
          const dateMatch = file.match(/rollout-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
          if (dateMatch?.[1]) {
            const fileDate = new Date(dateMatch[1].replace(/-/g, (m, offset: number) => (offset > 9 ? ":" : m))).getTime();
            // Skip files created well after endTs
            if (fileDate > endTs + 3600_000) continue;
          }

          results.push(fullPath);
        }
      }
    }
  }

  // Filter by CWD match in session_meta
  const matched: string[] = [];
  for (const file of results) {
    try {
      const meta = await readFirstLine(file);
      if (!meta) continue;
      const parsed = JSON.parse(meta) as Record<string, unknown>;
      if (parsed.type !== "session_meta") continue;
      const payload = parsed.payload as Record<string, unknown> | undefined;
      if (!payload) continue;
      const fileCwd = payload.cwd as string | undefined;
      if (fileCwd && path.resolve(fileCwd) === path.resolve(cwd)) {
        if (await fileOverlapsRange(file, startTs, endTs)) {
          matched.push(file);
        }
      }
    } catch {
      // skip
    }
  }

  return matched.sort();
}

/**
 * Auto-detect client and find session files.
 * Claude Code is tried first, then Codex.
 */
export async function findSessionFiles(
  cwd: string,
  startTs: number,
  endTs: number,
  client?: "claude-code" | "codex" | "auto",
): Promise<{ client: ClientType; files: string[] }> {
  if (client === "claude-code") {
    return { client: "claude-code", files: await findClaudeCodeSessionFiles(cwd, startTs, endTs) };
  }
  if (client === "codex") {
    return { client: "codex", files: await findCodexSessionFiles(cwd, startTs, endTs) };
  }

  // auto: try Claude Code first
  const ccFiles = await findClaudeCodeSessionFiles(cwd, startTs, endTs);
  if (ccFiles.length > 0) {
    return { client: "claude-code", files: ccFiles };
  }
  const codexFiles = await findCodexSessionFiles(cwd, startTs, endTs);
  if (codexFiles.length > 0) {
    return { client: "codex", files: codexFiles };
  }
  return { client: "claude-code", files: [] };
}

// ---------------------------------------------------------------------------
// JSONL parsing
// ---------------------------------------------------------------------------

export function parseClaudeCodeEntry(entry: Record<string, unknown>): TranscriptMessage | null {
  const type = entry.type as string | undefined;
  const timestamp = entry.timestamp as string | undefined;
  if (!timestamp) return null;

  if (type === "user") {
    const message = entry.message as Record<string, unknown> | undefined;
    if (!message) return null;
    const content = message.content;

    // Skip tool results
    if (Array.isArray(content)) {
      const hasToolResult = content.some(
        (c: Record<string, unknown>) => c.type === "tool_result",
      );
      if (hasToolResult) return null;
    }

    const text = extractTextFromContent(content);
    if (!text) return null;
    return { timestamp, role: "user", text };
  }

  if (type === "assistant") {
    const message = entry.message as Record<string, unknown> | undefined;
    if (!message) return null;
    const content = message.content;
    if (!Array.isArray(content)) return null;

    const textParts: string[] = [];
    const toolNames: string[] = [];

    for (const block of content as Array<Record<string, unknown>>) {
      if (block.type === "text" && typeof block.text === "string") {
        textParts.push(block.text);
      }
      if (block.type === "tool_use" && typeof block.name === "string") {
        toolNames.push(block.name);
      }
      // Skip thinking blocks
    }

    if (textParts.length === 0 && toolNames.length === 0) return null;

    return {
      timestamp,
      role: "assistant",
      text: textParts.join("\n\n"),
      toolNames: toolNames.length > 0 ? toolNames : undefined,
    };
  }

  // progress, system, file-history-snapshot → skip
  return null;
}

export function parseCodexEntry(entry: Record<string, unknown>): TranscriptMessage | null {
  const type = entry.type as string | undefined;
  const timestamp = entry.timestamp as string | undefined;
  if (!timestamp) return null;

  if (type !== "response_item") return null;

  const payload = entry.payload as Record<string, unknown> | undefined;
  if (!payload) return null;
  const role = payload.role as string | undefined;

  if (role === "user") {
    const content = payload.content as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(content)) return null;
    const texts = content
      .filter((c) => c.type === "input_text" && typeof c.text === "string")
      .map((c) => c.text as string);
    if (texts.length === 0) return null;
    return { timestamp, role: "user", text: texts.join("\n\n") };
  }

  if (role === "assistant") {
    const content = payload.content as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(content)) return null;
    const texts = content
      .filter((c) => c.type === "output_text" && typeof c.text === "string")
      .map((c) => c.text as string);
    if (texts.length === 0) return null;
    return { timestamp, role: "assistant", text: texts.join("\n\n") };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Extract messages from session files
// ---------------------------------------------------------------------------

export async function extractMessages(
  files: string[],
  client: ClientType,
  startTs: number,
  endTs: number,
): Promise<TranscriptMessage[]> {
  const parse = client === "claude-code" ? parseClaudeCodeEntry : parseCodexEntry;
  const messages: TranscriptMessage[] = [];

  for (const file of files) {
    let content: string;
    try {
      content = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }

    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      let entry: Record<string, unknown>;
      try {
        entry = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }

      const msg = parse(entry);
      if (!msg) continue;

      const msgTs = new Date(msg.timestamp).getTime();
      if (msgTs >= startTs && msgTs <= endTs) {
        messages.push(msg);
      }
    }
  }

  // Sort by timestamp
  messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return messages;
}

// ---------------------------------------------------------------------------
// Markdown conversion
// ---------------------------------------------------------------------------

export function toTranscriptMarkdown(
  topic: string,
  date: string,
  client: ClientType,
  messages: TranscriptMessage[],
): string {
  const lines: string[] = [];

  lines.push(`# Transcript: ${topic}`);
  lines.push(`> 날짜: ${date} | 클라이언트: ${client} | 메시지: ${messages.length}개`);
  lines.push("");
  lines.push("---");

  for (const msg of messages) {
    lines.push("");
    const time = formatTime(msg.timestamp);
    const roleName = msg.role === "user" ? "사용자" : "AI";
    lines.push(`## [${time}] ${roleName}`);
    lines.push("");
    lines.push(msg.text);

    if (msg.toolNames && msg.toolNames.length > 0) {
      lines.push("");
      lines.push(`> 도구 호출: ${msg.toolNames.join(", ")}`);
    }

    lines.push("");
    lines.push("---");
  }

  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Time range helpers
// ---------------------------------------------------------------------------

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractTextFromContent(content: unknown): string | null {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    const texts = (content as Array<Record<string, unknown>>)
      .filter((c) => c.type === "text" && typeof c.text === "string")
      .map((c) => c.text as string);
    return texts.length > 0 ? texts.join("\n\n") : null;
  }
  return null;
}

function formatTime(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

async function readFirstLine(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const idx = content.indexOf("\n");
    return idx >= 0 ? content.slice(0, idx) : content;
  } catch {
    return null;
  }
}

async function fileOverlapsRange(
  file: string,
  startTs: number,
  endTs: number,
): Promise<boolean> {
  let content: string;
  try {
    content = await fs.readFile(file, "utf8");
  } catch {
    return false;
  }

  const lines = content.split("\n");
  let firstTs: number | null = null;
  let lastTs: number | null = null;

  // Read first few lines for first timestamp
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    try {
      const entry = JSON.parse(line) as Record<string, unknown>;
      const ts = entry.timestamp as string | undefined;
      if (ts) {
        firstTs = new Date(ts).getTime();
        break;
      }
    } catch {
      // skip
    }
  }

  // Read last few lines for last timestamp
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
    const line = lines[i];
    if (!line || !line.trim()) continue;
    try {
      const entry = JSON.parse(line) as Record<string, unknown>;
      const ts = entry.timestamp as string | undefined;
      if (ts) {
        lastTs = new Date(ts).getTime();
        break;
      }
    } catch {
      // skip
    }
  }

  if (firstTs === null || lastTs === null) return false;
  return rangesOverlap(startTs, endTs, firstTs, lastTs);
}
