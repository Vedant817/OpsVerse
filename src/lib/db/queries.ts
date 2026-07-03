import "server-only";

import { getSupabaseAdminClient } from "@/lib/db/supabase";
import type {
  AgentRun,
  FinalIncidentPackage,
  IncidentEvidence,
} from "@/lib/cerebras/schemas";

export type IncidentRow = {
  id: string;
  title: string;
  module: string | null;
  status: string;
  severity: string | null;
  created_at: string;
};

export type EvidenceRow = {
  id: string;
  incident_id: string;
  type: string;
  content: string | null;
  file_url: string | null;
  created_at: string;
};

export type AgentRunRow = {
  id: string;
  incident_id: string;
  agent_name: string;
  status: string;
  latency_ms: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  tokens_per_second: number | null;
  time_info: unknown;
  output: unknown;
  error: string | null;
  created_at: string;
};

export type AgentEventRow = {
  id: string;
  incident_id: string;
  event_type: string;
  agent_name: string | null;
  run_status: string | null;
  payload: unknown;
  created_at: string;
};

export type SpeedBenchmarkRow = {
  id: string;
  incident_id: string | null;
  provider: string;
  model: string;
  total_latency_ms: number;
  total_tokens: number | null;
  average_tokens_per_second: number | null;
  agent_count: number;
  created_at: string;
};

export type IncidentDashboardRecord = {
  incident: IncidentRow;
  evidence: EvidenceRow[];
  agentRuns: AgentRunRow[];
  agentEvents: AgentEventRow[];
  speedBenchmarks: SpeedBenchmarkRow[];
};

export type IncidentSummary = {
  incident: IncidentRow;
  evidence_count: number;
  agent_run_count: number;
  agent_event_count: number;
  speed_benchmark_count: number;
};

export class DatabaseQueryError extends Error {
  constructor(
    message: string,
    readonly causeDetail?: string,
  ) {
    super(message);
    this.name = "DatabaseQueryError";
  }
}

function assertNoDatabaseError(error: { message?: string } | null, action: string) {
  if (error) {
    throw new DatabaseQueryError(`${action} failed.`, error.message);
  }
}

function evidenceRows(incidentId: string, incident: IncidentEvidence) {
  return [
    {
      incident_id: incidentId,
      type: "screenshot_note",
      content: incident.screenshotNote || null,
      file_url: null,
    },
    {
      incident_id: incidentId,
      type: "screenshot_data_uri",
      content: incident.screenshotDataUri || null,
      file_url: null,
    },
    {
      incident_id: incidentId,
      type: "screenshot_file_name",
      content: incident.screenshotFileName || null,
      file_url: null,
    },
    {
      incident_id: incidentId,
      type: "video_note",
      content: incident.videoNote || null,
      file_url: null,
    },
    {
      incident_id: incidentId,
      type: "video_frame_data_uri",
      content: incident.videoFrameDataUri || null,
      file_url: null,
    },
    {
      incident_id: incidentId,
      type: "video_frame_data_uris",
      content:
        incident.videoFrameDataUris.length > 0
          ? JSON.stringify(incident.videoFrameDataUris)
          : null,
      file_url: null,
    },
    {
      incident_id: incidentId,
      type: "video_file_name",
      content: incident.videoFileName || null,
      file_url: null,
    },
    {
      incident_id: incidentId,
      type: "logs",
      content: incident.logs,
      file_url: null,
    },
    {
      incident_id: incidentId,
      type: "api_response",
      content: incident.apiResponse,
      file_url: null,
    },
    {
      incident_id: incidentId,
      type: "db_snapshot",
      content: incident.dbSnapshot,
      file_url: null,
    },
    {
      incident_id: incidentId,
      type: "git_diff",
      content: incident.gitDiff || null,
      file_url: null,
    },
  ];
}

function latestEvidenceByType(evidence: EvidenceRow[]) {
  const values = new Map<string, string>();

  for (const row of evidence) {
    if (row.content !== null && !values.has(row.type)) {
      values.set(row.type, row.content);
    }
  }

  return values;
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

export async function createIncident(incident: IncidentEvidence) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      title: incident.title,
      module: incident.module,
      status: "created",
    })
    .select("id")
    .single();

  assertNoDatabaseError(error, "Create incident");

  if (!data?.id || typeof data.id !== "string") {
    throw new DatabaseQueryError("Create incident failed.", "No incident id returned.");
  }

  return data.id;
}

export async function saveEvidence(incidentId: string, incident: IncidentEvidence) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("incident_evidence")
    .insert(evidenceRows(incidentId, incident));

  assertNoDatabaseError(error, "Save incident evidence");
}

export async function createIncidentWithEvidence(incident: IncidentEvidence) {
  const incidentId = await createIncident(incident);
  await saveEvidence(incidentId, incident);
  return incidentId;
}

export async function updateIncidentStatus(incidentId: string, status: string) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("incidents")
    .update({ status })
    .eq("id", incidentId);

  assertNoDatabaseError(error, `Update incident status to ${status}`);
}

export async function saveAgentRuns(incidentId: string, agentRuns: AgentRun[]) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("agent_runs").insert(
    agentRuns.map((run) => ({
      incident_id: incidentId,
      agent_name: run.agent_name,
      status: run.status,
      latency_ms: run.metrics?.latencyMs ?? null,
      prompt_tokens: run.metrics?.promptTokens ?? null,
      completion_tokens: run.metrics?.completionTokens ?? null,
      total_tokens: run.metrics?.totalTokens ?? null,
      tokens_per_second: run.metrics?.tokensPerSecond ?? null,
      time_info: run.metrics?.timeInfo ?? null,
      output: run.output,
      error: run.error,
    })),
  );

  assertNoDatabaseError(error, "Save agent runs");
}

export async function saveAgentRun(incidentId: string, run: AgentRun) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("agent_runs").insert({
    incident_id: incidentId,
    agent_name: run.agent_name,
    status: run.status,
    latency_ms: run.metrics?.latencyMs ?? null,
    prompt_tokens: run.metrics?.promptTokens ?? null,
    completion_tokens: run.metrics?.completionTokens ?? null,
    total_tokens: run.metrics?.totalTokens ?? null,
    tokens_per_second: run.metrics?.tokensPerSecond ?? null,
    time_info: run.metrics?.timeInfo ?? null,
    output: run.output,
    error: run.error,
  });

  assertNoDatabaseError(error, `Save ${run.agent_name} run`);
}

export async function saveAgentEvent(
  incidentId: string,
  event: {
    event_type: string;
    agent_name?: string | null;
    run_status?: string | null;
    payload?: unknown;
  },
) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("agent_events").insert({
    incident_id: incidentId,
    event_type: event.event_type,
    agent_name: event.agent_name ?? null,
    run_status: event.run_status ?? null,
    payload: event.payload ?? null,
  });

  assertNoDatabaseError(error, `Save ${event.event_type} event`);
}

export async function saveSpeedBenchmarkData(
  incidentId: string,
  finalPackage: FinalIncidentPackage,
  model: string,
) {
  const completedRuns = finalPackage.agent_runs.filter(
    (run) => run.status === "complete" && run.metrics,
  );
  const totalLatencyMs = completedRuns.reduce(
    (sum, run) => sum + (run.metrics?.latencyMs ?? 0),
    0,
  );
  const totalTokens = completedRuns.reduce(
    (sum, run) => sum + (run.metrics?.totalTokens ?? 0),
    0,
  );
  const tokenSpeeds = completedRuns
    .map((run) => run.metrics?.tokensPerSecond)
    .filter((value): value is number => typeof value === "number");
  const averageTokensPerSecond =
    tokenSpeeds.length > 0
      ? tokenSpeeds.reduce((sum, value) => sum + value, 0) / tokenSpeeds.length
      : null;

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("speed_benchmarks").insert({
    incident_id: incidentId,
    provider: "cerebras",
    model,
    total_latency_ms: totalLatencyMs,
    total_tokens: totalTokens || null,
    average_tokens_per_second: averageTokensPerSecond,
    agent_count: completedRuns.length,
  });

  assertNoDatabaseError(error, "Save speed benchmark");
}

export async function loadFullIncidentDashboard(
  incidentId: string,
): Promise<IncidentDashboardRecord> {
  const supabase = getSupabaseAdminClient();
  const [
    incidentResult,
    evidenceResult,
    agentRunsResult,
    agentEventsResult,
    speedBenchmarksResult,
  ] = await Promise.all([
    supabase.from("incidents").select("*").eq("id", incidentId).single(),
    supabase
      .from("incident_evidence")
      .select("*")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: false }),
    supabase
      .from("agent_runs")
      .select("*")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: true }),
    supabase
      .from("agent_events")
      .select("*")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: true }),
    supabase
      .from("speed_benchmarks")
      .select("*")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: false }),
  ]);

  assertNoDatabaseError(incidentResult.error, "Load incident");
  assertNoDatabaseError(evidenceResult.error, "Load incident evidence");
  assertNoDatabaseError(agentRunsResult.error, "Load agent runs");
  assertNoDatabaseError(agentEventsResult.error, "Load agent events");
  assertNoDatabaseError(speedBenchmarksResult.error, "Load speed benchmarks");

  return {
    incident: incidentResult.data as IncidentRow,
    evidence: (evidenceResult.data ?? []) as EvidenceRow[],
    agentRuns: (agentRunsResult.data ?? []) as AgentRunRow[],
    agentEvents: (agentEventsResult.data ?? []) as AgentEventRow[],
    speedBenchmarks: (speedBenchmarksResult.data ?? []) as SpeedBenchmarkRow[],
  };
}

export async function listIncidentSummaries(limit = 20): Promise<IncidentSummary[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  assertNoDatabaseError(error, "List incidents");

  const incidents = (data ?? []) as IncidentRow[];

  return Promise.all(
    incidents.map(async (incident) => {
      const [
        evidenceResult,
        agentRunsResult,
        agentEventsResult,
        speedBenchmarksResult,
      ] =
        await Promise.all([
          supabase
            .from("incident_evidence")
            .select("id", { count: "exact", head: true })
            .eq("incident_id", incident.id),
          supabase
            .from("agent_runs")
            .select("id", { count: "exact", head: true })
            .eq("incident_id", incident.id),
          supabase
            .from("agent_events")
            .select("id", { count: "exact", head: true })
            .eq("incident_id", incident.id),
          supabase
            .from("speed_benchmarks")
            .select("id", { count: "exact", head: true })
            .eq("incident_id", incident.id),
        ]);

      assertNoDatabaseError(
        evidenceResult.error,
        `Count evidence for incident ${incident.id}`,
      );
      assertNoDatabaseError(
        agentRunsResult.error,
        `Count agent runs for incident ${incident.id}`,
      );
      assertNoDatabaseError(
        agentEventsResult.error,
        `Count agent events for incident ${incident.id}`,
      );
      assertNoDatabaseError(
        speedBenchmarksResult.error,
        `Count speed benchmarks for incident ${incident.id}`,
      );

      return {
        incident,
        evidence_count: evidenceResult.count ?? 0,
        agent_run_count: agentRunsResult.count ?? 0,
        agent_event_count: agentEventsResult.count ?? 0,
        speed_benchmark_count: speedBenchmarksResult.count ?? 0,
      };
    }),
  );
}

export async function loadIncidentEvidence(
  incidentId: string,
): Promise<IncidentEvidence> {
  const dashboard = await loadFullIncidentDashboard(incidentId);
  const evidence = latestEvidenceByType(dashboard.evidence);

  return {
    title: dashboard.incident.title,
    module: dashboard.incident.module ?? "",
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
