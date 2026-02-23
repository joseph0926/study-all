import type { ReviewConcept, ReviewMeta } from "../types/domain.js";
import type { ReviewLevel } from "../types/contracts.js";

function normalizeLevel(raw: string): ReviewLevel {
  const upper = raw.toUpperCase();
  if (upper === "L2" || upper === "L3" || upper === "L4") {
    return upper;
  }
  return "L1";
}

function parseBoolean(raw: string): boolean {
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "yes" || normalized === "y" || normalized === "1" || normalized === "✅";
}

function parseTableLine(line: string): string[] {
  return line
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseMeta(markdown: string, topic = ""): ReviewMeta {
  if (!markdown.trim()) {
    return { topic, concepts: [], sessionCount: 0 };
  }

  const lines = markdown.split(/\r?\n/);
  const concepts: ReviewConcept[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || trimmed.includes("---")) {
      continue;
    }

    const cols = parseTableLine(trimmed);
    if (cols.length < 5 || cols[0].toLowerCase() === "concept") {
      continue;
    }

    concepts.push({
      name: cols[0],
      level: normalizeLevel(cols[1]),
      streak: Number(cols[2]) || 0,
      nextReview: cols[3],
      graduated: parseBoolean(cols[4]),
      attempts: Number(cols[5]) || 0,
    });
  }

  if (concepts.length === 0) {
    for (const line of lines) {
      const match = line.match(/^-\s*concept\s*:\s*(.+?),\s*level\s*:\s*(L[1-4]),\s*streak\s*:\s*(\d+),\s*next\s*:\s*([^,]+),\s*graduated\s*:\s*(true|false)/i);
      if (!match) continue;
      concepts.push({
        name: match[1].trim(),
        level: normalizeLevel(match[2]),
        streak: Number(match[3]) || 0,
        nextReview: match[4].trim(),
        graduated: match[5].toLowerCase() === "true",
        attempts: 0,
      });
    }
  }

  const sessionCountMatch = markdown.match(/sessionCount\s*[:=]\s*(\d+)/i);
  const sessionCount = sessionCountMatch ? Number(sessionCountMatch[1]) : 0;

  return {
    topic,
    concepts,
    sessionCount,
  };
}
