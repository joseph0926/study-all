import path from "node:path";
import { z } from "zod";
import { makeEnvelope } from "../lib/envelope.js";
import { listFiles, readText } from "../lib/fs.js";
import { parsePlan } from "../parsers/plan-parser.js";
import { getResumePoint } from "../parsers/session-parser.js";
import { resolveContextData } from "./context.js";
import { reviewGetQueue } from "./review.js";
import type { ContextInput, Envelope } from "../types/contracts.js";
import type { DashboardData, DashboardSkill } from "../types/domain.js";

const contextSchema = z.object({
  mode: z.enum(["skill", "project"]),
  skill: z.string().optional(),
  topic: z.string().optional(),
  projectPath: z.string().optional(),
  notesDir: z.string().optional(),
  studyDir: z.string().optional(),
});

const dashboardInputSchema = z.object({
  context: contextSchema,
});

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function computeStreak(logDir: string): Promise<number> {
  const files = await listFiles(logDir, { extension: ".md", maxDepth: 1 });
  const dateFiles = files
    .map((file) => path.basename(file, ".md"))
    .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort();

  let streak = 0;
  const today = new Date(`${dateOnly(new Date())}T00:00:00.000Z`);
  for (let i = 0; i < 366; i += 1) {
    const target = new Date(today);
    target.setUTCDate(today.getUTCDate() - i);
    const key = target.toISOString().slice(0, 10);
    if (dateFiles.includes(key)) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

async function discoverSkillDirs(notesDir: string): Promise<string[]> {
  const files = await listFiles(notesDir, { extension: ".md", maxDepth: 3 });
  const dirs = new Set<string>();
  for (const file of files) {
    const rel = path.relative(notesDir, file);
    const [first] = rel.split(path.sep);
    if (first && first !== path.basename(file)) {
      dirs.add(path.join(notesDir, first));
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

async function buildDashboardData(contextInput: ContextInput): Promise<DashboardData> {
  const context = await resolveContextData(contextInput);
  const skillDirs = await discoverSkillDirs(context.notesDir);

  const aggregated = await Promise.all(
    skillDirs.map(async (skillDir) => {
      const skill = path.basename(skillDir);
      const [planText, queue, lastActivity] = await Promise.all([
        readText(path.join(skillDir, "plan.md")).catch(() => ""),
        reviewGetQueue({
          context: {
            mode: "skill",
            skill,
          },
          skill,
        }),
        getLastActivityDate(skillDir),
      ]);

      const plan = planText ? parsePlan(planText, skill) : { phases: [], coverage: { total: 0, covered: 0, rate: 0 } };
      const topics = plan.phases.flatMap((phase) => phase.topics);
      const completedTopics = topics.filter((topic) => topic.status === "covered").length;

      const skillData: DashboardSkill = {
        name: skill,
        totalTopics: topics.length,
        completedTopics,
        progressRate: topics.length > 0 ? completedTopics / topics.length : 0,
        coverageRate: plan.coverage.rate,
        lastActivity,
        reviewPending: queue.data.items.length,
        graduated: queue.data.graduated,
      };

      const recentSession = lastActivity
        ? {
            date: lastActivity,
            skill,
            topic: topics[0]?.name ?? "",
          }
        : undefined;

      return { skillData, recentSession };
    }),
  );

  const skills = aggregated.map((entry) => entry.skillData);
  const recentSessions = aggregated
    .flatMap((entry) => (entry.recentSession ? [entry.recentSession] : []))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const totalReviewPending = skills.reduce((acc, cur) => acc + cur.reviewPending, 0);
  const streak = await computeStreak(context.studyLogsDir);

  return {
    skills,
    recentSessions,
    streak,
    totalReviewPending,
  };
}

export async function statsGetDashboard(
  input: z.input<typeof dashboardInputSchema>,
): Promise<Envelope<DashboardData>> {
  const parsed = dashboardInputSchema.parse(input);
  const data = await buildDashboardData(parsed.context as ContextInput);
  return makeEnvelope(data);
}

export const statsSchemas = {
  getDashboard: dashboardInputSchema,
};
