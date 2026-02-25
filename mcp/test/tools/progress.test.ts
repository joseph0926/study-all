import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { progressGetModuleMap, progressGetPlan, progressUpdateCheckbox } from "../../src/tools/progress.js";

const ROOT = path.resolve(new URL("../../../", import.meta.url).pathname);

describe("progress tools", () => {
  it("progress.getPlan returns structured data", async () => {
    const base = path.join(os.tmpdir(), `mcp-plan-${Date.now()}`);
    mkdirSync(path.join(base, "study", "react"), { recursive: true });
    writeFileSync(
      path.join(base, "study", "react", "plan.md"),
      `# react Study Plan\n\n## Coverage Analysis\n\n| Status | Module | Target |\n|--------|--------|--------|\n| ✅ | core | Core.md |\n| ⬜ | utils | Utils.md |\n\n**커버율**: 1/2 (50.0%)\n\n## Phase 1: Core\n\n### Topic 1: core\n- [x] Step 1: basics\n- [ ] Step 2: advanced\n`,
      "utf8",
    );
    process.env.STUDY_ROOT = base;

    const result = await progressGetPlan({
      context: { mode: "skill", skill: "react" },
      skill: "react",
    });

    expect(result.data.skill).toBe("react");
    expect(result.data.coverage.total).toBe(2);
    expect(result.data.phases.length).toBeGreaterThanOrEqual(1);
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

  it("progress.updateCheckbox does not update when topic is missing", async () => {
    const base = path.join(os.tmpdir(), `mcp-progress-miss-${Date.now()}`);
    mkdirSync(path.join(base, ".study"), { recursive: true });
    writeFileSync(
      path.join(base, ".study", "plan.md"),
      `## Phase 1\n\n### Topic 1: alpha\n- [ ] Step 1: shared\n\n### Topic 2: beta\n- [ ] Step 1: shared\n`,
      "utf8",
    );
    process.env.STUDY_ROOT = base;

    const result = await progressUpdateCheckbox({
      context: { mode: "project", projectPath: base },
      topic: "unknown-topic",
      step: "Step 1: shared",
      done: true,
    });

    expect(result.data.ok).toBe(true);
    expect(result.data.updated).toBe(false);
    const text = readFileSync(path.join(base, ".study", "plan.md"), "utf8");
    expect(text).not.toContain("[x] Step 1: shared");
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
});
