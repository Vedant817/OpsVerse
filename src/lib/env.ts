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
  CEREBRAS_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(120_000)
    .default(20_000),
  CEREBRAS_RETRY_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
  CEREBRAS_RETRY_BACKOFF_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(10_000)
    .default(1_200),
});

export type CerebrasEnv = z.infer<typeof cerebrasEnvSchema>;

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .trim()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .trim()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

const geminiBaselineEnvSchema = z.object({
  BASELINE_PROVIDER_ENABLED: z.string().trim().default("false"),
  GEMINI_API_KEY: z.string().trim().optional().default(""),
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-3.5-flash"),
});

export type GeminiBaselineEnv = z.infer<typeof geminiBaselineEnvSchema> & {
  enabled: boolean;
};

const localAgentModeEnvSchema = z.object({
  OPSVERSE_LOCAL_AGENT_MODE: z.string().trim().default("disabled"),
});

export type LocalAgentModeEnv = z.infer<typeof localAgentModeEnvSchema> & {
  enabled: boolean;
};

const cerebrasAgentConcurrencyEnvSchema = z.object({
  CEREBRAS_AGENT_CONCURRENCY: z.coerce.number().int().min(1).max(4).default(1),
});

export type CerebrasAgentConcurrencyEnv = z.infer<
  typeof cerebrasAgentConcurrencyEnvSchema
>;

export function getCerebrasEnv(): CerebrasEnv {
  const parsed = cerebrasEnvSchema.safeParse({
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    CEREBRAS_BASE_URL: process.env.CEREBRAS_BASE_URL,
    CEREBRAS_MODEL: process.env.CEREBRAS_MODEL,
    CEREBRAS_REQUEST_TIMEOUT_MS: process.env.CEREBRAS_REQUEST_TIMEOUT_MS,
    CEREBRAS_RETRY_ATTEMPTS: process.env.CEREBRAS_RETRY_ATTEMPTS,
    CEREBRAS_RETRY_BACKOFF_MS: process.env.CEREBRAS_RETRY_BACKOFF_MS,
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

export function getGeminiBaselineEnv(): GeminiBaselineEnv {
  const parsed = geminiBaselineEnvSchema.parse({
    BASELINE_PROVIDER_ENABLED: process.env.BASELINE_PROVIDER_ENABLED,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
  });

  return {
    ...parsed,
    enabled: parsed.BASELINE_PROVIDER_ENABLED.toLowerCase() === "true",
  };
}

export function getLocalAgentModeEnv(): LocalAgentModeEnv {
  const parsed = localAgentModeEnvSchema.parse({
    OPSVERSE_LOCAL_AGENT_MODE: process.env.OPSVERSE_LOCAL_AGENT_MODE,
  });
  const normalized = parsed.OPSVERSE_LOCAL_AGENT_MODE.toLowerCase();

  return {
    ...parsed,
    enabled: normalized === "enabled" || normalized === "true",
  };
}

export function getCerebrasAgentConcurrencyEnv(): CerebrasAgentConcurrencyEnv {
  return cerebrasAgentConcurrencyEnvSchema.parse({
    CEREBRAS_AGENT_CONCURRENCY: process.env.CEREBRAS_AGENT_CONCURRENCY,
  });
}

export function isEnvConfigError(error: unknown): error is EnvConfigError {
  return error instanceof EnvConfigError;
}

export function isSupabasePersistenceConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function getSupabaseEnv(): SupabaseEnv {
  const parsed = supabaseEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join("."));

    throw new EnvConfigError(
      "Supabase persistence is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server before writing incidents.",
      missing,
    );
  }

  return parsed.data;
}
