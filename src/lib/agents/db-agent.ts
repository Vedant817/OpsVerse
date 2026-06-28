import "server-only";

import { buildDbAgentPrompt } from "@/lib/cerebras/prompts";
import {
  dbOutputSchema,
  incidentEvidenceSchema,
  type IncidentEvidence,
} from "@/lib/cerebras/schemas";
import { runStructuredAgent } from "./structured-agent";

export async function runDbAgent(incident: IncidentEvidence) {
  const parsedIncident = incidentEvidenceSchema.parse(incident);

  return runStructuredAgent({
    agentName: "db_agent",
    prompt: buildDbAgentPrompt(parsedIncident),
    schema: dbOutputSchema,
  });
}
