import { mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { reviewAppendQnA, reviewGetMeta, reviewGetQueue, reviewRecordResult, reviewSaveMeta } from "../../src/tools/review.js";

describe("review tools", () => {
  it("review.getQueue in skill mode requires skill", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-skill-required-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    await expect(
      reviewGetQueue({
        context: { mode: "skill" },
      }),
    ).rejects.toThrow("mode=skill requires skill");
  });

  it("review.getQueue in skill mode scopes to one skill", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-skill-queue-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, "study", "react"), { recursive: true });
    mkdirSync(path.join(base, "study", "nextjs"), { recursive: true });

    await reviewSaveMeta({
      context: { mode: "skill", skill: "react" },
      skill: "react",
      topic: "React-Queue",
      meta: {
        concepts: [
          {
            name: "dispatcher",
            level: "L2",
            streak: 1,
            nextReview: "2026-01-01",
            graduated: false,
            attempts: 1,
          },
        ],
        sessionCount: 1,
      },
    });

    await reviewSaveMeta({
      context: { mode: "skill", skill: "nextjs" },
      skill: "nextjs",
      topic: "Nextjs-Queue",
      meta: {
        concepts: [
          {
            name: "router",
            level: "L2",
            streak: 1,
            nextReview: "2026-01-01",
            graduated: false,
            attempts: 1,
          },
        ],
        sessionCount: 1,
      },
    });

    const result = await reviewGetQueue({
      context: { mode: "skill", skill: "react" },
      skill: "react",
    });

    expect(result.data.items.length).toBeGreaterThan(0);
    expect(result.data.items.every((item) => item.skill === "react")).toBe(true);
    expect(result.data.items.some((item) => item.topic === "React-Queue")).toBe(true);
    expect(result.data.items.some((item) => item.topic === "Nextjs-Queue")).toBe(false);
  });

  it("review.saveMeta and review.getMeta round-trip", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, ".study"), { recursive: true });

    await reviewSaveMeta({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      meta: {
        concepts: [
          {
            name: "dispatcher",
            level: "L1",
            streak: 0,
            nextReview: "2026-02-23",
            graduated: false,
            attempts: 0,
          },
        ],
        sessionCount: 1,
      },
    });

    const result = await reviewGetMeta({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
    });

    expect(result.data.concepts.length).toBe(1);
    expect(result.data.concepts[0]?.name).toBe("dispatcher");
  });

  it("review.recordResult updates interval", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-record-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, ".study"), { recursive: true });

    await reviewSaveMeta({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      meta: {
        concepts: [
          {
            name: "dispatcher",
            level: "L1",
            streak: 0,
            nextReview: "2026-02-23",
            graduated: false,
            attempts: 0,
          },
        ],
        sessionCount: 1,
      },
    });

    const result = await reviewRecordResult({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      concept: "dispatcher",
      score: "first_pass",
      attempt: 1,
    });

    expect(result.data.streak).toBe(1);
    expect(result.data.level).toBe("L2");
  });

  it("review.appendQnA creates and appends to qa file", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-qa-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, ".study"), { recursive: true });

    const result = await reviewAppendQnA({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      items: [
        {
          concept: "dispatcher",
          question: "Dispatcher 생명주기는?",
          userAnswer: "Mount→OnMount, Update→OnUpdate, 완료→ContextOnly",
          score: "first_pass",
          level: "L2",
        },
      ],
    });

    expect(result.data.ok).toBe(true);
    const content = readFileSync(result.data.filePath, "utf8");
    expect(content).toContain("# Demo Review QnA");
    expect(content).toContain("dispatcher");
    expect(content).toContain("first_pass → L2");
  });

  it("review.appendQnA appends to existing qa file", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-qa-append-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, ".study"), { recursive: true });

    await reviewAppendQnA({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      items: [
        {
          concept: "concept-a",
          question: "Q1?",
          userAnswer: "A1",
          score: "first_pass",
          level: "L1",
        },
      ],
    });

    await reviewAppendQnA({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      items: [
        {
          concept: "concept-b",
          question: "Q2?",
          userAnswer: "A2",
          hint: "힌트입니다",
          score: "retry_pass",
          level: "L2",
        },
      ],
    });

    const content = readFileSync(path.join(base, ".study", "Demo-qa.md"), "utf8");
    // 헤더는 1번만
    const headerCount = (content.match(/# Demo Review QnA/g) ?? []).length;
    expect(headerCount).toBe(1);
    expect(content).toContain("concept-a");
    expect(content).toContain("concept-b");
    expect(content).toContain("**Hint**: 힌트입니다");
  });

  it("review.recordResult wrong resets streak and downgrades level", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-wrong-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, ".study"), { recursive: true });

    await reviewSaveMeta({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      meta: {
        concepts: [
          {
            name: "dispatcher",
            level: "L2",
            streak: 2,
            nextReview: "2026-02-23",
            graduated: false,
            attempts: 2,
          },
        ],
        sessionCount: 2,
      },
    });

    const result = await reviewRecordResult({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      concept: "dispatcher",
      score: "wrong",
      attempt: 1,
    });

    expect(result.data.streak).toBe(0);
    expect(result.data.level).toBe("L1");
    expect(result.data.graduated).toBe(false);
  });

  it("review.recordResult retry_pass keeps level, resets streak", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-retry-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, ".study"), { recursive: true });

    await reviewSaveMeta({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      meta: {
        concepts: [
          {
            name: "dispatcher",
            level: "L2",
            streak: 2,
            nextReview: "2026-02-23",
            graduated: false,
            attempts: 2,
          },
        ],
        sessionCount: 2,
      },
    });

    const result = await reviewRecordResult({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      concept: "dispatcher",
      score: "retry_pass",
      attempt: 1,
    });

    expect(result.data.streak).toBe(0);
    expect(result.data.level).toBe("L2");
    expect(result.data.graduated).toBe(false);
  });

  it("review.recordResult first_pass graduates at streak >= 3", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-grad-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, ".study"), { recursive: true });

    await reviewSaveMeta({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      meta: {
        concepts: [
          {
            name: "dispatcher",
            level: "L3",
            streak: 2,
            nextReview: "2026-02-23",
            graduated: false,
            attempts: 2,
          },
        ],
        sessionCount: 2,
      },
    });

    const result = await reviewRecordResult({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      concept: "dispatcher",
      score: "first_pass",
      attempt: 1,
    });

    expect(result.data.streak).toBe(3);
    expect(result.data.level).toBe("L4");
    expect(result.data.graduated).toBe(true);
  });

  it("review.recordResult creates new concept if not in meta", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-new-concept-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, ".study"), { recursive: true });

    await reviewSaveMeta({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      meta: {
        concepts: [],
        sessionCount: 0,
      },
    });

    const result = await reviewRecordResult({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      concept: "new-concept",
      score: "first_pass",
      attempt: 1,
    });

    expect(result.data.streak).toBe(1);
    expect(result.data.level).toBe("L2");
  });

  it("review.getQueue excludes graduated items", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-graduated-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, ".study"), { recursive: true });

    await reviewSaveMeta({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      meta: {
        concepts: [
          {
            name: "graduated-concept",
            level: "L4",
            streak: 3,
            nextReview: "2026-01-01",
            graduated: true,
            attempts: 5,
          },
          {
            name: "active-concept",
            level: "L2",
            streak: 1,
            nextReview: "2026-01-01",
            graduated: false,
            attempts: 1,
          },
        ],
        sessionCount: 5,
      },
    });

    const result = await reviewGetQueue({
      context: { mode: "project", projectPath: base },
    });

    const conceptNames = result.data.items.map((item) => item.concept);
    expect(conceptNames).toContain("active-concept");
    expect(conceptNames).not.toContain("graduated-concept");
    expect(result.data.graduated).toBe(1);
  });

  it("review.getQueue excludes future items", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-future-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, ".study"), { recursive: true });

    await reviewSaveMeta({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      meta: {
        concepts: [
          {
            name: "future-concept",
            level: "L2",
            streak: 1,
            nextReview: "2099-12-31",
            graduated: false,
            attempts: 1,
          },
        ],
        sessionCount: 1,
      },
    });

    const result = await reviewGetQueue({
      context: { mode: "project", projectPath: base },
    });

    expect(result.data.items.length).toBe(0);
    expect(result.data.totalActive).toBe(1);
  });

  it("review.getQueue returns due items", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-queue-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, ".study"), { recursive: true });

    await reviewSaveMeta({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      meta: {
        concepts: [
          {
            name: "dispatcher",
            level: "L2",
            streak: 1,
            nextReview: "2026-01-01",
            graduated: false,
            attempts: 1,
          },
        ],
        sessionCount: 1,
      },
    });

    const result = await reviewGetQueue({
      context: { mode: "project", projectPath: base },
    });

    expect(result.data.items.length).toBeGreaterThan(0);
    expect(result.data.items[0]?.nextReview).toBe("2026-01-01");
    expect(result.data.items[0]?.lastReview).toBeUndefined();
  });
});
