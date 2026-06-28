import "server-only";

import { buildRcaAgentPrompt } from "@/lib/cerebras/prompts";
import {
  rcaOutputSchema,
  type ApiOutput,
  type DbOutput,
  type IncidentEvidence,
  type LogOutput,
} from "@/lib/cerebras/schemas";
import { runStructuredAgent } from "./structured-agent";

export async function runRcaAgent({
  incident,
  logs,
  api,
  db,
}: {
  incident: IncidentEvidence;
  logs: LogOutput;
  api: ApiOutput;
  db: DbOutput;
}) {
  return runStructuredAgent({
    agentName: "rca_agent",
    prompt: buildRcaAgentPrompt({ incident, logs, api, db }),
    schema: rcaOutputSchema,
  });
}
