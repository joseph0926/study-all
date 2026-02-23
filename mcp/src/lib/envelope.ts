import type { CacheMeta, Envelope } from "../types/contracts.js";
import { SCHEMA_VERSION } from "../types/contracts.js";
import type { Clock } from "./clock.js";
import { systemClock } from "./clock.js";

export function makeEnvelope<T>(data: T, clock: Clock = systemClock, cache?: CacheMeta): Envelope<T> {
  const envelope: Envelope<T> = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: clock.now().toISOString(),
    data,
  };

  if (cache) {
    envelope.cache = cache;
  }

  return envelope;
}
