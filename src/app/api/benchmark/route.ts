import { NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { isEnvConfigError } from "@/lib/env";
import {
  CerebrasModelUnavailableError,
  runGemmaAgent,
} from "@/lib/cerebras/client";

export const runtime = "nodejs";

type BenchmarkRequestBody = {
  prompt?: unknown;
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

export async function GET() {
  return runBenchmark();
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

  return runBenchmark(body.prompt);
}

async function runBenchmark(prompt?: unknown) {
  try {
    const result = await runGemmaAgent({
      messages: buildBenchmarkMessages(prompt),
      reasoningEffort: "none",
    });

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
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (isEnvConfigError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          missing: error.missing,
        },
        { status: 503 },
      );
    }

    if (error instanceof CerebrasModelUnavailableError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          configuredModel: error.configuredModel,
          availableModels: error.availableModels,
        },
        { status: 424 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Cerebras benchmark request failed.",
        detail: toErrorMessage(error),
      },
      { status: 502 },
    );
  }
}
