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

  it("Coverage Analysis 헤더 행은 coverageRows에 포함하지 않는다", () => {
    const markdown = `# Demo

## Coverage Analysis
| Status | Module | Skill Target |
|--------|--------|--------------|
| ✅ 커버 | react | hooks.md |

## Phase 1: Familiar
### Topic 1: react ✅ 커버 — 1 files
- [ ] Step 1: demo
`;
    const result = parsePlan(markdown, "react");
    expect(result.coverageRows).toHaveLength(1);
    expect(result.coverageRows[0]?.module).toBe("react");
  });

  it("Topic module 추출 시 하이픈이 포함된 모듈명을 보존한다", () => {
    const markdown = `# Demo

## Phase 1: Familiar
### Topic 1: react-reconciler ✅ 커버 — 3 files
- [ ] Step 1: demo
`;
    const result = parsePlan(markdown, "react");
    const topic = result.phases[0]?.topics[0];
    expect(topic?.module).toBe("react-reconciler");
  });
});
