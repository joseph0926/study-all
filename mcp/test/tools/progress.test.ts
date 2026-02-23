import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  progressGetCoverageMap,
  progressGetModuleMap,
  progressGetNextTopic,
  progressGetPlan,
  progressUpdateCheckbox,
} from "../../src/tools/progress.js";

const ROOT = path.resolve(new URL("../../../", import.meta.url).pathname);

describe("progress tools", () => {
  it("progress.getPlan returns structured data", async () => {
    process.env.STUDY_ROOT = ROOT;

    const result = await progressGetPlan({
      context: { mode: "skill", skill: "react" },
      skill: "react",
    });

    expect(result.data.skill).toBe("react");
    expect(result.data.coverage.total).toBe(46);
    expect(result.data.phases.length).toBeGreaterThanOrEqual(1);
  });

  it("progress.getNextTopic returns next actionable step", async () => {
    process.env.STUDY_ROOT = ROOT;
    const result = await progressGetNextTopic({
      context: { mode: "skill", skill: "react" },
      skill: "react",
    });

    expect(result.data.topic.length).toBeGreaterThan(0);
    expect(result.data.phase.length).toBeGreaterThan(0);
  });

  it("progress.updateCheckbox updates checkbox in plan", async () => {
    const base = path.join(os.tmpdir(), `mcp-progress-${Date.now()}`);
    mkdirSync(path.join(base, ".study"), { recursive: true });
    writeFileSync(
      path.join(base, ".study", "plan.md"),
      `## Phase 1\n\n### Topic 1: demo\n- [ ] Step 1: test step\n`,
      "utf8",
    );

    const result = await progressUpdateCheckbox({
      context: { mode: "project", projectPath: base },
      topic: "demo",
      step: "Step 1: test step",
      done: true,
    });

    expect(result.data.ok).toBe(true);
    expect(result.data.updated).toBe(true);
  });

  it("progress.getModuleMap builds modules", async () => {
    const base = path.join(os.tmpdir(), `mcp-modules-${Date.now()}`);
    mkdirSync(path.join(base, "src", "api"), { recursive: true });
    writeFileSync(path.join(base, "src", "api", "index.ts"), "export {}\n", "utf8");

    const result = await progressGetModuleMap({
      context: { mode: "project", projectPath: base },
      sourceDir: base,
    });

    expect(result.data.modules.length).toBeGreaterThan(0);
  });

  it("progress.getCoverageMap compares module vs refs", async () => {
    const base = path.join(os.tmpdir(), `mcp-coverage-${Date.now()}`);
    const refs = path.join(base, "refs");
    mkdirSync(path.join(base, "src", "api"), { recursive: true });
    mkdirSync(refs, { recursive: true });
    writeFileSync(path.join(base, "src", "api", "index.ts"), "export {}\n", "utf8");
    writeFileSync(path.join(refs, "api.md"), "api module", "utf8");

    const result = await progressGetCoverageMap({
      context: { mode: "project", projectPath: base },
      sourceDir: base,
      refsDir: refs,
    });

    expect(result.data.covered).toContain("api");
  });
});
