import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { reviewAppendQnA, reviewGetMeta, reviewGetQueue, reviewRecordResult, reviewRemoveConcept, reviewSaveMeta } from "../../src/tools/review.js";

describe("review tools", () => {
  it("review.getQueue without skill returns all skills", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-all-skills-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, "study", "react"), { recursive: true });
    mkdirSync(path.join(base, "study", "nextjs"), { recursive: true });

    await reviewSaveMeta({
      context: { mode: "skill", skill: "react" },
      skill: "react",
      topic: "React-All",
      meta: {
        concepts: [
          { name: "hooks", level: "L1", streak: 0, nextReview: "2026-01-01", graduated: false, attempts: 0 },
        ],
        sessionCount: 0,
      },
    });

    await reviewSaveMeta({
      context: { mode: "skill", skill: "nextjs" },
      skill: "nextjs",
      topic: "Nextjs-All",
      meta: {
        concepts: [
          { name: "router", level: "L2", streak: 1, nextReview: "2026-01-01", graduated: false, attempts: 1 },
        ],
        sessionCount: 1,
      },
    });

    const result = await reviewGetQueue({
      context: { mode: "skill" },
    });

    expect(result.data.items.length).toBe(2);
    const skills = result.data.items.map((item) => item.skill);
    expect(skills).toContain("react");
    expect(skills).toContain("nextjs");
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
    expect(result.data.filePath).toContain(path.join(".study", "topics", "Demo", "review", "qa"));
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

    const content = readFileSync(path.join(base, ".study", "topics", "Demo", "review", "qa", `${new Date().toISOString().slice(0, 7)}.md`), "utf8");
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

  it("review.removeConcept removes matching concept", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-remove-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, ".study"), { recursive: true });

    await reviewSaveMeta({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      meta: {
        concepts: [
          { name: "keep-me", level: "L2", streak: 1, nextReview: "2026-01-01", graduated: false, attempts: 1 },
          { name: "remove-me", level: "L1", streak: 0, nextReview: "2026-01-01", graduated: false, attempts: 0 },
        ],
        sessionCount: 1,
      },
    });

    const result = await reviewRemoveConcept({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      concept: "remove-me",
    });

    expect(result.data.ok).toBe(true);
    expect(result.data.removed).toBe(true);

    const meta = await reviewGetMeta({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
    });
    expect(meta.data.concepts.length).toBe(1);
    expect(meta.data.concepts[0]?.name).toBe("keep-me");
  });

  it("review.removeConcept returns removed=false when concept not found", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-remove-miss-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, ".study"), { recursive: true });

    await reviewSaveMeta({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      meta: {
        concepts: [
          { name: "existing", level: "L1", streak: 0, nextReview: "2026-01-01", graduated: false, attempts: 0 },
        ],
        sessionCount: 0,
      },
    });

    const result = await reviewRemoveConcept({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
      concept: "nonexistent",
    });

    expect(result.data.ok).toBe(true);
    expect(result.data.removed).toBe(false);

    const meta = await reviewGetMeta({
      context: { mode: "project", projectPath: base },
      topic: "Demo",
    });
    expect(meta.data.concepts.length).toBe(1);
  });

  it("review.getQueue discovers nested topic_dir notes", async () => {
    const base = path.join(os.tmpdir(), `mcp-review-topic-dir-${Date.now()}`);
    process.env.STUDY_ROOT = base;
    mkdirSync(path.join(base, "study", "react", "topics", "Lane-Model-and-Priority", "review"), { recursive: true });
    writeFileSync(
      path.join(base, "study", "react", "topics", "Lane-Model-and-Priority", "note.md"),
      "---\ntitle: Lane-Model-and-Priority\naliases:\n  - Lane-Model-And-Priority\n---\n# Lane\n\n## 2026-02-24\n\nSession content.\n",
      "utf8",
    );
    writeFileSync(
      path.join(base, "study", "react", "topics", "Lane-Model-and-Priority", "review", "meta.md"),
      "# Lane-Model-and-Priority Review Meta\n\nsessionCount: 1\n\n| Concept | Level | Streak | NextReview | Graduated | Attempts |\n|---|---|---:|---|---|---:|\n| scheduler | L2 | 1 | 2026-01-01 | false | 1 |\n",
      "utf8",
    );

    const result = await reviewGetQueue({
      context: { mode: "skill", skill: "react" },
      skill: "react",
    });

    expect(result.data.items.some((item) => item.topic === "Lane-Model-and-Priority")).toBe(true);
    expect(result.data.items.some((item) => item.concept === "scheduler")).toBe(true);
  });
});
