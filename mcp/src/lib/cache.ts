import { createHash } from "node:crypto";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface CacheSnapshot {
  gitHead: string;
  fileCount: number;
  maxMtime: number;
  parserVersion: string;
}

export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }
}

export function buildCacheKey(sourceDir: string, snapshot: CacheSnapshot): string {
  const raw = JSON.stringify({
    sourceDir,
    gitHead: snapshot.gitHead,
    fileCount: snapshot.fileCount,
    maxMtime: snapshot.maxMtime,
    parserVersion: snapshot.parserVersion,
  });

  return createHash("sha256").update(raw).digest("hex");
}
