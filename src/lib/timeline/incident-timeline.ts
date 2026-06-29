import type { AgentRun, FinalIncidentPackage } from "@/lib/cerebras/schemas";
import { hasVisualEvidence } from "@/lib/incident/visual-evidence";

export type TimelineEventStatus = "complete" | "failed" | "pending";

export type TimelineEvent = {
  id: string;
  lane: "evidence" | "agent" | "output";
  status: TimelineEventStatus;
  title: string;
  detail: string;
  meta: string;
};

const agentLabels: Record<string, string> = {
  intake_agent: "Intake Agent",
  vision_agent: "Vision Agent",
  log_agent: "Log Agent",
  api_agent: "API Agent",
  db_agent: "DB Agent",
  rca_agent: "RCA Agent",
  test_agent: "Test Agent",
  release_agent: "Release Agent",
  narrator_agent: "Demo Narrator",
};

function agentLabel(agentName: string) {
  return agentLabels[agentName] ?? agentName.replaceAll("_", " ");
}

function formatMetric(run: AgentRun) {
  if (!run.metrics) {
    return "No timing metrics";
  }

  const tokens =
    typeof run.metrics.totalTokens === "number"
      ? `${run.metrics.totalTokens} tokens`
      : "tokens n/a";
  const speed =
    typeof run.metrics.tokensPerSecond === "number"
      ? `${Math.round(run.metrics.tokensPerSecond)} tok/s`
      : "speed n/a";

  return `${run.metrics.latencyMs}ms, ${tokens}, ${speed}`;
}

function outputEvent(
  id: string,
  status: TimelineEventStatus,
  title: string,
  detail: string,
): TimelineEvent {
  return {
    id,
    lane: "output",
    status,
    title,
    detail,
    meta: status === "complete" ? "Generated output" : "Waiting for upstream agents",
  };
}

export function buildIncidentTimeline(result: FinalIncidentPackage) {
  const { incident, outputs } = result;
  const events: TimelineEvent[] = [];

  events.push({
    id: "evidence-visual",
    lane: "evidence",
    status: hasVisualEvidence(incident) ? "complete" : "pending",
    title: "Visual evidence",
    detail: hasVisualEvidence(incident)
      ? [
          incident.screenshotFileName || null,
          incident.videoFileName
            ? `${incident.videoFileName} (${incident.videoFrameDataUris.length || 1} frame${incident.videoFrameDataUris.length === 1 ? "" : "s"})`
            : null,
        ]
          .filter(Boolean)
          .join(" + ") || "Screenshot or representative frame supplied"
      : "No screenshot or representative video frame supplied.",
    meta: "Evidence",
  });

  for (const [id, title, value] of [
    ["evidence-logs", "Backend logs", incident.logs],
    ["evidence-api", "API response", incident.apiResponse],
    ["evidence-db", "DB snapshot", incident.dbSnapshot],
    ["evidence-diff", "Git diff", incident.gitDiff],
  ] as const) {
    events.push({
      id,
      lane: "evidence",
      status: value.trim() ? "complete" : "pending",
      title,
      detail: value.trim()
        ? `${value.trim().split(/\s+/).length} words supplied`
        : `${title} not supplied.`,
      meta: "Evidence",
    });
  }

  for (const run of result.agent_runs) {
    events.push({
      id: `agent-${run.agent_name}`,
      lane: "agent",
      status: run.status,
      title: agentLabel(run.agent_name),
      detail:
        run.status === "complete"
          ? "Completed from the live orchestration path."
          : run.error || "Agent failed without a provider error message.",
      meta: formatMetric(run),
    });
  }

  events.push(
    outputEvent(
      "output-rca",
      outputs.rca ? "complete" : "pending",
      "Root cause package",
      outputs.rca?.root_cause_summary ||
        "RCA is unavailable until evidence agents complete successfully.",
    ),
    outputEvent(
      "output-tests",
      outputs.tests ? "complete" : "pending",
      "Regression assets",
      outputs.tests
        ? `${outputs.tests.manual_qa_steps.length} QA steps, ${outputs.tests.sql_validation.length} SQL checks, Karate and Postman assertions.`
        : "Regression assets are unavailable until RCA completes successfully.",
    ),
    outputEvent(
      "output-release",
      outputs.release ? "complete" : "pending",
      "Release gate",
      outputs.release
        ? `${outputs.release.release_gate} with risk score ${outputs.release.risk_score}/100.`
        : "Release decision is unavailable until RCA and tests complete successfully.",
    ),
  );

  return events;
}
