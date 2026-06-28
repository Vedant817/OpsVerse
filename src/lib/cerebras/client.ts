import "server-only";

import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { getCerebrasEnv } from "@/lib/env";

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

let cerebrasClient: OpenAI | null = null;
let cerebrasClientBaseUrl: string | null = null;

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

export async function runGemmaAgent({
  messages,
  responseFormat,
  reasoningEffort = "none",
  temperature = 0.2,
}: GemmaAgentRequest): Promise<GemmaAgentResult> {
  const { client, env } = getCerebrasClient();
  const startedAt = Date.now();

  const response = await client.chat.completions.create({
    model: env.CEREBRAS_MODEL,
    messages,
    temperature,
    response_format: responseFormat,
    reasoning_effort: reasoningEffort,
  } as ChatCompletionCreateParamsNonStreaming & {
    reasoning_effort: ReasoningEffort;
  });

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
