import "server-only";

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { runGemmaAgent } from "@/lib/cerebras/client";
import { cerebrasErrorStatus } from "@/lib/cerebras/errors";
import { parseStructuredJson } from "@/lib/cerebras/json";
import { buildVisionAgentPrompt } from "@/lib/cerebras/prompts";
import {
  incidentEvidenceSchema,
  visionOutputSchema,
  type AgentRun,
  type IncidentEvidence,
  type VisionOutput,
} from "@/lib/cerebras/schemas";
import { validateImageDataUri, type ValidatedImageDataUri } from "@/lib/cerebras/image";

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

function visualNotes(incident: IncidentEvidence) {
  return [incident.screenshotNote, incident.videoNote]
    .map((note) => note.trim())
    .filter(Boolean)
    .join("\n");
}

function visualEvidenceMetadata(images: ValidatedImageDataUri[]) {
  if (images.length === 0) {
    return "No validated image/frame data URI metadata was available.";
  }

  return images
    .map((image, index) => {
      const dimensions =
        image.width && image.height
          ? `${image.width}x${image.height}`
          : "dimensions unavailable";
      const sizeKb = Math.max(1, Math.round(image.sizeBytes / 1024));

      return `${index + 1}. ${image.mimeType}, ${dimensions}, ${sizeKb}KB`;
    })
    .join("\n");
}

function visionPromptWithMetadata(
  incident: IncidentEvidence,
  images: ValidatedImageDataUri[],
) {
  return `${buildVisionAgentPrompt(incident)}

Validated visual evidence metadata:
${visualEvidenceMetadata(images)}`;
}

function noteFallbackPrompt(
  incident: IncidentEvidence,
  images: ValidatedImageDataUri[],
  status: number,
) {
  return `${buildVisionAgentPrompt(incident)}

The provider rejected image_url evidence with HTTP ${status}. Use only the submitted screenshot/video notes below. Do not claim direct pixel inspection, and make the note-based fallback explicit in the JSON fields.

Validated visual evidence metadata:
${visualEvidenceMetadata(images)}

Submitted visual notes:
${visualNotes(incident)}`;
}

function annotateNoteFallback(output: VisionOutput, status: number): VisionOutput {
  return visionOutputSchema.parse({
    ...output,
    visible_error: `Image transport fallback from submitted visual notes after provider HTTP ${status}; ${output.visible_error}`,
    ui_state: `Note-based visual interpretation, not direct pixel analysis: ${output.ui_state}`,
  });
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
          text: visionPromptWithMetadata(parsedIncident, images),
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
    const output = parseStructuredJson(result.content, visionOutputSchema);

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
    const status = cerebrasErrorStatus(error);
    const notes = visualNotes(parsedIncident);

    if (status === 400 && notes) {
      try {
        const result = await runGemmaAgent({
          messages: [
            {
              role: "user",
              content: noteFallbackPrompt(parsedIncident, images, status),
            },
          ],
          responseFormat: {
            type: "json_object",
          },
          reasoningEffort: "none",
        });
        const output = annotateNoteFallback(
          parseStructuredJson(result.content, visionOutputSchema),
          status,
        );

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
      } catch (fallbackError) {
        return failedRun(
          `Vision image transport failed with provider HTTP ${status}, and note-based fallback also failed: ${
            fallbackError instanceof Error ? fallbackError.message : "Unknown vision fallback error"
          }`,
        );
      }
    }

    return failedRun(error instanceof Error ? error.message : "Unknown vision error");
  }
}
