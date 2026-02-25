import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sessionAppendLog, sessionGetResumePoint, sessionGetSourceDigest, sessionGetSourcePaths } from "../../src/tools/session.js";

const ROOT = path.resolve(new URL("../../../", import.meta.url).pathname);

describe("session tools", () => {
  it("session.getResumePoint returns existing resume", async () => {
    process.env.STUDY_ROOT = ROOT;

    const result = await sessionGetResumePoint({
      context: { mode: "skill", skill: "react" },
      topic: "React-Core-API",
    });

    expect(result.data.exists).toBe(true);
    expect(result.data.lastDate).toBe("2026-02-24");
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

  it("session.appendLog uses custom via marker when provided", async () => {
    const base = path.join(os.tmpdir(), `mcp-session-via-${Date.now()}`);
    mkdirSync(path.join(base, ".study"), { recursive: true });
    const filePath = path.join(base, ".study", "Demo.md");
    writeFileSync(filePath, "# Demo\n", "utf8");

    const result = await sessionAppendLog({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      content: "### 분석 결과\n- P1: 개선점",
      via: "via /project",
    });

    expect(result.data.ok).toBe(true);
    const text = readFileSync(filePath, "utf8");
    expect(text).toContain("via /project");
    expect(text).not.toContain("via /project-learn");
  });

  it("session.appendLog uses default marker when via is omitted", async () => {
    const base = path.join(os.tmpdir(), `mcp-session-default-${Date.now()}`);
    mkdirSync(path.join(base, ".study"), { recursive: true });
    const filePath = path.join(base, ".study", "Demo.md");
    writeFileSync(filePath, "# Demo\n", "utf8");

    const result = await sessionAppendLog({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      content: "### 학습 내용\n- Step 1: demo",
    });

    expect(result.data.ok).toBe(true);
    const text = readFileSync(filePath, "utf8");
    expect(text).toContain("via /project-learn");
  });

  it("session.getSourcePaths returns files", async () => {
    process.env.STUDY_ROOT = ROOT;

    const result = await sessionGetSourcePaths({
      context: { mode: "skill", skill: "react" },
    });

    expect(result.data.sourceDir.length).toBeGreaterThan(0);
    expect(Array.isArray(result.data.files)).toBe(true);
  });

  it("session.getSourcePaths supports sourceDir override when skill source is not auto-detected", async () => {
    process.env.STUDY_ROOT = ROOT;
    const sourceDir = path.join(ROOT, "ref", "react-fork");

    const result = await sessionGetSourcePaths({
      context: { mode: "skill", skill: "learn" },
      sourceDir,
    });

    expect(result.data.sourceDir).toBe(sourceDir);
    expect(result.data.files.length).toBeGreaterThan(0);
  });

  it("session.getSourceDigest returns tree, overview, existingTopics", async () => {
    process.env.STUDY_ROOT = ROOT;

    const result = await sessionGetSourceDigest({
      context: { mode: "skill", skill: "react" },
    });

    expect(result.data.sourceDir.length).toBeGreaterThan(0);
    expect(Array.isArray(result.data.tree)).toBe(true);
    expect(typeof result.data.overview).toBe("string");
    expect(Array.isArray(result.data.existingTopics)).toBe(true);
  });

  it("session.getSourceDigest supports sourceDir override when skill source is not auto-detected", async () => {
    process.env.STUDY_ROOT = ROOT;
    const sourceDir = path.join(ROOT, "ref", "react-fork");

    const result = await sessionGetSourceDigest({
      context: { mode: "skill", skill: "learn" },
      sourceDir,
    });

    expect(result.data.sourceDir).toBe(sourceDir);
    expect(result.data.tree.length).toBeGreaterThan(0);
  });

  it("session.getSourceDigest returns cache hit on second call", async () => {
    process.env.STUDY_ROOT = ROOT;

    await sessionGetSourceDigest({
      context: { mode: "skill", skill: "react" },
    });

    const result2 = await sessionGetSourceDigest({
      context: { mode: "skill", skill: "react" },
    });

    expect(result2.cache?.hit).toBe(true);
  });
});
