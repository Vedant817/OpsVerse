import "server-only";

import { buildDemoNarratorAgentPrompt } from "@/lib/cerebras/prompts";
import {
  demoNarratorOutputSchema,
  type IncidentEvidence,
  type RcaOutput,
  type RegressionTestOutput,
  type ReleaseRiskOutput,
} from "@/lib/cerebras/schemas";
import { runStructuredAgent } from "./structured-agent";

export async function runNarratorAgent({
  incident,
  rca,
  tests,
  release,
}: {
  incident: IncidentEvidence;
  rca: RcaOutput;
  tests: RegressionTestOutput;
  release: ReleaseRiskOutput;
}) {
  return runStructuredAgent({
    agentName: "narrator_agent",
    prompt: buildDemoNarratorAgentPrompt({ incident, rca, tests, release }),
    schema: demoNarratorOutputSchema,
  });
}
