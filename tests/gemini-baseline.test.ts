import test from "node:test";
import assert from "node:assert/strict";
import {
  parseGeminiContent,
  parseGeminiUsage,
} from "../src/lib/baseline/gemini-response";

test("Gemini baseline parser reads generateContent-style candidates", () => {
  const response = {
    candidates: [
      {
        content: {
          parts: [{ text: "Gemini baseline connected." }],
        },
      },
    ],
    usageMetadata: {
      promptTokenCount: 12,
      candidatesTokenCount: 8,
      totalTokenCount: 20,
    },
  };

  assert.equal(parseGeminiContent(response), "Gemini baseline connected.");
  assert.deepEqual(parseGeminiUsage(response), {
    promptTokens: 12,
    completionTokens: 8,
    totalTokens: 20,
  });
});

test("Gemini baseline parser reads output-text interaction responses", () => {
  const response = {
    output_text: "Interaction response.",
    usage: {
      inputTokenCount: 5,
      outputTokenCount: 4,
    },
  };

  assert.equal(parseGeminiContent(response), "Interaction response.");
  assert.deepEqual(parseGeminiUsage(response), {
    promptTokens: 5,
    completionTokens: 4,
    totalTokens: 9,
  });
});

test("Gemini baseline parser returns empty content and null usage safely", () => {
  assert.equal(parseGeminiContent({}), "");
  assert.deepEqual(parseGeminiUsage({}), {
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
  });
});
