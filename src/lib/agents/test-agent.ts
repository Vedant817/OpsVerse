import "server-only";

import { buildTestAgentPrompt } from "@/lib/cerebras/prompts";
import {
  regressionTestOutputSchema,
  type ApiOutput,
  type DbOutput,
  type IncidentEvidence,
  type RcaOutput,
} from "@/lib/cerebras/schemas";
import { runStructuredAgent } from "./structured-agent";

export async function runTestAgent({
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
    agentName: "test_agent",
    prompt: buildTestAgentPrompt({ incident, rca, api, db }),
    schema: regressionTestOutputSchema,
  });
}
