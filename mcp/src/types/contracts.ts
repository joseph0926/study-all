import { z } from "zod";

export const SCHEMA_VERSION = "1.0.0" as const;

export interface CacheMeta {
  hit: boolean;
  key: string;
  invalidatedReason?: string | undefined;
}

export interface Envelope<T> {
  schemaVersion: typeof SCHEMA_VERSION;
  generatedAt: string;
  data: T;
  cache?: CacheMeta | undefined;
}

export type ContextMode = "skill" | "project";

export const contextInputSchema = z.object({
  mode: z.enum(["skill", "project"]),
  skill: z.string().min(1).optional(),
  topic: z.string().min(1).optional(),
  projectPath: z.string().min(1).optional(),
  notesDir: z.string().min(1).optional(),
  studyDir: z.string().min(1).optional(),
});

export type ContextInput = z.infer<typeof contextInputSchema>;

export interface ResolvedContext {
  mode: ContextMode;
  studyRoot: string;
  notesDir: string;
  refDir: string;
  skillsDir: string;
  studyLogsDir: string;
  skill?: string | undefined;
  topic?: string | undefined;
  projectPath?: string | undefined;
  skillNotesDir?: string | undefined;
  studyDir?: string | undefined;
  sourceDir?: string | undefined;
}

export const scoreSchema = z.enum(["wrong", "retry_pass", "first_pass"]);
export type ReviewScore = z.infer<typeof scoreSchema>;

export const levelSchema = z.enum(["L1", "L2", "L3", "L4"]);
export type ReviewLevel = z.infer<typeof levelSchema>;

export interface ToolCall<TInput = unknown> {
  context: ContextInput;
  input: TInput;
}

export interface ToolDefinition<TInput, TOutput> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  run: (input: TInput) => Promise<Envelope<TOutput>>;
}
