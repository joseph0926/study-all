import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { dailyFinalize, dailyGetStatus, dailyLogDone, dailyLogPlan } from "../../src/tools/daily.js";

describe("daily tools", () => {
  it("status -> plan -> done -> finalize 흐름", async () => {
    const logsDir = mkdtempSync(path.join(os.tmpdir(), "mcp-daily-"));
    process.env.STUDY_ROOT = logsDir;
    process.env.STUDY_LOGS_DIR = logsDir;

    const baseCtx = { context: { mode: "skill" as const, skill: "react" } };

    const before = await dailyGetStatus(baseCtx);
    expect(before.data.todayState).toBe("NONE");

    await dailyLogPlan({ ...baseCtx, plan: "React 공부 2시간" });
    const planned = await dailyGetStatus(baseCtx);
    expect(planned.data.todayState).toBe("PLANNING");

    const done = await dailyLogDone({ ...baseCtx, report: "계획 대부분 완료 80%" });
    expect(done.data.achievementRate).toBe(80);

    await dailyFinalize(baseCtx);
    const final = await dailyGetStatus(baseCtx);
    expect(final.data.todayState).toBe("DONE");
  });
});
