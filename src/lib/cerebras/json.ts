import type { z } from "zod";

export function extractJsonObject(content: string) {
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

export function parseJsonContent(content: string): unknown {
  return JSON.parse(extractJsonObject(content));
}

export function parseStructuredJson<T>(
  content: string,
  schema: z.ZodType<T>,
): T {
  return schema.parse(parseJsonContent(content));
}
