import type { AgentRun } from "@/lib/cerebras/schemas";

export type HeartbeatStreamEvent = {
  type: "heartbeat";
  timestamp: string;
};

export type MetricsUpdatedStreamEvent = {
  type: "metrics_updated";
  agent_name: string;
  metrics: NonNullable<AgentRun["metrics"]>;
};

export function serializeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function heartbeatStreamEvent(now = new Date()): HeartbeatStreamEvent {
  return {
    type: "heartbeat",
    timestamp: now.toISOString(),
  };
}

export function metricsUpdatedStreamEvent(
  run: AgentRun,
): MetricsUpdatedStreamEvent | null {
  if (!run.metrics) {
    return null;
  }

  return {
    type: "metrics_updated",
    agent_name: run.agent_name,
    metrics: run.metrics,
  };
}
