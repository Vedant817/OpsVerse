export type GeminiUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

type GeminiCandidatePart = {
  text?: unknown;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiCandidatePart[];
  };
};

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

export function parseGeminiContent(response: unknown) {
  const body = record(response);
  const outputText = body.output_text;
  if (typeof outputText === "string" && outputText.trim()) {
    return outputText.trim();
  }

  const text = body.text;
  if (typeof text === "string" && text.trim()) {
    return text.trim();
  }

  const candidates = body.candidates;
  if (Array.isArray(candidates)) {
    const parts = candidates.flatMap((candidate: GeminiCandidate) =>
      candidate.content?.parts ?? [],
    );
    const joined = parts
      .map((part) => part.text)
      .filter((part): part is string => typeof part === "string")
      .join("\n")
      .trim();

    if (joined) {
      return joined;
    }
  }

  const outputs = body.output;
  if (Array.isArray(outputs)) {
    const joined = outputs
      .flatMap((item) => {
        const itemRecord = record(item);
        const content = itemRecord.content;
        return Array.isArray(content) ? content : [];
      })
      .map((contentItem) => record(contentItem).text)
      .filter((value): value is string => typeof value === "string")
      .join("\n")
      .trim();

    if (joined) {
      return joined;
    }
  }

  return "";
}

export function parseGeminiUsage(response: unknown): GeminiUsage {
  const body = record(response);
  const usage = record(body.usageMetadata ?? body.usage_metadata ?? body.usage);

  const promptTokens = numberOrNull(
    usage.promptTokenCount ?? usage.inputTokenCount ?? usage.prompt_tokens,
  );
  const completionTokens = numberOrNull(
    usage.candidatesTokenCount ??
      usage.outputTokenCount ??
      usage.completion_tokens,
  );
  const totalTokens = numberOrNull(
    usage.totalTokenCount ??
      usage.totalTokens ??
      usage.total_tokens ??
      (promptTokens !== null && completionTokens !== null
        ? promptTokens + completionTokens
        : null),
  );

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
}
