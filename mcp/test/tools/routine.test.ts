import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import { FixedClock } from "../../src/lib/clock.js";
import { routineAppendEntry, routineReadLog, routineResetLog } from "../../src/tools/routine.js";

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
      { entry: { phase: 3, type: "checkpoint", q1: "Q1", q1Answer: "A1", q2: "Q2", q2Answer: "A2", result: "PASS" } },
      clock,
    );

    const result = await routineReadLog({}, clock);
    expect(result.data.checkpointResult).toBe("PASS");
    expect(result.data.currentPhase).toBe(3);
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
