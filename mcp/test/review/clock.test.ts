import { describe, expect, it } from "vitest";
import { calculateNextReview } from "../../src/tools/review.js";

describe("calculateNextReview", () => {
  it("오답 -> +1일, streak 0", () => {
    const result = calculateNextReview({
      score: "wrong",
      streak: 2,
      level: "L2",
      now: new Date("2026-02-23T00:00:00.000Z"),
    });
    expect(result.nextInterval).toBe(1);
    expect(result.streak).toBe(0);
    expect(result.level).toBe("L1");
    expect(result.nextReviewDate).toBe("2026-02-24");
  });

  it("재시도 통과 -> +3일", () => {
    const result = calculateNextReview({
      score: "retry_pass",
      streak: 1,
      level: "L2",
      now: new Date("2026-02-23T00:00:00.000Z"),
    });
    expect(result.nextInterval).toBe(3);
    expect(result.level).toBe("L2");
    expect(result.nextReviewDate).toBe("2026-02-26");
  });

  it("첫 시도 통과 -> +7일 * 2^(streak-1)", () => {
    const r1 = calculateNextReview({
      score: "first_pass",
      streak: 0,
      level: "L1",
      now: new Date("2026-02-23T00:00:00.000Z"),
    });
    expect(r1.nextInterval).toBe(7);

    const r2 = calculateNextReview({
      score: "first_pass",
      streak: 1,
      level: "L2",
      now: new Date("2026-02-23T00:00:00.000Z"),
    });
    expect(r2.nextInterval).toBe(14);

    const r3 = calculateNextReview({
      score: "first_pass",
      streak: 3,
      level: "L3",
      now: new Date("2026-02-23T00:00:00.000Z"),
    });
    expect(r3.nextInterval).toBe(30);
  });
});
