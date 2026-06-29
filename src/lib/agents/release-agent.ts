import "server-only";

import { buildReleaseAgentPrompt } from "@/lib/cerebras/prompts";
import {
  releaseRiskOutputSchema,
  type ApiOutput,
  type DbOutput,
  type IncidentEvidence,
  type RcaOutput,
} from "@/lib/cerebras/schemas";
import { runStructuredAgent } from "./structured-agent";

export async function runReleaseAgent({
  incident,
  rca,
  api,
  db,
}: {
  incident: IncidentEvidence;
  rca: RcaOutput;
  api: ApiOutput;
  db: DbOutput;
}) {
  return runStructuredAgent({
    agentName: "release_agent",
    prompt: buildReleaseAgentPrompt({ incident, rca, api, db }),
    schema: releaseRiskOutputSchema,
  });
}
