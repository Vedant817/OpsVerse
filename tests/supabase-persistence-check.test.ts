import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildLocalDemoIncidentPackage } from "../src/lib/agents/local-demo-output";
import type { AgentRun, IncidentEvidence } from "../src/lib/cerebras/schemas";
import { primaryIncidentSample } from "../src/lib/samples";

const scriptPath = resolve("scripts/supabase-persistence-check.ts");

function incident(): IncidentEvidence {
  return {
    title: `[OpsVerse verifier] ${primaryIncidentSample.title}`,
    module: primaryIncidentSample.module,
    screenshotNote: primaryIncidentSample.screenshotNote,
    screenshotDataUri: "data:image/png;base64,synthetic",
    screenshotFileName: "supabase-persistence-verifier.synthetic.png",
    videoNote: primaryIncidentSample.videoNote,
    videoFrameDataUri: "",
    videoFrameDataUris: [],
    videoFileName: "",
    logs: primaryIncidentSample.logs,
    apiResponse: primaryIncidentSample.apiResponse,
    dbSnapshot: primaryIncidentSample.dbSnapshot,
    gitDiff: primaryIncidentSample.gitDiff,
  };
}

function evidenceRows(incidentId: string, source: IncidentEvidence, now: string) {
  return [
    ["screenshot_note", source.screenshotNote || null],
    ["screenshot_data_uri", source.screenshotDataUri || null],
    ["screenshot_file_name", source.screenshotFileName || null],
    ["video_note", source.videoNote || null],
    ["video_frame_data_uri", source.videoFrameDataUri || null],
    [
      "video_frame_data_uris",
      source.videoFrameDataUris.length > 0
        ? JSON.stringify(source.videoFrameDataUris)
        : null,
    ],
    ["video_file_name", source.videoFileName || null],
    ["logs", source.logs],
    ["api_response", source.apiResponse],
    ["db_snapshot", source.dbSnapshot],
    ["git_diff", source.gitDiff || null],
  ].map(([type, content], index) => ({
    id: randomUUID(),
    incident_id: incidentId,
    type,
    content,
    file_url: null,
    created_at: new Date(Date.parse(now) + index).toISOString(),
  }));
}

function agentRunRows(incidentId: string, runs: AgentRun[], now: string) {
  return runs.map((run, index) => ({
    id: randomUUID(),
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
    created_at: new Date(Date.parse(now) + index).toISOString(),
  }));
}

function agentEventRows(incidentId: string, runs: AgentRun[], now: string) {
  return runs.flatMap((run, index) => [
    {
      id: randomUUID(),
      incident_id: incidentId,
      event_type: "agent_started",
      agent_name: run.agent_name,
      run_status: "running",
      payload: {
        type: "agent_started",
        agent_name: run.agent_name,
      },
      created_at: new Date(Date.parse(now) + index * 2).toISOString(),
    },
    {
      id: randomUUID(),
      incident_id: incidentId,
      event_type: "agent_completed",
      agent_name: run.agent_name,
      run_status: run.status,
      payload: {
        type: "agent_completed",
        run,
      },
      created_at: new Date(Date.parse(now) + index * 2 + 1).toISOString(),
    },
  ]);
}

function completeRecord() {
  const now = "2026-07-01T00:00:00.000Z";
  const incidentId = randomUUID();
  const source = incident();
  const finalPackage = buildLocalDemoIncidentPackage(source, incidentId);

  return {
    incident: {
      id: incidentId,
      title: source.title,
      module: source.module,
      status: "created",
      severity: "high",
      created_at: now,
    },
    evidence: evidenceRows(incidentId, source, now),
    agentRuns: agentRunRows(incidentId, finalPackage.agent_runs, now),
    agentEvents: agentEventRows(incidentId, finalPackage.agent_runs, now),
  };
}

function writeFixture(payload: unknown) {
  const dir = mkdtempSync(join(tmpdir(), "opsverse-supabase-persistence-"));
  const path = join(dir, "record.json");
  writeFileSync(path, JSON.stringify(payload));
  return path;
}

function runVerifier(extraEnv: Record<string, string | undefined> = {}) {
  return spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
    env: {
      ...process.env,
      ...extraEnv,
    },
    encoding: "utf8",
  });
}

test("supabase persistence verifier passes for a complete dashboard fixture", () => {
  const fixturePath = writeFixture({ record: completeRecord() });
  const result = runVerifier({
    SUPABASE_PERSISTENCE_FIXTURE: fixturePath,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS Dashboard reconstruction - 9 agent runs, 18 agent events/);
  assert.match(result.stdout, /Supabase persistence fixture verification passed/);
});

test("supabase persistence verifier fails when fixture has no saved agent runs", () => {
  const fixture = completeRecord();
  const fixturePath = writeFixture({ record: { ...fixture, agentRuns: [] } });
  const result = runVerifier({
    SUPABASE_PERSISTENCE_FIXTURE: fixturePath,
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing outputs/i);
});

test("supabase persistence verifier fails closed without live Supabase env", () => {
  const result = runVerifier({
    SUPABASE_PERSISTENCE_FIXTURE: "",
    NEXT_PUBLIC_SUPABASE_URL: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Missing Supabase verifier env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY/,
  );
});
