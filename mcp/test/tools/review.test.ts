import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { reviewGetMeta, reviewGetQueue, reviewRecordResult, reviewSaveMeta } from "../../src/tools/review.js";

describe("review tools", () => {
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
  });
});
