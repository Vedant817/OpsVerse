import "server-only";

import { z } from "zod";

export class EnvConfigError extends Error {
  readonly missing: string[];

  constructor(message: string, missing: string[] = []) {
    super(message);
    this.name = "EnvConfigError";
    this.missing = missing;
  }
}

const cerebrasEnvSchema = z.object({
  CEREBRAS_API_KEY: z.string().trim().min(1, "CEREBRAS_API_KEY is required"),
  CEREBRAS_BASE_URL: z
    .string()
    .trim()
    .url()
    .default("https://api.cerebras.ai/v1"),
  CEREBRAS_MODEL: z.string().trim().min(1).default("gemma-4-31b"),
});

export type CerebrasEnv = z.infer<typeof cerebrasEnvSchema>;

export function getCerebrasEnv(): CerebrasEnv {
  const parsed = cerebrasEnvSchema.safeParse({
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    CEREBRAS_BASE_URL: process.env.CEREBRAS_BASE_URL,
    CEREBRAS_MODEL: process.env.CEREBRAS_MODEL,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join("."));

    throw new EnvConfigError(
      "Cerebras is not configured. Set CEREBRAS_API_KEY on the server before running live AI requests.",
      missing,
    );
  }

  return parsed.data;
}

export function isEnvConfigError(error: unknown): error is EnvConfigError {
  return error instanceof EnvConfigError;
}
