import "server-only";

import { getGeminiBaselineEnv } from "@/lib/env";
import { parseGeminiContent, parseGeminiUsage } from "@/lib/baseline/gemini-response";

export type BaselineBenchmarkResult =
  | {
      enabled: false;
      configured: false;
      provider: "gemini";
      status: "disabled";
      model: string;
      note: string;
    }
  | {
      enabled: true;
      configured: false;
      provider: "gemini";
      status: "missing_config";
      model: string;
      missing: string[];
      note: string;
    }
  | {
      enabled: true;
      configured: true;
      provider: "gemini";
      status: "complete";
      model: string;
      content: string;
      metrics: {
        latencyMs: number;
        promptTokens: number | null;
        completionTokens: number | null;
        totalTokens: number | null;
        tokensPerSecond: number | null;
      };
      response: unknown;
    }
  | {
      enabled: true;
      configured: true;
      provider: "gemini";
      status: "failed";
      model: string;
      error: string;
      statusCode: number | null;
      detail: unknown;
    };

const geminiEndpoint =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

function tokensPerSecond(totalTokens: number | null, latencyMs: number) {
  if (typeof totalTokens !== "number" || latencyMs <= 0) {
    return null;
  }

  return totalTokens / (latencyMs / 1000);
}

function toErrorMessage(value: unknown) {
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const error = record.error;
    if (typeof error === "object" && error !== null) {
      const message = (error as Record<string, unknown>).message;
      if (typeof message === "string") {
        return message;
      }
    }
  }

  return "Gemini baseline request failed.";
}

export function getGeminiBaselineStatus(): BaselineBenchmarkResult {
  const env = getGeminiBaselineEnv();

  if (!env.enabled) {
    return {
      enabled: false,
      configured: false,
      provider: "gemini",
      status: "disabled",
      model: env.GEMINI_MODEL,
      note: "Baseline comparison is disabled. Set BASELINE_PROVIDER_ENABLED=true to enable it.",
    };
  }

  if (!env.GEMINI_API_KEY) {
    return {
      enabled: true,
      configured: false,
      provider: "gemini",
      status: "missing_config",
      model: env.GEMINI_MODEL,
      missing: ["GEMINI_API_KEY"],
      note: "Gemini baseline is enabled but GEMINI_API_KEY is missing.",
    };
  }

  return {
    enabled: true,
    configured: true,
    provider: "gemini",
    status: "failed",
    model: env.GEMINI_MODEL,
    error: "Gemini baseline has not been executed yet.",
    statusCode: null,
    detail: null,
  };
}

export async function runGeminiBaseline(prompt: string): Promise<BaselineBenchmarkResult> {
  const env = getGeminiBaselineEnv();

  if (!env.enabled) {
    return getGeminiBaselineStatus();
  }

  if (!env.GEMINI_API_KEY) {
    return getGeminiBaselineStatus();
  }

  const startedAt = performance.now();
  let response: Response;
  let body: unknown;

  try {
    response = await fetch(geminiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        model: env.GEMINI_MODEL,
        input: prompt,
      }),
    });
    body = await response.json().catch(() => null);
  } catch (error) {
    return {
      enabled: true,
      configured: true,
      provider: "gemini",
      status: "failed",
      model: env.GEMINI_MODEL,
      error: error instanceof Error ? error.message : "Gemini baseline request failed.",
      statusCode: null,
      detail: null,
    };
  }

  const latencyMs = Math.round(performance.now() - startedAt);

  if (!response.ok) {
    return {
      enabled: true,
      configured: true,
      provider: "gemini",
      status: "failed",
      model: env.GEMINI_MODEL,
      error: toErrorMessage(body),
      statusCode: response.status,
      detail: body,
    };
  }

  const content = parseGeminiContent(body);
  const usage = parseGeminiUsage(body);

  return {
    enabled: true,
    configured: true,
    provider: "gemini",
    status: "complete",
    model: env.GEMINI_MODEL,
    content,
    metrics: {
      latencyMs,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      tokensPerSecond: tokensPerSecond(usage.totalTokens, latencyMs),
    },
    response: body,
  };
}
