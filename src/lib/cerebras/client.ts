import "server-only";

import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { getCerebrasEnv } from "@/lib/env";
import { gemmaModelPolicyMessage, isGemmaModel } from "@/lib/cerebras/model-policy";
import {
  cerebrasErrorStatus,
  isRetryableCerebrasError,
  retryDelayMs,
} from "@/lib/cerebras/errors";

export type ReasoningEffort = "none" | "low" | "medium" | "high";

export type GemmaAgentRequest = {
  messages: ChatCompletionMessageParam[];
  responseFormat?: ChatCompletionCreateParamsNonStreaming["response_format"];
  reasoningEffort?: ReasoningEffort;
  temperature?: number;
};

export type GemmaAgentResult = {
  content: string;
  latencyMs: number;
  model: string;
  usage: {
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
  };
  tokensPerSecond: number | null;
  timeInfo: unknown;
  responseId: string | null;
};

export type CerebrasModelReadiness = {
  configuredModel: string;
  available: boolean;
  gemmaModel: boolean;
  ready: boolean;
  availableModels: string[];
  checkedAt: string;
};

export class CerebrasModelUnavailableError extends Error {
  readonly configuredModel: string;
  readonly availableModels: string[];

  constructor(configuredModel: string, availableModels: string[]) {
    super(
      `Configured Cerebras model "${configuredModel}" is not available for this API key. Available models: ${
        availableModels.length > 0 ? availableModels.join(", ") : "none returned"
      }. Set CEREBRAS_MODEL to an available Gemma 4 model before claiming live Gemma execution.`,
    );
    this.name = "CerebrasModelUnavailableError";
    this.configuredModel = configuredModel;
    this.availableModels = availableModels;
  }
}

export class CerebrasNonGemmaModelError extends Error {
  readonly configuredModel: string;
  readonly availableModels: string[];

  constructor(configuredModel: string, availableModels: string[]) {
    super(gemmaModelPolicyMessage(configuredModel));
    this.name = "CerebrasNonGemmaModelError";
    this.configuredModel = configuredModel;
    this.availableModels = availableModels;
  }
}

let cerebrasClient: OpenAI | null = null;
let cerebrasClientBaseUrl: string | null = null;
let modelListCache:
  | {
      baseUrl: string;
      fetchedAt: number;
      ids: string[];
    }
  | null = null;
let modelListRequest: Promise<string[]> | null = null;
const modelListCacheMs = 60_000;

function getCerebrasClient() {
  const env = getCerebrasEnv();

  if (!cerebrasClient || cerebrasClientBaseUrl !== env.CEREBRAS_BASE_URL) {
    cerebrasClient = new OpenAI({
      apiKey: env.CEREBRAS_API_KEY,
      baseURL: env.CEREBRAS_BASE_URL,
    });
    cerebrasClientBaseUrl = env.CEREBRAS_BASE_URL;
  }

  return { client: cerebrasClient, env };
}

function modelsUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, "")}/models`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Cerebras request error";
}

async function fetchCerebrasModelIds() {
  const env = getCerebrasEnv();
  const now = Date.now();

  if (
    modelListCache &&
    modelListCache.baseUrl === env.CEREBRAS_BASE_URL &&
    now - modelListCache.fetchedAt < modelListCacheMs
  ) {
    return modelListCache.ids;
  }

  if (!modelListRequest) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    modelListRequest = fetch(modelsUrl(env.CEREBRAS_BASE_URL), {
      headers: {
        Authorization: `Bearer ${env.CEREBRAS_API_KEY}`,
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          let detail = "";
          try {
            const payload = (await response.json()) as unknown;
            detail = JSON.stringify(payload);
          } catch {
            detail = await response.text().catch(() => "");
          }

          throw new Error(
            `Cerebras model list request failed with status ${response.status}${
              detail ? `: ${detail}` : ""
            }`,
          );
        }

        const payload = (await response.json()) as {
          data?: Array<{ id?: unknown }>;
        };
        const ids = (payload.data ?? [])
          .map((model) => model.id)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
          .sort();

        modelListCache = {
          baseUrl: env.CEREBRAS_BASE_URL,
          fetchedAt: Date.now(),
          ids,
        };

        return ids;
      })
      .finally(() => {
        clearTimeout(timeout);
        modelListRequest = null;
      });
  }

  return modelListRequest;
}

export async function checkCerebrasModelReadiness(): Promise<CerebrasModelReadiness> {
  const env = getCerebrasEnv();
  const availableModels = await fetchCerebrasModelIds();
  const available = availableModels.includes(env.CEREBRAS_MODEL);
  const gemmaModel = isGemmaModel(env.CEREBRAS_MODEL);

  return {
    configuredModel: env.CEREBRAS_MODEL,
    available,
    gemmaModel,
    ready: available && gemmaModel,
    availableModels,
    checkedAt: new Date().toISOString(),
  };
}

export async function assertCerebrasModelAvailable() {
  const readiness = await checkCerebrasModelReadiness();

  if (!readiness.gemmaModel) {
    throw new CerebrasNonGemmaModelError(
      readiness.configuredModel,
      readiness.availableModels,
    );
  }

  if (!readiness.available) {
    throw new CerebrasModelUnavailableError(
      readiness.configuredModel,
      readiness.availableModels,
    );
  }

  return readiness;
}

export async function runGemmaAgent({
  messages,
  responseFormat,
  reasoningEffort = "none",
  temperature = 0.2,
}: GemmaAgentRequest): Promise<GemmaAgentResult> {
  const { client, env } = getCerebrasClient();
  await assertCerebrasModelAvailable();
  const startedAt = Date.now();
  let response: Awaited<ReturnType<typeof client.chat.completions.create>> | null =
    null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= env.CEREBRAS_RETRY_ATTEMPTS; attempt += 1) {
    try {
      response = await client.chat.completions.create(
        {
          model: env.CEREBRAS_MODEL,
          messages,
          temperature,
          response_format: responseFormat,
          reasoning_effort: reasoningEffort,
        } as ChatCompletionCreateParamsNonStreaming & {
          reasoning_effort: ReasoningEffort;
        },
        {
          maxRetries: 0,
          timeout: env.CEREBRAS_REQUEST_TIMEOUT_MS,
        },
      );
      break;
    } catch (error) {
      lastError = error;

      if (
        attempt >= env.CEREBRAS_RETRY_ATTEMPTS ||
        !isRetryableCerebrasError(error)
      ) {
        break;
      }

      await sleep(
        retryDelayMs(error, attempt, env.CEREBRAS_RETRY_BACKOFF_MS),
      );
    }
  }

  if (!response) {
    const status = cerebrasErrorStatus(lastError);
    const prefix = `Cerebras request failed after ${env.CEREBRAS_RETRY_ATTEMPTS} attempt${
      env.CEREBRAS_RETRY_ATTEMPTS === 1 ? "" : "s"
    }${status ? ` with status ${status}` : ""}`;
    throw new Error(`${prefix}: ${errorMessage(lastError)}`);
  }

  const latencyMs = Date.now() - startedAt;
  const usage = {
    promptTokens: response.usage?.prompt_tokens ?? null,
    completionTokens: response.usage?.completion_tokens ?? null,
    totalTokens: response.usage?.total_tokens ?? null,
  };
  const tokensPerSecond =
    usage.completionTokens && latencyMs > 0
      ? Number((usage.completionTokens / (latencyMs / 1000)).toFixed(2))
      : null;

  return {
    content: response.choices[0]?.message?.content ?? "",
    latencyMs,
    model: response.model || env.CEREBRAS_MODEL,
    usage,
    tokensPerSecond,
    timeInfo: (response as { time_info?: unknown }).time_info ?? null,
    responseId: response.id ?? null,
  };
}
