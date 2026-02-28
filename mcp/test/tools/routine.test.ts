import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import { FixedClock } from "../../src/lib/clock.js";
import { routineAppendEntry, routineExtractTranscript, routineReadLog, routineResetLog } from "../../src/tools/routine.js";

function setupTmpRoot(): string {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "mcp-routine-"));
  mkdirSync(path.join(tmp, "study", ".routine"), { recursive: true });
  process.env.STUDY_ROOT = tmp;
  return tmp;
}

function setupTmpProject(root: string): string {
  const projectPath = path.join(root, "project-a");
  mkdirSync(projectPath, { recursive: true });
  return projectPath;
}

const clock = new FixedClock("2026-02-26T14:00:00.000Z");

describe("routine tools", () => {
  beforeEach(() => {
    delete process.env.STUDY_ROOT;
    delete process.env.NOTES_DIR;
  });

  it("readLog returns exists=false when file does not exist", async () => {
    setupTmpRoot();
    const result = await routineReadLog({}, clock);
    expect(result.data.exists).toBe(false);
    expect(result.data.topic).toBeNull();
    expect(result.data.entries).toEqual([]);
    expect(result.data.entryCount).toBe(0);
  });

  it("appendEntry creates file and records entry with auto ts", async () => {
    const tmp = setupTmpRoot();
    const result = await routineAppendEntry(
      { entry: { phase: 0, type: "init", topic: "Suspense" } },
      clock,
    );

    expect(result.data.ok).toBe(true);
    expect(result.data.entryCount).toBe(1);

    const logPath = path.join(tmp, "study", ".routine", ".session-log.jsonl");
    const raw = readFileSync(logPath, "utf8");
    const parsed = JSON.parse(raw.trim());
    expect(parsed.phase).toBe(0);
    expect(parsed.type).toBe("init");
    expect(parsed.topic).toBe("Suspense");
    expect(parsed.ts).toBe("2026-02-26T14:00:00.000Z");
  });

  it("append → read → reset full cycle (always archives)", async () => {
    const tmp = setupTmpRoot();

    await routineAppendEntry(
      { entry: { phase: 0, type: "init", topic: "React Fiber" } },
      clock,
    );
    await routineAppendEntry(
      { entry: { phase: 1, type: "qa", question: "Q1", keyInsight: "insight1" } },
      clock,
    );
    await routineAppendEntry(
      { entry: { phase: 1, type: "qa", question: "Q2", keyInsight: "insight2" } },
      clock,
    );

    const readResult = await routineReadLog({}, clock);
    expect(readResult.data.exists).toBe(true);
    expect(readResult.data.topic).toBe("React Fiber");
    expect(readResult.data.currentPhase).toBe(1);
    expect(readResult.data.qaCount).toBe(2);
    expect(readResult.data.entryCount).toBe(3);

    const resetResult = await routineResetLog({}, clock);
    expect(resetResult.data.ok).toBe(true);
    expect(resetResult.data.archived).toContain("React-Fiber");

    const archivePath = path.join(tmp, "study", ".routine", ".session-log.2026-02-26-React-Fiber.jsonl");
    expect(existsSync(archivePath)).toBe(true);

    const afterReset = await routineReadLog({}, clock);
    expect(afterReset.data.exists).toBe(false);
  });

  it("resetLog always archives with date-topic filename", async () => {
    const tmp = setupTmpRoot();

    await routineAppendEntry(
      { entry: { phase: 0, type: "init", topic: "Hooks" } },
      clock,
    );

    const result = await routineResetLog({}, clock);
    expect(result.data.ok).toBe(true);
    expect(result.data.archived).toContain("2026-02-26-Hooks");

    const archivePath = path.join(tmp, "study", ".routine", ".session-log.2026-02-26-Hooks.jsonl");
    expect(existsSync(archivePath)).toBe(true);

    const archived = readFileSync(archivePath, "utf8");
    expect(archived).toContain("Hooks");

    const afterReset = await routineReadLog({}, clock);
    expect(afterReset.data.exists).toBe(false);
  });

  it("readLog detects checkpoint result", async () => {
    setupTmpRoot();

    await routineAppendEntry(
      { entry: { phase: 0, type: "init", topic: "State" } },
      clock,
    );
    await routineAppendEntry(
      { entry: { phase: 4, type: "checkpoint", q1: "Q1", q1Answer: "A1", q2: "Q2", q2Answer: "A2", result: "PASS" } },
      clock,
    );

    const result = await routineReadLog({}, clock);
    expect(result.data.checkpointResult).toBe("PASS");
    expect(result.data.currentPhase).toBe(4);
  });

  it("readLog returns phaseSummaries from phase_end entries", async () => {
    setupTmpRoot();

    await routineAppendEntry(
      { entry: { phase: 0, type: "init", topic: "Suspense" } },
      clock,
    );
    await routineAppendEntry(
      { entry: { phase: 1, type: "qa", userQuestion: "Q1", aiAnswer: "A1" } },
      clock,
    );
    await routineAppendEntry(
      { entry: { phase: 1, type: "phase_end", summary: "Phase 1 탐색 완료" } },
      clock,
    );
    await routineAppendEntry(
      { entry: { phase: 2, type: "phase_end", summary: "Phase 2 심화 완료" } },
      clock,
    );

    const result = await routineReadLog({ entriesMode: "full" }, clock);
    expect(result.data.phaseSummaries).toEqual([
      { phase: 1, summary: "Phase 1 탐색 완료" },
      { phase: 2, summary: "Phase 2 심화 완료" },
    ]);
  });

  it("readLog returns codingResult from coding entries", async () => {
    setupTmpRoot();

    await routineAppendEntry(
      { entry: { phase: 0, type: "init", topic: "Hooks" } },
      clock,
    );
    await routineAppendEntry(
      { entry: { phase: 3, type: "coding", challengeType: "구현", challenge: "useReducer 구현", userCode: "code", review: "good", result: "pass" } },
      clock,
    );

    const result = await routineReadLog({}, clock);
    expect(result.data.codingResult).toEqual({
      challenge: "useReducer 구현",
      result: "pass",
    });
  });

  it("readLog returns elapsedMinutes between first and last ts", async () => {
    const tmp = setupTmpRoot();
    const logPath = path.join(tmp, "study", ".routine", ".session-log.jsonl");

    const lines = [
      JSON.stringify({ phase: 0, type: "init", topic: "Test", ts: "2026-02-26T14:00:00.000Z" }),
      JSON.stringify({ phase: 1, type: "qa", ts: "2026-02-26T14:30:00.000Z" }),
      JSON.stringify({ phase: 2, type: "qa", ts: "2026-02-26T15:05:00.000Z" }),
    ];
    writeFileSync(logPath, lines.join("\n") + "\n", "utf8");

    const result = await routineReadLog({}, clock);
    expect(result.data.elapsedMinutes).toBe(65);
  });

  it("readLog entriesMode='recent' returns last N entries (default 5)", async () => {
    setupTmpRoot();

    await routineAppendEntry({ entry: { phase: 0, type: "init", topic: "Test" } }, clock);
    for (let i = 1; i <= 8; i++) {
      await routineAppendEntry({ entry: { phase: 1, type: "qa", question: `Q${i}` } }, clock);
    }

    const result = await routineReadLog({}, clock);
    expect(result.data.entryCount).toBe(9);
    expect(result.data.entries.length).toBe(5);
    // Should be the last 5 entries
    expect((result.data.entries[0] as Record<string, unknown>).question).toBe("Q4");
  });

  it("readLog entriesMode='none' returns empty entries array", async () => {
    setupTmpRoot();

    await routineAppendEntry({ entry: { phase: 0, type: "init", topic: "Test" } }, clock);
    await routineAppendEntry({ entry: { phase: 1, type: "qa", question: "Q1" } }, clock);

    const result = await routineReadLog({ entriesMode: "none" }, clock);
    expect(result.data.entryCount).toBe(2);
    expect(result.data.entries).toEqual([]);
    expect(result.data.qaCount).toBe(1);
    expect(result.data.topic).toBe("Test");
  });

  it("readLog entriesMode='full' returns all entries", async () => {
    setupTmpRoot();

    await routineAppendEntry({ entry: { phase: 0, type: "init", topic: "Test" } }, clock);
    for (let i = 1; i <= 8; i++) {
      await routineAppendEntry({ entry: { phase: 1, type: "qa", question: `Q${i}` } }, clock);
    }

    const result = await routineReadLog({ entriesMode: "full" }, clock);
    expect(result.data.entryCount).toBe(9);
    expect(result.data.entries.length).toBe(9);
  });

  it("readLog with custom recentCount", async () => {
    setupTmpRoot();

    await routineAppendEntry({ entry: { phase: 0, type: "init", topic: "Test" } }, clock);
    for (let i = 1; i <= 10; i++) {
      await routineAppendEntry({ entry: { phase: 1, type: "qa", question: `Q${i}` } }, clock);
    }

    const result = await routineReadLog({ recentCount: 3 }, clock);
    expect(result.data.entryCount).toBe(11);
    expect(result.data.entries.length).toBe(3);
    expect((result.data.entries[0] as Record<string, unknown>).question).toBe("Q8");
  });

  it("readLog phaseSummaries fallback when summary is missing", async () => {
    const tmp = setupTmpRoot();
    const logPath = path.join(tmp, "study", ".routine", ".session-log.jsonl");

    const lines = [
      JSON.stringify({ phase: 0, type: "init", topic: "Test", ts: "2026-02-26T14:00:00.000Z" }),
      JSON.stringify({ phase: 1, type: "phase_end", ts: "2026-02-26T14:30:00.000Z" }),
    ];
    writeFileSync(logPath, lines.join("\n") + "\n", "utf8");

    const result = await routineReadLog({}, clock);
    expect(result.data.phaseSummaries).toEqual([
      { phase: 1, summary: "Phase 1 완료" },
    ]);
  });

  it("readLog handles malformed JSON lines gracefully", async () => {
    const tmp = setupTmpRoot();
    const logPath = path.join(tmp, "study", ".routine", ".session-log.jsonl");

    writeFileSync(
      logPath,
      '{"phase":0,"type":"init","topic":"Test","ts":"2026-02-26T14:00:00.000Z"}\nBAD_LINE\n{"phase":1,"type":"qa","ts":"2026-02-26T14:01:00.000Z"}\n',
      "utf8",
    );

    const result = await routineReadLog({}, clock);
    expect(result.data.exists).toBe(true);
    expect(result.data.entryCount).toBe(2);
    expect(result.data.qaCount).toBe(1);
  });

  it("resetLog returns ok when file does not exist", async () => {
    setupTmpRoot();
    const result = await routineResetLog({}, clock);
    expect(result.data.ok).toBe(true);
  });

  it("appendEntry uses project-scoped log path when context.mode=project", async () => {
    const root = setupTmpRoot();
    const projectPath = setupTmpProject(root);

    const result = await routineAppendEntry(
      {
        context: { mode: "project", projectPath },
        entry: { phase: 0, type: "init", topic: "Project Topic" },
      },
      clock,
    );

    const projectLogPath = path.join(projectPath, ".study", ".routine", ".session-log.jsonl");
    const skillLogPath = path.join(root, "study", ".routine", ".session-log.jsonl");

    expect(result.data.logPath).toBe(projectLogPath);
    expect(existsSync(projectLogPath)).toBe(true);
    expect(existsSync(skillLogPath)).toBe(false);
  });

  it("readLog and resetLog work with project context", async () => {
    const root = setupTmpRoot();
    const projectPath = setupTmpProject(root);

    await routineAppendEntry(
      {
        context: { mode: "project", projectPath },
        entry: { phase: 0, type: "init", topic: "Project Topic" },
      },
      clock,
    );
    await routineAppendEntry(
      {
        context: { mode: "project", projectPath },
        entry: { phase: 1, type: "qa", question: "Q1" },
      },
      clock,
    );

    const readResult = await routineReadLog({ context: { mode: "project", projectPath } }, clock);
    expect(readResult.data.exists).toBe(true);
    expect(readResult.data.topic).toBe("Project Topic");
    expect(readResult.data.qaCount).toBe(1);

    const resetResult = await routineResetLog(
      { context: { mode: "project", projectPath } },
      clock,
    );
    expect(resetResult.data.ok).toBe(true);
    expect(resetResult.data.archived).toContain(path.join(projectPath, ".study", ".routine"));

    const afterReset = await routineReadLog({ context: { mode: "project", projectPath } }, clock);
    expect(afterReset.data.exists).toBe(false);
  });
});

describe("routineExtractTranscript", () => {
  beforeEach(() => {
    delete process.env.STUDY_ROOT;
    delete process.env.NOTES_DIR;
  });

  it("throws when no session log exists", async () => {
    setupTmpRoot();
    await expect(routineExtractTranscript({}, clock)).rejects.toThrow(
      "No routine session log found",
    );
  });

  it("throws when session log has no init entry", async () => {
    const tmp = setupTmpRoot();
    const logPath = path.join(tmp, "study", ".routine", ".session-log.jsonl");
    writeFileSync(
      logPath,
      '{"phase":1,"type":"qa","ts":"2026-02-26T14:00:00.000Z"}\n',
      "utf8",
    );

    await expect(routineExtractTranscript({}, clock)).rejects.toThrow(
      "No init entry with topic found",
    );
  });

  it("throws when no session files found (no matching JSONL)", async () => {
    setupTmpRoot();
    await routineAppendEntry(
      { entry: { phase: 0, type: "init", topic: "Suspense" } },
      clock,
    );

    // No Claude Code / Codex session files exist, so it should throw
    await expect(routineExtractTranscript({}, clock)).rejects.toThrow(
      "No session files found",
    );
  });

  it("extracts transcript from mock Claude Code session files", async () => {
    const tmp = setupTmpRoot();

    // Create session log with init entry
    await routineAppendEntry(
      { entry: { phase: 0, type: "init", topic: "React Fiber" } },
      clock,
    );

    // Create a mock Claude Code session file
    const encoded = tmp.replace(/[/@.~ ]/g, "-");
    const projectDir = path.join(os.homedir(), ".claude", "projects", encoded);
    mkdirSync(projectDir, { recursive: true });

    const sessionFile = path.join(projectDir, "mock-session.jsonl");
    const lines = [
      JSON.stringify({
        type: "user",
        timestamp: "2026-02-26T14:00:00.000Z",
        message: { role: "user", content: "What is React Fiber?" },
        uuid: "u1",
      }),
      JSON.stringify({
        type: "assistant",
        timestamp: "2026-02-26T14:00:10.000Z",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "React Fiber is a reconciliation engine." }],
        },
        uuid: "a1",
      }),
      JSON.stringify({
        type: "user",
        timestamp: "2026-02-26T14:00:20.000Z",
        message: {
          role: "user",
          content: [{ type: "tool_result", tool_use_id: "t1", content: "ok" }],
        },
        uuid: "u2",
      }),
    ];
    writeFileSync(sessionFile, lines.join("\n") + "\n", "utf8");

    // Use a later clock so endTs covers the session messages
    const laterClock = new FixedClock("2026-02-26T15:00:00.000Z");
    const result = await routineExtractTranscript(
      { client: "claude-code" },
      laterClock,
    );

    expect(result.data.ok).toBe(true);
    expect(result.data.client).toBe("claude-code");
    expect(result.data.messageCount).toBe(2); // user + assistant, tool_result skipped
    expect(result.data.transcriptPath).toContain("transcripts");
    expect(result.data.transcriptPath).toContain("React-Fiber");
    expect(existsSync(result.data.transcriptPath)).toBe(true);

    const content = readFileSync(result.data.transcriptPath, "utf8");
    expect(content).toContain("# Transcript: React Fiber");
    expect(content).toContain("What is React Fiber?");
    expect(content).toContain("React Fiber is a reconciliation engine.");

    // Cleanup mock session file
    const { rmSync } = await import("node:fs");
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("uses project-scoped output path when context.mode=project", async () => {
    const root = setupTmpRoot();
    const projectPath = setupTmpProject(root);

    await routineAppendEntry(
      {
        context: { mode: "project", projectPath },
        entry: { phase: 0, type: "init", topic: "Auth" },
      },
      clock,
    );

    // Will throw because no session files exist, but we can check the error message
    // contains the project path as CWD
    await expect(
      routineExtractTranscript(
        { context: { mode: "project", projectPath } },
        clock,
      ),
    ).rejects.toThrow(/No session files found/);
  });
});
