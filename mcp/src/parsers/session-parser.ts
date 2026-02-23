import type { SessionResumePoint } from "../types/domain.js";

interface SessionBlock {
  date: string;
  content: string;
}

function parseSessionBlocks(markdown: string): SessionBlock[] {
  const lines = markdown.split(/\r?\n/);
  const indices: Array<{ idx: number; date: string }> = [];

  lines.forEach((line, idx) => {
    const match = line.match(/^##\s+(\d{4}-\d{2}-\d{2})(?:\s*\(.+\))?$/);
    if (match) {
      indices.push({ idx, date: match[1]! });
    }
  });

  if (indices.length === 0) {
    return [];
  }

  const blocks: SessionBlock[] = [];
  for (let i = 0; i < indices.length; i += 1) {
    const current = indices[i]!;
    const start = current.idx;
    const end = i === indices.length - 1 ? lines.length : indices[i + 1]!.idx;
    blocks.push({
      date: current.date,
      content: lines.slice(start, end).join("\n"),
    });
  }

  return blocks;
}

function sectionBetween(content: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^###\\s+${escaped}\\s*$`, "m");
  const start = content.search(regex);
  if (start < 0) return "";

  const after = content.slice(start);
  const lines = after.split(/\r?\n/);
  const out: string[] = [];
  let first = true;
  for (const line of lines) {
    if (first) {
      first = false;
      continue;
    }
    if (/^###\s+/.test(line)) {
      break;
    }
    out.push(line);
  }

  return out.join("\n").trim();
}

export function getResumePoint(markdown: string): SessionResumePoint {
  const sessions = parseSessionBlocks(markdown);
  const last = sessions[sessions.length - 1];

  if (!last) {
    return {
      exists: false,
      completedSteps: [],
      totalSteps: 0,
      pendingSteps: [],
      summary: "",
    };
  }

  const roadmap = sectionBetween(last.content, "학습 로드맵");
  const summary = sectionBetween(last.content, "학습 요약");

  const completedSteps: string[] = [];
  const pendingSteps: string[] = [];
  for (const line of roadmap.split(/\r?\n/)) {
    const stepMatch = line.match(/^\s*-\s+\[(x|X|\s)\]\s+(.+)$/);
    if (!stepMatch) continue;
    const stepName = stepMatch[2]!.trim();
    if (stepMatch[1]!.toLowerCase() === "x") {
      completedSteps.push(stepName);
    } else {
      pendingSteps.push(stepName);
    }
  }

  const totalSteps = completedSteps.length + pendingSteps.length;
  const lastStep = completedSteps[completedSteps.length - 1] ?? pendingSteps[0];

  return {
    exists: true,
    lastStep,
    lastDate: last.date,
    completedSteps,
    totalSteps,
    pendingSteps,
    summary,
  };
}
