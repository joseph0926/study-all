import { describe, expect, it } from "vitest";
import { makeEnvelope } from "../../src/lib/envelope.js";
import { FixedClock } from "../../src/lib/clock.js";

describe("envelope", () => {
  it("모든 도구 응답 envelope 구조", () => {
    const envelope = makeEnvelope(
      { ok: true },
      new FixedClock("2026-02-23T09:00:00.000Z"),
      { hit: false, key: "k1", invalidatedReason: "cold-start" },
    );

    expect(envelope.schemaVersion).toBe("1.0.0");
    expect(envelope.generatedAt).toBe("2026-02-23T09:00:00.000Z");
    expect(envelope.data.ok).toBe(true);
    expect(envelope.cache?.key).toBe("k1");
  });
});
