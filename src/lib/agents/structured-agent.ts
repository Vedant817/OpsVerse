import "server-only";

import type { z } from "zod";
import { runGemmaAgent } from "@/lib/cerebras/client";
import type { AgentRun } from "@/lib/cerebras/schemas";

type StructuredAgentSuccess<T> = {
  ok: true;
  output: T;
  run: AgentRun;
};

type StructuredAgentFailure = {
  ok: false;
  output: null;
  run: AgentRun;
};

export type StructuredAgentResult<T> =
  | StructuredAgentSuccess<T>
  | StructuredAgentFailure;

function extractJsonObject(content: string) {
  const trimmed = content.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function parseJson(content: string): unknown {
  return JSON.parse(extractJsonObject(content));
}

export async function runStructuredAgent<T>({
  agentName,
  prompt,
  schema,
}: {
  agentName: string;
  prompt: string;
  schema: z.ZodType<T>;
}): Promise<StructuredAgentResult<T>> {
  try {
    const result = await runGemmaAgent({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      responseFormat: {
        type: "json_object",
      },
      reasoningEffort: "none",
    });

    const parsed = parseJson(result.content);
    const output = schema.parse(parsed);

    return {
      ok: true,
      output,
      run: {
        agent_name: agentName,
        status: "complete",
        output,
        error: null,
        metrics: {
          latencyMs: result.latencyMs,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          tokensPerSecond: result.tokensPerSecond,
          timeInfo: result.timeInfo,
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown agent error";

    return {
      ok: false,
      output: null,
      run: {
        agent_name: agentName,
        status: "failed",
        output: null,
        error: message,
        metrics: null,
      },
    };
  }
}
