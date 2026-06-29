export function isGemmaModel(model: string) {
  return model.toLowerCase().includes("gemma");
}

export function gemmaModelPolicyMessage(model: string) {
  return `Configured Cerebras model "${model}" is not a Gemma model. OpsVerse is scoped to Gemma 4 on Cerebras, so set CEREBRAS_MODEL to an available Gemma model before claiming live Gemma execution.`;
}
