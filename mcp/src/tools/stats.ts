import path from "node:path";
import { z } from "zod";
import { makeEnvelope } from "../lib/envelope.js";
import { listFiles, readText } from "../lib/fs.js";
import { parsePlan } from "../parsers/plan-parser.js";
import { getResumePoint } from "../parsers/session-parser.js";
import { resolveContextData } from "./context.js";
import { dailyGetStatus } from "./daily.js";
import { reviewGetQueue } from "./review.js";
import type { ContextInput, Envelope } from "../types/contracts.js";
import type { DashboardData, DashboardSkill, RecommendationItem } from "../types/domain.js";

const contextSchema = z.object({
  mode: z.enum(["skill", "project"]),
  skill: z.string().optional(),
  topic: z.string().optional(),
  projectPath: z.string().optional(),
  docsDir: z.string().optional(),
  studyDir: z.string().optional(),
});

const dashboardInputSchema = z.object({
  context: contextSchema,
});

const recommendationInputSchema = z.object({
  context: contextSchema,
});

async function discoverSkillDirs(docsDir: string): Promise<string[]> {
  const files = await listFiles(docsDir, { extension: "plan.md", maxDepth: 2 });
  const dirs = new Set<string>();
  for (const file of files) {
    if (path.basename(file) === "plan.md" && path.dirname(file) !== docsDir) {
      dirs.add(path.dirname(file));
    }
  }
  return [...dirs].sort();
}

async function getLastActivityDate(skillDir: string): Promise<string | undefined> {
  const files = (await listFiles(skillDir, { extension: ".md", maxDepth: 1 })).filter(
    (file) => !file.endsWith("plan.md") && !file.endsWith("-quiz.md") && !file.endsWith("-meta.md"),
  );

  let latest: string | undefined;
  for (const file of files) {
    const text = await readText(file);
    const resume = getResumePoint(text);
    if (!resume.lastDate) continue;
    if (!latest || resume.lastDate > latest) {
      latest = resume.lastDate;
    }
  }

  return latest;
}

export async function statsGetDashboard(
  input: z.input<typeof dashboardInputSchema>,
): Promise<Envelope<DashboardData>> {
  const parsed = dashboardInputSchema.parse(input);
  const context = await resolveContextData(parsed.context as ContextInput);

  const skillDirs = await discoverSkillDirs(context.docsDir);
  const skills: DashboardSkill[] = [];
  const recentSessions: Array<{ date: string; skill: string; topic: string }> = [];

  for (const skillDir of skillDirs) {
    const skill = path.basename(skillDir);
    const planText = await readText(path.join(skillDir, "plan.md"));
    const plan = parsePlan(planText, skill);
    const topics = plan.phases.flatMap((phase) => phase.topics);
    const completedTopics = topics.filter((topic) => topic.status === "covered").length;

    const queue = await reviewGetQueue({
      context: {
        mode: "skill",
        skill,
      },
      skill,
    });

    const lastActivity = await getLastActivityDate(skillDir);
    if (lastActivity) {
      recentSessions.push({
        date: lastActivity,
        skill,
        topic: topics[0]?.name ?? "",
      });
    }

    skills.push({
      name: skill,
      totalTopics: topics.length,
      completedTopics,
      progressRate: topics.length > 0 ? completedTopics / topics.length : 0,
      coverageRate: plan.coverage.rate,
      lastActivity,
      reviewPending: queue.data.items.length,
      graduated: queue.data.graduated,
    });
  }

  const dailyStatus = await dailyGetStatus({
    context: {
      mode: "skill",
      skill: skills[0]?.name,
    },
  });

  const totalReviewPending = skills.reduce((acc, cur) => acc + cur.reviewPending, 0);

  return makeEnvelope({
    skills,
    recentSessions: recentSessions.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    streak: dailyStatus.data.streak,
    totalReviewPending,
  });
}

export async function statsGetRecommendation(
  input: z.input<typeof recommendationInputSchema>,
): Promise<Envelope<{ items: RecommendationItem[] }>> {
  const parsed = recommendationInputSchema.parse(input);
  const dashboard = await statsGetDashboard({ context: parsed.context });

  const items: RecommendationItem[] = [];
  for (const skill of dashboard.data.skills) {
    if (skill.reviewPending > 0) {
      items.push({
        type: "review",
        skill: skill.name,
        topic: "복습 대기",
        reason: `복습 대기 ${skill.reviewPending}건`,
        priority: 1,
      });
      continue;
    }

    if (skill.progressRate < 1) {
      items.push({
        type: "continue",
        skill: skill.name,
        topic: "다음 토픽",
        reason: `진행률 ${(skill.progressRate * 100).toFixed(1)}%`,
        priority: 2,
      });
    } else {
      items.push({
        type: "new-topic",
        skill: skill.name,
        topic: "신규 주제",
        reason: "현재 토픽 완료, 확장 학습 권장",
        priority: 3,
      });
    }
  }

  items.sort((a, b) => a.priority - b.priority || a.skill.localeCompare(b.skill));
  return makeEnvelope({ items: items.slice(0, 3) });
}

export const statsSchemas = {
  getDashboard: dashboardInputSchema,
  getRecommendation: recommendationInputSchema,
};
