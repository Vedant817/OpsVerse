import test from "node:test";
import assert from "node:assert/strict";
import { dashboardRecordToFinalPackage } from "../src/lib/dashboard/record";
import type {
  AgentEventRow,
  AgentRunRow,
  IncidentDashboardRecord,
} from "../src/lib/db/queries";
import { primaryIncidentSample } from "../src/lib/samples";

const incidentId = "11111111-1111-4111-8111-111111111111";
const imageDataUri =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

const outputs = {
  intake: {
    incident_id: incidentId,
    detected_artifacts: ["screenshot", "logs", "api_response", "db_snapshot"],
    missing_artifacts: ["network trace"],
    recommended_agents: ["vision_agent", "log_agent", "api_agent", "db_agent"],
    normalized_title: primaryIncidentSample.title,
    normalized_module: primaryIncidentSample.module,
  },
  logs: {
    primary_error: "CartSummaryValidationException",
    service: "order-service",
    correlation_id: "req-8f32",
    timestamp: "2026-06-28T18:45:21Z",
    repeated_pattern: "confirmedQty cannot be null",
    failing_function_or_module: "CartSummaryValidator.validate",
    probable_cause: "confirmedQty is null for SKU 13321",
    confidence: 0.86,
  },
  release: {
    release_gate: "BLOCK" as const,
    risk_score: 92,
    reason: "Core order placement journey is broken.",
    must_fix_before_release: [
      "Fix confirmedQty mapper",
      "Show frontend validation error",
    ],
    recommended_tests: ["Cart summary confirmedQty regression"],
  },
};

function agentRunRow(
  agentName: string,
  status: "complete" | "failed",
  output: unknown,
  metrics: Partial<AgentRunRow> = {},
): AgentRunRow {
  return {
    id: `${agentName}-row`,
    incident_id: incidentId,
    agent_name: agentName,
    status,
    latency_ms: metrics.latency_ms ?? null,
    prompt_tokens: metrics.prompt_tokens ?? null,
    completion_tokens: metrics.completion_tokens ?? null,
    total_tokens: metrics.total_tokens ?? null,
    tokens_per_second: metrics.tokens_per_second ?? null,
    time_info: metrics.time_info ?? null,
    output,
    error: status === "failed" ? "Agent failed in saved row" : null,
    created_at: "2026-06-29T10:00:00.000Z",
  };
}

function agentEventRow(
  agentName: string,
  eventType: "agent_started" | "agent_completed",
  runStatus: string,
): AgentEventRow {
  return {
    id: `${agentName}-${eventType}`,
    incident_id: incidentId,
    event_type: eventType,
    agent_name: agentName,
    run_status: runStatus,
    payload: {
      type: eventType,
      agent_name: agentName,
    },
    created_at: "2026-06-29T10:00:00.000Z",
  };
}

const dashboardRecord: IncidentDashboardRecord = {
  incident: {
    id: incidentId,
    title: primaryIncidentSample.title,
    module: primaryIncidentSample.module,
    status: "created",
    severity: "high",
    created_at: "2026-06-29T10:00:00.000Z",
  },
  evidence: [
    {
      id: "evidence-latest-note",
      incident_id: incidentId,
      type: "screenshot_note",
      content: primaryIncidentSample.screenshotNote,
      file_url: null,
      created_at: "2026-06-29T10:02:00.000Z",
    },
    {
      id: "evidence-older-note",
      incident_id: incidentId,
      type: "screenshot_note",
      content: "Older screenshot note should not win.",
      file_url: null,
      created_at: "2026-06-29T10:01:00.000Z",
    },
    {
      id: "evidence-image",
      incident_id: incidentId,
      type: "screenshot_data_uri",
      content: imageDataUri,
      file_url: null,
      created_at: "2026-06-29T10:02:00.000Z",
    },
    {
      id: "evidence-image-name",
      incident_id: incidentId,
      type: "screenshot_file_name",
      content: "cart-summary-failure.synthetic.png",
      file_url: null,
      created_at: "2026-06-29T10:02:00.000Z",
    },
    {
      id: "evidence-frames",
      incident_id: incidentId,
      type: "video_frame_data_uris",
      content: JSON.stringify([imageDataUri, 42, imageDataUri]),
      file_url: null,
      created_at: "2026-06-29T10:02:00.000Z",
    },
    {
      id: "evidence-video-name",
      incident_id: incidentId,
      type: "video_file_name",
      content: "cart-summary.synthetic.mp4",
      file_url: null,
      created_at: "2026-06-29T10:02:00.000Z",
    },
    {
      id: "evidence-logs",
      incident_id: incidentId,
      type: "logs",
      content: primaryIncidentSample.logs,
      file_url: null,
      created_at: "2026-06-29T10:02:00.000Z",
    },
    {
      id: "evidence-api",
      incident_id: incidentId,
      type: "api_response",
      content: primaryIncidentSample.apiResponse,
      file_url: null,
      created_at: "2026-06-29T10:02:00.000Z",
    },
    {
      id: "evidence-db",
      incident_id: incidentId,
      type: "db_snapshot",
      content: primaryIncidentSample.dbSnapshot,
      file_url: null,
      created_at: "2026-06-29T10:02:00.000Z",
    },
    {
      id: "evidence-diff",
      incident_id: incidentId,
      type: "git_diff",
      content: primaryIncidentSample.gitDiff,
      file_url: null,
      created_at: "2026-06-29T10:02:00.000Z",
    },
  ],
  speedBenchmarks: [],
  agentEvents: [
    agentEventRow("intake_agent", "agent_started", "running"),
    agentEventRow("intake_agent", "agent_completed", "complete"),
    agentEventRow("log_agent", "agent_started", "running"),
    agentEventRow("log_agent", "agent_completed", "complete"),
    agentEventRow("api_agent", "agent_started", "running"),
    agentEventRow("api_agent", "agent_completed", "failed"),
    agentEventRow("release_agent", "agent_started", "running"),
    agentEventRow("release_agent", "agent_completed", "complete"),
  ],
  agentRuns: [
    agentRunRow("intake_agent", "complete", outputs.intake, {
      latency_ms: 12,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      tokens_per_second: null,
      time_info: { deterministic: true },
    }),
    agentRunRow("log_agent", "complete", outputs.logs, {
      latency_ms: 210,
      prompt_tokens: 100,
      completion_tokens: 80,
      total_tokens: 180,
      tokens_per_second: 380.5,
      time_info: { queue_ms: 3 },
    }),
    agentRunRow("api_agent", "failed", null),
    agentRunRow("release_agent", "complete", outputs.release, {
      latency_ms: 250,
      prompt_tokens: 130,
      completion_tokens: 90,
      total_tokens: 220,
      tokens_per_second: 360,
      time_info: null,
    }),
  ],
};

test("dashboard refresh reconstruction preserves saved evidence and agent metrics", () => {
  const result = dashboardRecordToFinalPackage(dashboardRecord);

  assert.equal(result.incident.title, primaryIncidentSample.title);
  assert.equal(result.incident.screenshotNote, primaryIncidentSample.screenshotNote);
  assert.equal(result.incident.screenshotDataUri, imageDataUri);
  assert.equal(result.incident.screenshotFileName, "cart-summary-failure.synthetic.png");
  assert.deepEqual(result.incident.videoFrameDataUris, [
    imageDataUri,
    imageDataUri,
  ]);
  assert.equal(result.outputs.intake?.incident_id, incidentId);
  assert.equal(result.outputs.logs?.primary_error, "CartSummaryValidationException");
  assert.equal(result.outputs.release?.release_gate, "BLOCK");
  assert.equal(result.outputs.api, null);
  assert.equal(result.agent_runs.length, 4);
  assert.equal(result.agent_runs[1].metrics?.totalTokens, 180);
  assert.deepEqual(result.agent_runs[1].metrics?.timeInfo, { queue_ms: 3 });
});
