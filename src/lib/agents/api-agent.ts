import "server-only";

import { buildApiAgentPrompt } from "@/lib/cerebras/prompts";
import {
  apiOutputSchema,
  incidentEvidenceSchema,
  type IncidentEvidence,
} from "@/lib/cerebras/schemas";
import { runStructuredAgent } from "./structured-agent";

export async function runApiAgent(incident: IncidentEvidence) {
  const parsedIncident = incidentEvidenceSchema.parse(incident);

  return runStructuredAgent({
    agentName: "api_agent",
    prompt: buildApiAgentPrompt(parsedIncident),
    schema: apiOutputSchema,
  });
}
