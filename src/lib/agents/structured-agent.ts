import "server-only";

import type { z } from "zod";
import { runGemmaAgent } from "@/lib/cerebras/client";
import { parseStructuredJson } from "@/lib/cerebras/json";
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
    let result: Awaited<ReturnType<typeof runGemmaAgent>> | null = null;
    let parseError: unknown = null;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      result = await runGemmaAgent({
        messages: [
          {
            role: "user",
            content:
              attempt === 1
                ? prompt
                : `${prompt}

Your previous response was empty, malformed, or did not match the required schema. Retry once and return only one complete valid JSON object with all required fields. Do not include markdown fences, prose, or partial JSON.`,
          },
        ],
        responseFormat: {
          type: "json_object",
        },
        reasoningEffort: "none",
      });

      try {
        const output = parseStructuredJson(result.content, schema);

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
        parseError = error;

        if (attempt >= 2) {
          throw parseError;
        }
      }
    }

    throw parseError instanceof Error ? parseError : new Error("Invalid structured output");
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
