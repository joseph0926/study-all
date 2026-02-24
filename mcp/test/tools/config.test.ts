import { describe, expect, it, vi } from "vitest";
import { configGet } from "../../src/tools/config.js";

describe("config tools", () => {
  it("config.get returns config from env", async () => {
    vi.stubEnv("STUDY_ROOT", "/tmp/study-root");
    const result = await configGet();
    expect(result.data.studyRoot).toBe("/tmp/study-root");
    expect(result.data.notesDir).toContain("study");
    vi.unstubAllEnvs();
  });

  it("config.get throws if STUDY_ROOT is not set", async () => {
    vi.stubEnv("STUDY_ROOT", "");
    await expect(configGet()).rejects.toThrow("STUDY_ROOT");
    vi.unstubAllEnvs();
  });
});
