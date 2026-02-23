import { z } from "zod";
import { loadConfig } from "../config.js";
import { makeEnvelope } from "../lib/envelope.js";
import type { Envelope } from "../types/contracts.js";

const overrides = new Map<string, string>();

const configGetInputSchema = z.object({}).optional();
const configSetInputSchema = z.object({
  context: z
    .object({
      mode: z.enum(["skill", "project"]),
      skill: z.string().optional(),
      topic: z.string().optional(),
      projectPath: z.string().optional(),
      docsDir: z.string().optional(),
      studyDir: z.string().optional(),
    })
    .optional(),
  key: z.enum(["docsDir", "refDir", "skillsDir", "studyLogsDir"]),
  value: z.string().min(1),
});

export async function configGet(): Promise<Envelope<{ studyRoot: string; docsDir: string; refDir: string; skillsDir: string; studyLogsDir: string }>> {
  const cfg = loadConfig();
  return makeEnvelope({
    studyRoot: cfg.studyRoot,
    docsDir: overrides.get("docsDir") ?? cfg.docsDir,
    refDir: overrides.get("refDir") ?? cfg.refDir,
    skillsDir: overrides.get("skillsDir") ?? cfg.skillsDir,
    studyLogsDir: overrides.get("studyLogsDir") ?? cfg.studyLogsDir,
  });
}

export async function configSet(input: z.input<typeof configSetInputSchema>): Promise<Envelope<{ ok: boolean }>> {
  const parsed = configSetInputSchema.parse(input);
  overrides.set(parsed.key, parsed.value);
  return makeEnvelope({ ok: true });
}

export const configSchemas = {
  get: configGetInputSchema,
  set: configSetInputSchema,
};
