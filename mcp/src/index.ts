import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { contextResolve, contextResolveInputSchema } from "./tools/context.js";
import { configGet, configSchemas } from "./tools/config.js";
import {
  progressGetCoverageMap,
  progressGetModuleMap,
  progressGetNextTopic,
  progressGetPlan,
  progressSchemas,
  progressUpdateCheckbox,
} from "./tools/progress.js";
import { sessionAppendLog, sessionGetResumePoint, sessionGetSourcePaths, sessionSchemas } from "./tools/session.js";
import { dailyFinalize, dailyGetStatus, dailyLogDone, dailyLogPlan, dailySchemas } from "./tools/daily.js";
import { reviewGetMeta, reviewGetQueue, reviewRecordResult, reviewSaveMeta, reviewSchemas } from "./tools/review.js";
import { statsGetDashboard, statsGetRecommendation, statsSchemas } from "./tools/stats.js";
import { makeEnvelope } from "./lib/envelope.js";

interface ToolDef {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each tool's run is called with its own schema.parse() result
  run: (input: any) => Promise<unknown>;
}

const tools: ToolDef[] = [
  {
    name: "context.resolve",
    description: "Resolve skill/project context and normalized paths.",
    schema: contextResolveInputSchema,
    run: contextResolve,
  },
  {
    name: "config.get",
    description: "Get current config.",
    schema: configSchemas.get ?? z.object({}),
    run: async () => configGet(),
  },
  {
    name: "progress.getPlan",
    description: "Parse plan.md into structured data.",
    schema: progressSchemas.getPlan,
    run: progressGetPlan,
  },
  {
    name: "progress.getNextTopic",
    description: "Compute next topic/step from plan.",
    schema: progressSchemas.getNextTopic,
    run: progressGetNextTopic,
  },
  {
    name: "progress.updateCheckbox",
    description: "Update a checkbox line in plan.md.",
    schema: progressSchemas.updateCheckbox,
    run: progressUpdateCheckbox,
  },
  {
    name: "progress.getModuleMap",
    description: "Build MODULE_MAP from source tree.",
    schema: progressSchemas.getModuleMap,
    run: progressGetModuleMap,
  },
  {
    name: "progress.getCoverageMap",
    description: "Build COVERAGE_MAP from module map vs refs.",
    schema: progressSchemas.getCoverageMap,
    run: progressGetCoverageMap,
  },
  {
    name: "session.getResumePoint",
    description: "Extract resume point from latest session.",
    schema: sessionSchemas.getResumePoint,
    run: sessionGetResumePoint,
  },
  {
    name: "session.appendLog",
    description: "Append a new session record.",
    schema: sessionSchemas.appendLog,
    run: sessionAppendLog,
  },
  {
    name: "session.getSourcePaths",
    description: "Discover source paths for current context.",
    schema: sessionSchemas.getSourcePaths,
    run: sessionGetSourcePaths,
  },
  {
    name: "review.getQueue",
    description: "Get spaced-repetition review queue.",
    schema: reviewSchemas.getQueue,
    run: reviewGetQueue,
  },
  {
    name: "review.recordResult",
    description: "Record one review result and update interval.",
    schema: reviewSchemas.recordResult,
    run: reviewRecordResult,
  },
  {
    name: "review.getMeta",
    description: "Read topic review metadata.",
    schema: reviewSchemas.getMeta,
    run: reviewGetMeta,
  },
  {
    name: "review.saveMeta",
    description: "Persist topic review metadata.",
    schema: reviewSchemas.saveMeta,
    run: reviewSaveMeta,
  },
  {
    name: "daily.getStatus",
    description: "Get daily study status from study logs.",
    schema: dailySchemas.getStatus,
    run: dailyGetStatus,
  },
  {
    name: "daily.logPlan",
    description: "Write/replace today's plan in study logs.",
    schema: dailySchemas.logPlan,
    run: dailyLogPlan,
  },
  {
    name: "daily.logDone",
    description: "Write today's done report + feedback status.",
    schema: dailySchemas.logDone,
    run: dailyLogDone,
  },
  {
    name: "daily.finalize",
    description: "Finalize today's study log.",
    schema: dailySchemas.finalize,
    run: dailyFinalize,
  },
  {
    name: "stats.getDashboard",
    description: "Get aggregated skill dashboard stats.",
    schema: statsSchemas.getDashboard,
    run: statsGetDashboard,
  },
  {
    name: "stats.getRecommendation",
    description: "Get next recommendations.",
    schema: statsSchemas.getRecommendation,
    run: statsGetRecommendation,
  },
];

function normalizeError(error: unknown): { message: string; name?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }
  return {
    message: typeof error === "string" ? error : "Unknown error",
  };
}

export async function startServer(): Promise<void> {
  const server = new McpServer({
    name: "study-all-mcp",
    version: "0.1.0",
  });

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.schema,
      },
      async (args: unknown) => {
        try {
          const payload = await tool.run(args);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(payload, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorEnvelope = makeEnvelope({
            ok: false,
            error: normalizeError(error),
          });
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(errorEnvelope, null, 2),
              },
            ],
          };
        }
      },
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isDirectRun = process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url;
if (isDirectRun) {
  startServer().catch((error) => {
    console.error("Failed to start MCP server", error);
    process.exit(1);
  });
}
