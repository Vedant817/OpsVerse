import "server-only";

import type { AgentRun, IncidentEvidence } from "@/lib/cerebras/schemas";
import { buildLocalDemoIncidentPackage } from "@/lib/agents/local-demo-output";

type LocalDemoStreamEvent =
  | {
      type: "agent_started";
      agent_name: string;
    }
  | {
      type: "agent_completed";
      run: AgentRun;
    };

type LocalDemoEventHandler = (event: LocalDemoStreamEvent) => void | Promise<void>;

export async function runLocalDemoIncidentSwarm({
  incident,
  incidentId,
  onEvent,
}: {
  incident: IncidentEvidence;
  incidentId?: string | null;
  onEvent?: LocalDemoEventHandler;
}) {
  const result = buildLocalDemoIncidentPackage(incident, incidentId ?? null);

  for (const run of result.agent_runs) {
    await onEvent?.({
      type: "agent_started",
      agent_name: run.agent_name,
    });
    await onEvent?.({
      type: "agent_completed",
      run,
    });
  }

  return result;
}
