import { createHash } from "node:crypto";
import type { Clock } from "./clock.js";
import { systemClock } from "./clock.js";

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
  private readonly clock: Clock;

  constructor(clock: Clock = systemClock) {
    this.clock = clock;
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (this.clock.now().getTime() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: this.clock.now().getTime() + ttlMs,
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
