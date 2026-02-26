import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { contextResolve, contextResolveInputSchema } from "./tools/context.js";
import { configGet, configSchemas } from "./tools/config.js";
import {
  progressGetModuleMap,
  progressGetPlan,
  progressSchemas,
  progressUpdateCheckbox,
} from "./tools/progress.js";
import { sessionAppendLog, sessionGetResumePoint, sessionGetSourceDigest, sessionGetSourcePaths, sessionSchemas } from "./tools/session.js";
import { reviewAppendQnA, reviewGetMeta, reviewGetQueue, reviewRecordResult, reviewSaveMeta, reviewSchemas } from "./tools/review.js";
import { statsGetDashboard, statsSchemas } from "./tools/stats.js";
import { routineAppendEntry, routineReadLog, routineResetLog, routineSchemas } from "./tools/routine.js";
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
    name: "session.getSourceDigest",
    description: "Get cached source tree digest with overview and existing topics.",
    schema: sessionSchemas.getSourceDigest,
    run: sessionGetSourceDigest,
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
    name: "review.appendQnA",
    description: "Append review QnA records to topic QnA file.",
    schema: reviewSchemas.appendQnA,
    run: reviewAppendQnA,
  },
  {
    name: "stats.getDashboard",
    description: "Get aggregated skill dashboard stats.",
    schema: statsSchemas.getDashboard,
    run: statsGetDashboard,
  },
  {
    name: "routine.appendEntry",
    description: "Append a JSONL entry to routine session log.",
    schema: routineSchemas.appendEntry,
    run: routineAppendEntry,
  },
  {
    name: "routine.readLog",
    description: "Read and summarize routine session log.",
    schema: routineSchemas.readLog,
    run: routineReadLog,
  },
  {
    name: "routine.resetLog",
    description: "Reset routine session log (optionally archive).",
    schema: routineSchemas.resetLog,
    run: routineResetLog,
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
