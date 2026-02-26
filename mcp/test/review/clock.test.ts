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
    expect(r1.graduated).toBe(false);

    const r2 = calculateNextReview({
      score: "first_pass",
      streak: 1,
      level: "L2",
      now: new Date("2026-02-23T00:00:00.000Z"),
    });
    expect(r2.nextInterval).toBe(14);
    expect(r2.graduated).toBe(false);

    const r3 = calculateNextReview({
      score: "first_pass",
      streak: 3,
      level: "L3",
      now: new Date("2026-02-23T00:00:00.000Z"),
    });
    expect(r3.nextInterval).toBe(30);
  });

  it("streak >= 3이면 graduated", () => {
    const result = calculateNextReview({
      score: "first_pass",
      streak: 2,
      level: "L3",
      now: new Date("2026-02-23T00:00:00.000Z"),
    });
    expect(result.streak).toBe(3);
    expect(result.graduated).toBe(true);
    expect(result.level).toBe("L4");
  });

  it("오답 시 L1 이하로 내려가지 않음", () => {
    const result = calculateNextReview({
      score: "wrong",
      streak: 0,
      level: "L1",
      now: new Date("2026-02-23T00:00:00.000Z"),
    });
    expect(result.level).toBe("L1");
    expect(result.graduated).toBe(false);
  });

  it("interval 최대값 30일 제한", () => {
    const result = calculateNextReview({
      score: "first_pass",
      streak: 10,
      level: "L4",
      now: new Date("2026-02-23T00:00:00.000Z"),
    });
    expect(result.nextInterval).toBe(30);
  });
});
