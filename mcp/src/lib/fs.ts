import { promises as fs } from "node:fs";
import path from "node:path";

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readText(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

export async function writeText(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

export async function appendText(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, content, "utf8");
}

export async function listFiles(
  dirPath: string,
  opts: { extension?: string; maxDepth?: number; ignoreDirs?: string[] } = {},
): Promise<string[]> {
  const extension = opts.extension ?? "";
  const maxDepth = opts.maxDepth ?? 10;
  const ignoreDirs = new Set(opts.ignoreDirs ?? []);
  const out: string[] = [];

  async function walk(current: string, depth: number): Promise<void> {
    if (depth > maxDepth) {
      return;
    }

    let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!ignoreDirs.has(entry.name)) {
          await walk(abs, depth + 1);
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (extension && !entry.name.endsWith(extension)) {
        continue;
      }

      out.push(abs);
    }
  }

  await walk(dirPath, 0);
  return out.sort();
}

export function toTitleCaseTopic(topic: string): string {
  return topic
    .trim()
    .split(/[\s/_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}

export async function getNewestMtime(files: string[]): Promise<number> {
  let max = 0;
  for (const file of files) {
    try {
      const stat = await fs.stat(file);
      max = Math.max(max, stat.mtimeMs);
    } catch {
      // ignore
    }
  }
  return Math.floor(max);
}

async function readGitHead(startDir: string): Promise<string> {
  let current = path.resolve(startDir);
  for (let i = 0; i < 8; i += 1) {
    const gitDir = path.join(current, ".git");
    try {
      const stat = await fs.stat(gitDir);
      if (stat.isDirectory()) {
        const head = (await fs.readFile(path.join(gitDir, "HEAD"), "utf8")).trim();
        if (head.startsWith("ref:")) {
          const refPath = head.replace(/^ref:\s*/, "");
          try {
            return (await fs.readFile(path.join(gitDir, refPath), "utf8")).trim();
          } catch {
            return head;
          }
        }
        return head;
      }
    } catch {
      // keep walking upward
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return "nogit";
}

export interface DirSnapshot {
  gitHead: string;
  fileCount: number;
  maxMtime: number;
}

export async function getDirSnapshot(
  dirPath: string,
  opts: { maxDepth?: number; ignoreDirs?: string[] } = {},
): Promise<DirSnapshot> {
  const files = await listFiles(dirPath, {
    maxDepth: opts.maxDepth ?? 3,
    ignoreDirs: opts.ignoreDirs ?? ["node_modules", ".git", "dist", "build"],
  });
  return {
    gitHead: await readGitHead(dirPath),
    fileCount: files.length,
    maxMtime: await getNewestMtime(files),
  };
}
