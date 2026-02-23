import type { CoverageRow, CoverageStatus, PlanData, PlanPhase, PlanTopic } from "../types/domain.js";

function mapStatus(raw: string): CoverageStatus {
  if (raw.includes("✅")) return "covered";
  if (raw.includes("🔗")) return "orphan";
  return "uncovered";
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCoverageRows(lines: string[]): CoverageRow[] {
  const out: CoverageRow[] = [];
  let inCoverage = false;

  for (const line of lines) {
    if (line.startsWith("## Coverage Analysis")) {
      inCoverage = true;
      continue;
    }
    if (inCoverage && line.startsWith("## ")) {
      break;
    }
    if (!inCoverage) {
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      continue;
    }
    if (trimmed.includes("|--------")) {
      continue;
    }

    const cols = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);

    if (cols.length < 3) {
      continue;
    }

    out.push({
      status: mapStatus(cols[0]),
      module: cols[1],
      target: cols.slice(2).join(" | "),
    });
  }

  return out;
}

function parseCoverageSummary(text: string, rows: CoverageRow[]): PlanData["coverage"] {
  const summaryMatch = text.match(/커버율\*\*:?[\s\S]*?(\d+)\/(\d+)/);
  if (summaryMatch) {
    const covered = Number(summaryMatch[1]);
    const total = Number(summaryMatch[2]);
    const uncovered = Math.max(0, total - covered);
    return {
      total,
      covered,
      uncovered,
      rate: total > 0 ? covered / total : 0,
    };
  }

  const covered = rows.filter((row) => row.status === "covered").length;
  const uncovered = rows.filter((row) => row.status === "uncovered").length;
  const total = covered + uncovered;
  return {
    total,
    covered,
    uncovered,
    rate: total > 0 ? covered / total : 0,
  };
}

export function parsePlan(markdown: string, skill: string): PlanData {
  const lines = markdown.split(/\r?\n/);
  const coverageRows = parseCoverageRows(lines);

  const title = lines.find((line) => line.startsWith("# "))?.replace(/^#\s+/, "") ?? `${skill} plan`;

  const phases: PlanPhase[] = [];
  const topicDocsMapping: Record<string, string> = {};

  let currentPhase: PlanPhase | undefined;
  let currentTopic: PlanTopic | undefined;

  function closeTopic(): void {
    if (!currentTopic) return;
    const total = currentTopic.steps.length;
    const done = currentTopic.steps.filter((step) => step.done).length;
    currentTopic.completionRate = total > 0 ? done / total : 0;
    if (currentTopic.docsFile) {
      topicDocsMapping[currentTopic.module] = currentTopic.docsFile;
    }
    currentTopic = undefined;
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (/^##\s+Phase\s+\d+:/.test(line)) {
      closeTopic();
      currentPhase = {
        name: line.replace(/^##\s+/, ""),
        topics: [],
      };
      phases.push(currentPhase);
      continue;
    }

    const topicMatch = line.match(/^###\s+Topic\s+(\d+):\s+(.+)$/);
    if (topicMatch && currentPhase) {
      closeTopic();
      const topicText = topicMatch[2].trim();
      const status = mapStatus(topicText);
      const cleanTopicName = topicText.replace(/[✅⬜🔗].*$/, "").trim();
      const module = cleanTopicName.split(/[\s—-]/)[0] || cleanTopicName;
      currentTopic = {
        id: `topic-${topicMatch[1]}`,
        name: cleanTopicName,
        module,
        status,
        sourceFiles: 0,
        steps: [],
        completionRate: 0,
      };
      currentPhase.topics.push(currentTopic);
      continue;
    }

    if (!currentTopic) {
      continue;
    }

    const sourceCountMatch = line.match(/(?:,|—|-)\s*(\d+)\s*files?/i) ?? line.match(/\((\d+)\s*files?\)/i);
    if (sourceCountMatch) {
      currentTopic.sourceFiles = Number(sourceCountMatch[1]);
    }

    const skillTargetMatch = line.match(/^\*\*Skill Target\*\*:\s*(.+)$/);
    if (skillTargetMatch) {
      const docs = skillTargetMatch[1].match(/[A-Za-z0-9._-]+\.md/g);
      if (docs && docs.length > 0) {
        currentTopic.docsFile = docs[0].replace(/^references\//, "");
      }
      continue;
    }

    const stepMatch = line.match(/^-\s+\[(x|X|\s)\]\s+(.+)$/);
    if (stepMatch) {
      currentTopic.steps.push({
        name: stepMatch[2].trim(),
        done: stepMatch[1].toLowerCase() === "x",
      });
    }
  }

  closeTopic();

  for (const phase of phases) {
    for (const topic of phase.topics) {
      if (!topic.module) {
        topic.module = slug(topic.name);
      }
    }
  }

  return {
    skill,
    description: title,
    coverage: parseCoverageSummary(markdown, coverageRows),
    coverageRows,
    phases,
    topicDocsMapping,
  };
}
