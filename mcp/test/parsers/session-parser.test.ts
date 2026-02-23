import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getResumePoint } from "../../src/parsers/session-parser.js";

describe("getResumePoint", () => {
  it("마지막 세션 재개점 추출", () => {
    const fixture = readFileSync(new URL("../fixtures/react/React-Core-API.md", import.meta.url), "utf8");
    const result = getResumePoint(fixture);

    expect(result.exists).toBe(true);
    expect(result.lastDate).toBe("2026-02-22");
    expect(result.completedSteps).toContain("1.1: mapIntoArray 재귀 순회 — 중첩 배열/iterable children을 평탄화하는 핵심 알고리즘");
  });

  it("완료/미완료 스텝 분리", () => {
    const fixture = readFileSync(new URL("../fixtures/react/React-Core-API.md", import.meta.url), "utf8");
    const result = getResumePoint(fixture);

    expect(result.completedSteps.length).toBe(2);
    expect(result.pendingSteps.length).toBe(8);
  });

  it("학습 요약 추출", () => {
    const fixture = readFileSync(new URL("../fixtures/react/React-Core-API.md", import.meta.url), "utf8");
    const result = getResumePoint(fixture);

    expect(result.summary).toContain("React.Children.map()");
  });

  it("세션 기록 없는 경우", () => {
    const result = getResumePoint("");
    expect(result.exists).toBe(false);
  });

  it("여러 세션이면 마지막 세션 우선", () => {
    const fixture = readFileSync(new URL("../fixtures/react/React-Core-API.md", import.meta.url), "utf8");
    const multi = `${fixture}\n\n## 2026-02-20\n\n### 학습 로드맵\n- [ ] Step 1: 새 토픽`;
    const result = getResumePoint(multi);

    expect(result.lastDate).toBe("2026-02-20");
    expect(result.pendingSteps).toContain("Step 1: 새 토픽");
  });
});
