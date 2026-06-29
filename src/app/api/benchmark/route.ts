import { NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getGeminiBaselineEnv, isEnvConfigError } from "@/lib/env";
import {
  CerebrasNonGemmaModelError,
  CerebrasModelUnavailableError,
  runGemmaAgent,
} from "@/lib/cerebras/client";
import { runGeminiBaseline } from "@/lib/baseline/gemini";

export const runtime = "nodejs";

type BenchmarkRequestBody = {
  prompt?: unknown;
  includeBaseline?: unknown;
};

const defaultBenchmarkPrompt =
  "Return one concise sentence confirming OpsVerse live Cerebras connectivity.";

function buildBenchmarkMessages(prompt: unknown): ChatCompletionMessageParam[] {
  const userPrompt =
    typeof prompt === "string" && prompt.trim().length > 0
      ? prompt.trim()
      : defaultBenchmarkPrompt;

  return [
    {
      role: "system",
      content:
        "You are a production connectivity check for OpsVerse. Respond concisely and do not invent metrics.",
    },
    {
      role: "user",
      content: userPrompt,
    },
  ];
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected server error";
}

function shouldIncludeBaseline(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["1", "true", "yes"].includes(value.toLowerCase());
  }

  return getGeminiBaselineEnv().enabled;
}

async function baselineForPrompt(prompt: string, includeBaseline: boolean) {
  if (!includeBaseline && !getGeminiBaselineEnv().enabled) {
    return null;
  }

  return runGeminiBaseline(prompt);
}

function benchmarkPrompt(prompt: unknown) {
  return typeof prompt === "string" && prompt.trim().length > 0
    ? prompt.trim()
    : defaultBenchmarkPrompt;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return runBenchmark({
    prompt: url.searchParams.get("prompt") ?? undefined,
    includeBaseline: shouldIncludeBaseline(url.searchParams.get("includeBaseline")),
  });
}

export async function POST(request: Request) {
  let body: BenchmarkRequestBody = {};

  try {
    body = (await request.json()) as BenchmarkRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON request body.",
      },
      { status: 400 },
    );
  }

  return runBenchmark({
    prompt: body.prompt,
    includeBaseline: shouldIncludeBaseline(body.includeBaseline),
  });
}

async function runBenchmark({
  prompt,
  includeBaseline,
}: {
  prompt?: unknown;
  includeBaseline: boolean;
}) {
  const userPrompt = benchmarkPrompt(prompt);

  try {
    const result = await runGemmaAgent({
      messages: buildBenchmarkMessages(userPrompt),
      reasoningEffort: "none",
    });
    const baseline = await baselineForPrompt(userPrompt, includeBaseline);

    return NextResponse.json(
      {
        ok: true,
        provider: "cerebras",
        model: result.model,
        content: result.content,
        metrics: {
          latencyMs: result.latencyMs,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          tokensPerSecond: result.tokensPerSecond,
          timeInfo: result.timeInfo,
        },
        responseId: result.responseId,
        baseline,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (isEnvConfigError(error)) {
      const baseline = await baselineForPrompt(userPrompt, includeBaseline);
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          missing: error.missing,
          baseline,
        },
        { status: 503 },
      );
    }

    if (error instanceof CerebrasModelUnavailableError) {
      const baseline = await baselineForPrompt(userPrompt, includeBaseline);
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          configuredModel: error.configuredModel,
          availableModels: error.availableModels,
          baseline,
        },
        { status: 424 },
      );
    }

    if (error instanceof CerebrasNonGemmaModelError) {
      const baseline = await baselineForPrompt(userPrompt, includeBaseline);
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          configuredModel: error.configuredModel,
          availableModels: error.availableModels,
          baseline,
        },
        { status: 424 },
      );
    }

    const baseline = await baselineForPrompt(userPrompt, includeBaseline);
    return NextResponse.json(
      {
        ok: false,
        error: "Cerebras benchmark request failed.",
        detail: toErrorMessage(error),
        baseline,
      },
      { status: 502 },
    );
  }
}
