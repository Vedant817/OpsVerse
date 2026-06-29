import test from "node:test";
import assert from "node:assert/strict";
import {
  gemmaModelPolicyMessage,
  isGemmaModel,
} from "../src/lib/cerebras/model-policy";

test("Gemma model policy accepts Gemma-family ids only", () => {
  assert.equal(isGemmaModel("gemma-4-31b"), true);
  assert.equal(isGemmaModel("google/gemma-3-27b-it"), true);
  assert.equal(isGemmaModel("gpt-oss-120b"), false);
  assert.equal(isGemmaModel("zai-glm-4.7"), false);
});

test("non-Gemma model policy message is explicit", () => {
  assert.match(gemmaModelPolicyMessage("gpt-oss-120b"), /not a Gemma model/);
  assert.match(gemmaModelPolicyMessage("gpt-oss-120b"), /Gemma 4 on Cerebras/);
});
