import "server-only";

import { buildReleaseAgentPrompt } from "@/lib/cerebras/prompts";
import {
  releaseRiskOutputSchema,
  type IncidentEvidence,
  type RcaOutput,
  type RegressionTestOutput,
} from "@/lib/cerebras/schemas";
import { runStructuredAgent } from "./structured-agent";

export async function runReleaseAgent({
  incident,
  rca,
  tests,
}: {
  incident: IncidentEvidence;
  rca: RcaOutput;
  tests: RegressionTestOutput;
}) {
  return runStructuredAgent({
    agentName: "release_agent",
    prompt: buildReleaseAgentPrompt({ incident, rca, tests }),
    schema: releaseRiskOutputSchema,
  });
}
