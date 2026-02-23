import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getResumePoint } from "../../src/parsers/session-parser.js";

describe("getResumePoint", () => {
  it("마지막 세션 재개점 추출", () => {
    const fixture = readFileSync(new URL("../fixtures/react/React-Core-API.md", import.meta.url), "utf8");
    const result = getResumePoint(fixture);

    expect(result.exists).toBe(true);
    expect(result.lastDate).toBe("2026-02-11");
    expect(result.completedSteps).toContain("Step 1: ReactElement & $$typeof");
  });

  it("완료/미완료 스텝 분리", () => {
    const fixture = readFileSync(new URL("../fixtures/react/React-Core-API.md", import.meta.url), "utf8");
    const result = getResumePoint(fixture);

    expect(result.completedSteps.length).toBe(6);
    expect(result.pendingSteps.length).toBe(0);
  });

  it("학습 요약 추출", () => {
    const fixture = readFileSync(new URL("../fixtures/react/React-Core-API.md", import.meta.url), "utf8");
    const result = getResumePoint(fixture);

    expect(result.summary).toContain("React 패키지의 Core API Surface");
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
