import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { contextResolve } from "../../src/tools/context.js";

function makeTmpDir(): string {
  const base = path.join(os.tmpdir(), `mcp-ctx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(base, { recursive: true });
  return base;
}

function makeRefDir(base: string, name: string): void {
  mkdirSync(path.join(base, "ref", name), { recursive: true });
  mkdirSync(path.join(base, "study"), { recursive: true });
}

describe("detectSourceDir dynamic scanning", () => {
  let savedRoot: string | undefined;

  afterEach(() => {
    if (savedRoot !== undefined) {
      process.env.STUDY_ROOT = savedRoot;
    }
  });

  function setup(refDirs: string[]): string {
    savedRoot = process.env.STUDY_ROOT;
    const base = makeTmpDir();
    for (const dir of refDirs) {
      makeRefDir(base, dir);
    }
    process.env.STUDY_ROOT = base;
    return base;
  }

  it("exact match: skill=react → ref/react/", async () => {
    const base = setup(["react"]);
    const result = await contextResolve({ mode: "skill", skill: "react" });
    expect(result.data.context.sourceDir).toBe(path.join(base, "ref", "react"));
  });

  it("stripped-punctuation match: skill=nextjs → ref/next.js/", async () => {
    const base = setup(["next.js"]);
    const result = await contextResolve({ mode: "skill", skill: "nextjs" });
    expect(result.data.context.sourceDir).toBe(path.join(base, "ref", "next.js"));
  });

  it("suffix-stripped match: skill=react → ref/react-fork/", async () => {
    const base = setup(["react-fork"]);
    const result = await contextResolve({ mode: "skill", skill: "react" });
    expect(result.data.context.sourceDir).toBe(path.join(base, "ref", "react-fork"));
  });

  it("prefix match: skill=react → ref/react-anything/", async () => {
    const base = setup(["react-anything"]);
    const result = await contextResolve({ mode: "skill", skill: "react" });
    expect(result.data.context.sourceDir).toBe(path.join(base, "ref", "react-anything"));
  });

  it("exact match takes priority over suffix-stripped match", async () => {
    const base = setup(["react", "react-fork"]);
    const result = await contextResolve({ mode: "skill", skill: "react" });
    expect(result.data.context.sourceDir).toBe(path.join(base, "ref", "react"));
  });

  it("no match returns undefined", async () => {
    setup(["vue", "angular"]);
    const result = await contextResolve({ mode: "skill", skill: "svelte" });
    expect(result.data.context.sourceDir).toBeUndefined();
  });

  it("suffix-stripped match: skill=react → ref/react.dev/", async () => {
    const base = setup(["react.dev"]);
    const result = await contextResolve({ mode: "skill", skill: "react" });
    expect(result.data.context.sourceDir).toBe(path.join(base, "ref", "react.dev"));
  });
});
