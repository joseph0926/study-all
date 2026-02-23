import path from "node:path";
import { describe, expect, it } from "vitest";
import { statsGetDashboard, statsGetRecommendation } from "../../src/tools/stats.js";

const ROOT = path.resolve(new URL("../../../", import.meta.url).pathname);

describe("stats tools", () => {
  it("stats.getDashboard aggregates skills", async () => {
    process.env.STUDY_ROOT = ROOT;

    const result = await statsGetDashboard({
      context: { mode: "skill", skill: "react" },
    });

    const names = result.data.skills.map((skill) => skill.name);
    expect(names).toContain("react");
    expect(names).toContain("nextjs");
  });

  it("stats.getRecommendation returns top items", async () => {
    process.env.STUDY_ROOT = ROOT;

    const result = await statsGetRecommendation({
      context: { mode: "skill", skill: "react" },
    });

    expect(result.data.items.length).toBeLessThanOrEqual(3);
  });
});
