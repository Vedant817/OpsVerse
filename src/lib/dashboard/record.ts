import {
  apiOutputSchema,
  dbOutputSchema,
  demoNarratorOutputSchema,
  finalIncidentPackageSchema,
  intakeOutputSchema,
  logOutputSchema,
  rcaOutputSchema,
  regressionTestOutputSchema,
  releaseRiskOutputSchema,
  visionOutputSchema,
  type AgentRun,
  type FinalIncidentPackage,
  type IncidentEvidence,
} from "@/lib/cerebras/schemas";
import type { AgentRunRow, IncidentDashboardRecord } from "@/lib/db/queries";

function latestEvidenceByType(record: IncidentDashboardRecord) {
  const evidence = new Map<string, string>();

  for (const row of record.evidence) {
    if (row.content && !evidence.has(row.type)) {
      evidence.set(row.type, row.content);
    }
  }

  return evidence;
}

function parseEvidenceArray(value: string | undefined) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function incidentFromRecord(record: IncidentDashboardRecord): IncidentEvidence {
  const evidence = latestEvidenceByType(record);

  return {
    title: record.incident.title,
    module: record.incident.module ?? "",
    screenshotNote: evidence.get("screenshot_note") ?? "",
    screenshotDataUri: evidence.get("screenshot_data_uri") ?? "",
    screenshotFileName: evidence.get("screenshot_file_name") ?? "",
    videoNote: evidence.get("video_note") ?? "",
    videoFrameDataUri: evidence.get("video_frame_data_uri") ?? "",
    videoFrameDataUris: parseEvidenceArray(evidence.get("video_frame_data_uris")),
    videoFileName: evidence.get("video_file_name") ?? "",
    logs: evidence.get("logs") ?? "",
    apiResponse: evidence.get("api_response") ?? "",
    dbSnapshot: evidence.get("db_snapshot") ?? "",
    gitDiff: evidence.get("git_diff") ?? "",
  };
}

function agentRunFromRow(row: AgentRunRow): AgentRun {
  return {
    agent_name: row.agent_name,
    status: row.status === "complete" ? "complete" : "failed",
    output: row.output ?? null,
    error: row.error,
    metrics:
      row.latency_ms === null
        ? null
        : {
            latencyMs: row.latency_ms,
            promptTokens: row.prompt_tokens,
            completionTokens: row.completion_tokens,
            totalTokens: row.total_tokens,
            tokensPerSecond: row.tokens_per_second,
            timeInfo: row.time_info ?? null,
          },
  };
}

function outputForAgent(record: IncidentDashboardRecord, agentName: string) {
  return (
    record.agentRuns.find(
      (run) => run.agent_name === agentName && run.status === "complete",
    )?.output ?? null
  );
}

export function dashboardRecordToFinalPackage(
  record: IncidentDashboardRecord,
): FinalIncidentPackage {
  const logs = logOutputSchema.safeParse(outputForAgent(record, "log_agent"));
  const intake = intakeOutputSchema.safeParse(outputForAgent(record, "intake_agent"));
  const vision = visionOutputSchema.safeParse(outputForAgent(record, "vision_agent"));
  const api = apiOutputSchema.safeParse(outputForAgent(record, "api_agent"));
  const db = dbOutputSchema.safeParse(outputForAgent(record, "db_agent"));
  const rca = rcaOutputSchema.safeParse(outputForAgent(record, "rca_agent"));
  const tests = regressionTestOutputSchema.safeParse(
    outputForAgent(record, "test_agent"),
  );
  const release = releaseRiskOutputSchema.safeParse(
    outputForAgent(record, "release_agent"),
  );
  const narrator = demoNarratorOutputSchema.safeParse(
    outputForAgent(record, "narrator_agent"),
  );

  return finalIncidentPackageSchema.parse({
    incident: incidentFromRecord(record),
    agent_runs: record.agentRuns.map(agentRunFromRow),
    outputs: {
      intake: intake.success ? intake.data : null,
      vision: vision.success ? vision.data : null,
      logs: logs.success ? logs.data : null,
      api: api.success ? api.data : null,
      db: db.success ? db.data : null,
      rca: rca.success ? rca.data : null,
      tests: tests.success ? tests.data : null,
      release: release.success ? release.data : null,
      narrator: narrator.success ? narrator.data : null,
    },
  });
}
