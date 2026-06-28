import "server-only";

import { buildLogAgentPrompt } from "@/lib/cerebras/prompts";
import {
  incidentEvidenceSchema,
  logOutputSchema,
  type IncidentEvidence,
} from "@/lib/cerebras/schemas";
import { runStructuredAgent } from "./structured-agent";

export async function runLogAgent(incident: IncidentEvidence) {
  const parsedIncident = incidentEvidenceSchema.parse(incident);

  return runStructuredAgent({
    agentName: "log_agent",
    prompt: buildLogAgentPrompt(parsedIncident),
    schema: logOutputSchema,
  });
}
