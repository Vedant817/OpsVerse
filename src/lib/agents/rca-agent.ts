import "server-only";

import { buildRcaAgentPrompt } from "@/lib/cerebras/prompts";
import {
  rcaOutputSchema,
  type ApiOutput,
  type DbOutput,
  type IncidentEvidence,
  type LogOutput,
  type VisionOutput,
} from "@/lib/cerebras/schemas";
import { runStructuredAgent } from "./structured-agent";

export async function runRcaAgent({
  incident,
  logs,
  api,
  db,
  vision,
}: {
  incident: IncidentEvidence;
  logs: LogOutput;
  api: ApiOutput;
  db: DbOutput;
  vision: VisionOutput | null;
}) {
  return runStructuredAgent({
    agentName: "rca_agent",
    prompt: buildRcaAgentPrompt({ incident, logs, api, db, vision }),
    schema: rcaOutputSchema,
  });
}
