import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildModuleMap } from "../../src/parsers/module-map.js";

describe("buildModuleMap", () => {
  it("packages/* 패턴 모듈 추출", async () => {
    const base = path.join(os.tmpdir(), `mcp-module-${Date.now()}`);
    mkdirSync(path.join(base, "packages", "react", "src"), { recursive: true });
    mkdirSync(path.join(base, "packages", "scheduler", "src"), { recursive: true });

    writeFileSync(path.join(base, "packages", "react", "index.ts"), "export {}\n", "utf8");
    writeFileSync(path.join(base, "packages", "react", "src", "hooks.ts"), "export const hooks = true\n", "utf8");
    writeFileSync(path.join(base, "packages", "scheduler", "index.ts"), "export {}\n", "utf8");

    const map = await buildModuleMap(base);
    expect(map.modules.length).toBe(2);
    expect(map.modules.map((m) => m.name)).toContain("react");
    expect(map.modules.map((m) => m.name)).toContain("scheduler");
  });

  it("AI 필터링 없이 전체 모듈 포함", async () => {
    const base = path.join(os.tmpdir(), `mcp-module-all-${Date.now()}`);
    mkdirSync(path.join(base, "packages", "react-devtools"), { recursive: true });
    mkdirSync(path.join(base, "packages", "jest-react"), { recursive: true });

    writeFileSync(path.join(base, "packages", "react-devtools", "index.ts"), "export {}\n", "utf8");
    writeFileSync(path.join(base, "packages", "jest-react", "index.ts"), "export {}\n", "utf8");

    const map = await buildModuleMap(base);
    expect(map.modules.map((m) => m.name)).toContain("react-devtools");
    expect(map.modules.map((m) => m.name)).toContain("jest-react");
  });
});
