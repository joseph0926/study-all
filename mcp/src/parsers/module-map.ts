import { promises as fs } from "node:fs";
import path from "node:path";
import type { ModuleInfo, ModuleMapResult } from "../types/domain.js";

const DEFAULT_IGNORE = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "target",
  "vendor",
  "__pycache__",
  ".venv",
  ".study",
]);

async function isDirectory(target: string): Promise<boolean> {
  try {
    const stat = await fs.stat(target);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function listDirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(dir, entry.name));
  } catch {
    return [];
  }
}

async function walkFiles(dir: string, maxDepth = 2, depth = 0): Promise<string[]> {
  if (depth > maxDepth) {
    return [];
  }

  let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const out: string[] = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (DEFAULT_IGNORE.has(entry.name)) {
        continue;
      }
      out.push(...(await walkFiles(abs, maxDepth, depth + 1)));
      continue;
    }

    if (entry.isFile()) {
      out.push(abs);
    }
  }

  return out;
}

function detectEntryPoints(moduleName: string, files: string[]): string[] {
  const lowerModule = moduleName.toLowerCase();
  const candidates = new Set([
    "index.ts",
    "index.tsx",
    "index.js",
    "index.mjs",
    `${lowerModule}.ts`,
    `${lowerModule}.tsx`,
    `${lowerModule}.js`,
    "package.json",
  ]);

  return files
    .map((file) => path.basename(file))
    .filter((base) => candidates.has(base));
}

export async function buildModuleMap(sourceDir: string): Promise<ModuleMapResult> {
  const root = path.resolve(sourceDir);
  const roots = ["packages", "apps", "src", "lib", "app"];
  const moduleDirs: string[] = [];

  for (const rootName of roots) {
    const abs = path.join(root, rootName);
    if (await isDirectory(abs)) {
      moduleDirs.push(...(await listDirs(abs)));
    }
  }

  if (moduleDirs.length === 0) {
    const topDirs = await listDirs(root);
    for (const dir of topDirs) {
      const name = path.basename(dir);
      if (!DEFAULT_IGNORE.has(name)) {
        moduleDirs.push(dir);
      }
    }
  }

  const modules: ModuleInfo[] = [];
  for (const dir of moduleDirs) {
    const name = path.basename(dir);
    if (DEFAULT_IGNORE.has(name)) {
      continue;
    }
    const files = await walkFiles(dir, 2, 0);
    if (files.length === 0) {
      continue;
    }
    const relativeFiles = files.map((file) => path.relative(root, file));

    modules.push({
      name,
      dir,
      fileCount: relativeFiles.length,
      files: relativeFiles,
      entryPoints: detectEntryPoints(name, relativeFiles),
    });
  }

  modules.sort((a, b) => a.name.localeCompare(b.name));

  return {
    sourceDir: root,
    modules,
  };
}
