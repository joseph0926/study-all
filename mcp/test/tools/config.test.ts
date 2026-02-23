import { describe, expect, it } from "vitest";
import { configGet, configSet } from "../../src/tools/config.js";

describe("config tools", () => {
  it("config.get returns config", async () => {
    const result = await configGet();
    expect(result.data.studyRoot.length).toBeGreaterThan(0);
    expect(result.data.docsDir.length).toBeGreaterThan(0);
  });

  it("config.set updates override", async () => {
    await configSet({ key: "docsDir", value: "/tmp/docs" });
    const result = await configGet();
    expect(result.data.docsDir).toBe("/tmp/docs");
  });
});
