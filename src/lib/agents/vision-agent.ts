import "server-only";

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { runGemmaAgent } from "@/lib/cerebras/client";
import { buildVisionAgentPrompt } from "@/lib/cerebras/prompts";
import {
  incidentEvidenceSchema,
  visionOutputSchema,
  type AgentRun,
  type IncidentEvidence,
  type VisionOutput,
} from "@/lib/cerebras/schemas";
import { validateImageDataUri } from "@/lib/cerebras/image";

type VisionAgentSuccess = {
  ok: true;
  output: VisionOutput;
  run: AgentRun;
};

type VisionAgentFailure = {
  ok: false;
  output: null;
  run: AgentRun;
};

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

function failedRun(message: string): VisionAgentFailure {
  return {
    ok: false,
    output: null,
    run: {
      agent_name: "vision_agent",
      status: "failed",
      output: null,
      error: message,
      metrics: null,
    },
  };
}

function imageEvidence(incident: IncidentEvidence) {
  const images = [
    validateImageDataUri(incident.screenshotDataUri, "Screenshot image"),
    ...incident.videoFrameDataUris.map((dataUri, index) =>
      validateImageDataUri(dataUri, `Video frame image ${index + 1}`),
    ),
    validateImageDataUri(incident.videoFrameDataUri, "Video frame image"),
  ].filter((image): image is NonNullable<typeof image> => Boolean(image));

  return images.slice(0, 4);
}

export async function runVisionAgent(
  incident: IncidentEvidence,
): Promise<VisionAgentSuccess | VisionAgentFailure> {
  const parsedIncident = incidentEvidenceSchema.parse(incident);
  const images = imageEvidence(parsedIncident);

  if (images.length === 0) {
    return failedRun(
      "Vision skipped because no screenshot image or representative video frame was supplied.",
    );
  }

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: buildVisionAgentPrompt(parsedIncident),
        },
        ...images.map((image) => ({
          type: "image_url",
          image_url: {
            url: image.dataUri,
          },
        }) as const),
      ],
    },
  ];

  try {
    const result = await runGemmaAgent({
      messages,
      responseFormat: {
        type: "json_object",
      },
      reasoningEffort: "none",
    });
    const output = visionOutputSchema.parse(parseJson(result.content));

    return {
      ok: true,
      output,
      run: {
        agent_name: "vision_agent",
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
    return failedRun(error instanceof Error ? error.message : "Unknown vision error");
  }
}
