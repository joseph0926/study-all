import { describe, expect, it } from "vitest";
import { parseMeta } from "../../src/parsers/meta-parser.js";

describe("parseMeta", () => {
  it("복습 메타 파싱", () => {
    const fixture = `# Topic Meta\n\n| Concept | Level | Streak | NextReview | Graduated | Attempts |\n|---|---|---:|---|---|---:|\n| $$typeof XSS 방어 원리 | L2 | 1 | 2026-02-25 | false | 2 |`;

    const meta = parseMeta(fixture, "React-Core-API");
    expect(meta.concepts.length).toBeGreaterThan(0);
    meta.concepts.forEach((concept) => {
      expect(concept).toHaveProperty("name");
      expect(concept).toHaveProperty("level");
      expect(concept).toHaveProperty("streak");
      expect(concept).toHaveProperty("nextReview");
      expect(concept).toHaveProperty("graduated");
    });
  });

  it("졸업 판정 값 유지", () => {
    const fixture = `| Concept | Level | Streak | NextReview | Graduated | Attempts |\n|---|---|---:|---|---|---:|\n| A | L4 | 3 | 2026-03-01 | true | 9 |`;
    const meta = parseMeta(fixture, "Topic");
    const graduated = meta.concepts.filter((concept) => concept.graduated);
    expect(graduated.length).toBeGreaterThan(0);
    graduated.forEach((concept) => expect(concept.streak).toBeGreaterThanOrEqual(3));
  });

  it("메타 파일 없는 경우", () => {
    const meta = parseMeta("", "Topic");
    expect(meta.concepts).toEqual([]);
    expect(meta.sessionCount).toBe(0);
  });
});
