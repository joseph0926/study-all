import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parsePlan } from "../../src/parsers/plan-parser.js";

describe("parsePlan", () => {
  it("Coverage Analysis 파싱", () => {
    const fixture = readFileSync(new URL("../fixtures/react/plan.md", import.meta.url), "utf8");
    const result = parsePlan(fixture, "react");

    expect(result.coverage.total).toBe(46);
    expect(result.coverage.covered).toBe(8);
    expect(result.coverage.rate).toBeCloseTo(0.174, 3);
  });

  it("Phase/Topic 계층 구조 파싱", () => {
    const fixture = readFileSync(new URL("../fixtures/react/plan.md", import.meta.url), "utf8");
    const result = parsePlan(fixture, "react");

    expect(result.phases.length).toBeGreaterThanOrEqual(1);
    expect(result.phases[0]?.name).toMatch(/Phase 1/);
    expect(result.phases[0]?.topics.length).toBeGreaterThan(0);
  });

  it("체크박스 상태 파싱", () => {
    const fixture = readFileSync(new URL("../fixtures/react/plan.md", import.meta.url), "utf8");
    const result = parsePlan(fixture, "react");
    const topic = result.phases.flatMap((phase) => phase.topics)[0];
    topic?.steps.forEach((step) => {
      expect(typeof step.done).toBe("boolean");
    });
  });

  it("빈 plan.md 처리", () => {
    const result = parsePlan("", "react");
    expect(result.phases).toEqual([]);
    expect(result.coverage.total).toBe(0);
  });
});
