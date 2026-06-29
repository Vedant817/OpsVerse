import "server-only";

import {
  intakeOutputSchema,
  incidentEvidenceSchema,
  type AgentRun,
  type IncidentEvidence,
  type IntakeOutput,
} from "@/lib/cerebras/schemas";

function hasText(value: string | undefined) {
  return Boolean(value?.trim());
}

function artifactList(incident: IncidentEvidence) {
  return [
    hasText(incident.screenshotDataUri) || hasText(incident.screenshotNote)
      ? "screenshot"
      : null,
    hasText(incident.videoFrameDataUri) || hasText(incident.videoNote)
      ? "video_frame_or_notes"
      : null,
    hasText(incident.logs) ? "logs" : null,
    hasText(incident.apiResponse) ? "api_response" : null,
    hasText(incident.dbSnapshot) ? "db_snapshot" : null,
    hasText(incident.gitDiff) ? "git_diff" : null,
  ].filter((artifact): artifact is string => artifact !== null);
}

function missingArtifacts(incident: IncidentEvidence) {
  return [
    !hasText(incident.screenshotDataUri) ? "actual screenshot image" : null,
    !hasText(incident.videoFrameDataUri) ? "representative video frame" : null,
    !hasText(incident.gitDiff) ? "git diff" : null,
    "network trace",
    "frontend console errors",
  ].filter((artifact): artifact is string => artifact !== null);
}

function recommendedAgents(incident: IncidentEvidence) {
  return [
    hasText(incident.screenshotDataUri) || hasText(incident.videoFrameDataUri)
      ? "vision_agent"
      : null,
    hasText(incident.logs) ? "log_agent" : null,
    hasText(incident.apiResponse) ? "api_agent" : null,
    hasText(incident.dbSnapshot) ? "db_agent" : null,
    "rca_agent",
    "test_agent",
    "release_agent",
  ].filter((agent): agent is string => agent !== null);
}

export function runIntakeAgent({
  incident,
  incidentId,
}: {
  incident: IncidentEvidence;
  incidentId: string | null;
}) {
  const parsedIncident = incidentEvidenceSchema.parse(incident);
  const output: IntakeOutput = intakeOutputSchema.parse({
    incident_id: incidentId ?? "unpersisted",
    detected_artifacts: artifactList(parsedIncident),
    missing_artifacts: missingArtifacts(parsedIncident),
    recommended_agents: recommendedAgents(parsedIncident),
    normalized_title: parsedIncident.title.trim(),
    normalized_module: parsedIncident.module.trim(),
  });
  const run: AgentRun = {
    agent_name: "intake_agent",
    status: "complete",
    output,
    error: null,
    metrics: {
      latencyMs: 0,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      tokensPerSecond: null,
      timeInfo: null,
    },
  };

  return {
    ok: true,
    output,
    run,
  } as const;
}
