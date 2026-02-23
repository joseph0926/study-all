import { z } from "zod";
import { loadConfig } from "../config.js";
import { makeEnvelope } from "../lib/envelope.js";
import type { Envelope } from "../types/contracts.js";

const configGetInputSchema = z.object({}).optional();

export async function configGet(): Promise<Envelope<{ studyRoot: string; docsDir: string; refDir: string; skillsDir: string; studyLogsDir: string }>> {
  const cfg = loadConfig();
  return makeEnvelope({
    studyRoot: cfg.studyRoot,
    docsDir: cfg.docsDir,
    refDir: cfg.refDir,
    skillsDir: cfg.skillsDir,
    studyLogsDir: cfg.studyLogsDir,
  });
}

export const configSchemas = {
  get: configGetInputSchema,
};
