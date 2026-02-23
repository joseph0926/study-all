import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sessionAppendLog, sessionGetResumePoint, sessionGetSourcePaths } from "../../src/tools/session.js";

const ROOT = path.resolve(new URL("../../../", import.meta.url).pathname);

describe("session tools", () => {
  it("session.getResumePoint returns existing resume", async () => {
    process.env.STUDY_ROOT = ROOT;

    const result = await sessionGetResumePoint({
      context: { mode: "skill", skill: "react" },
      topic: "React-Core-API",
    });

    expect(result.data.exists).toBe(true);
    expect(result.data.lastDate).toBe("2026-02-11");
  });

  it("session.appendLog appends section", async () => {
    const base = path.join(os.tmpdir(), `mcp-session-${Date.now()}`);
    mkdirSync(path.join(base, ".study"), { recursive: true });
    const filePath = path.join(base, ".study", "Demo.md");
    writeFileSync(filePath, "# Demo\n", "utf8");

    const result = await sessionAppendLog({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      content: "### 학습 로드맵\n- [ ] Step 1: demo",
    });

    expect(result.data.ok).toBe(true);
    const next = readFileSync(filePath, "utf8");
    expect(next).toContain("via /project-learn");
  });

  it("session.getSourcePaths returns files", async () => {
    process.env.STUDY_ROOT = ROOT;

    const result = await sessionGetSourcePaths({
      context: { mode: "skill", skill: "react" },
    });

    expect(result.data.sourceDir.length).toBeGreaterThan(0);
    expect(Array.isArray(result.data.files)).toBe(true);
  });
});
