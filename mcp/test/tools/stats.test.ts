import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { statsGetDashboard, statsGetRecommendation } from "../../src/tools/stats.js";

function makeFixture(): string {
  const base = path.join(os.tmpdir(), `mcp-stats-${Date.now()}`);
  mkdirSync(path.join(base, "study", "react"), { recursive: true });
  mkdirSync(path.join(base, "study", "nextjs"), { recursive: true });
  writeFileSync(
    path.join(base, "study", "react", "React-Core-API.md"),
    `# React Core API\n\n## 2026-02-24\n\nSession content.\n`,
    "utf8",
  );
  writeFileSync(
    path.join(base, "study", "nextjs", "Next-Src-Api.md"),
    `# Next Src Api\n\n## 2026-02-20\n\nSession content.\n`,
    "utf8",
  );
  return base;
}

describe("stats tools", () => {
  it("stats.getDashboard aggregates skills", async () => {
    const base = makeFixture();
    process.env.STUDY_ROOT = base;

    const result = await statsGetDashboard({
      context: { mode: "skill", skill: "react" },
    });

    const names = result.data.skills.map((skill) => skill.name);
    expect(names).toContain("react");
    expect(names).toContain("nextjs");
  });

  it("stats.getRecommendation returns top items", async () => {
    const base = makeFixture();
    process.env.STUDY_ROOT = base;

    const result = await statsGetRecommendation({
      context: { mode: "skill", skill: "react" },
    });

    expect(result.data.items.length).toBeLessThanOrEqual(3);
  });
});
