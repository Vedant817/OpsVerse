#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { buildLocalDemoIncidentPackage } from "../src/lib/agents/local-demo-output";
import {
  finalIncidentPackageSchema,
  type AgentRun,
  type FinalIncidentPackage,
  type IncidentEvidence,
} from "../src/lib/cerebras/schemas";
import { dashboardRecordToFinalPackage } from "../src/lib/dashboard/record";
import { evaluateOutputQuality } from "../src/lib/quality/output-quality";
import { primaryIncidentSample } from "../src/lib/samples";

type IncidentRow = {
  id: string;
  title: string;
  module: string | null;
  status: string;
  severity: string | null;
  created_at: string;
};

type EvidenceRow = {
  id: string;
  incident_id: string;
  type: string;
  content: string | null;
  file_url: string | null;
  created_at: string;
};

type AgentRunRow = {
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

type IncidentDashboardRecord = {
  incident: IncidentRow;
  evidence: EvidenceRow[];
  agentRuns: AgentRunRow[];
};

const fixturePath = process.env.SUPABASE_PERSISTENCE_FIXTURE || "";
const tinyPngDataUri =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function verifierIncident(): IncidentEvidence {
  return {
    title: `[OpsVerse verifier] ${primaryIncidentSample.title}`,
    module: primaryIncidentSample.module,
    screenshotNote: primaryIncidentSample.screenshotNote,
    screenshotDataUri: tinyPngDataUri,
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

function evidenceRows(incidentId: string, incident: IncidentEvidence) {
  return [
    ["screenshot_note", incident.screenshotNote || null],
    ["screenshot_data_uri", incident.screenshotDataUri || null],
    ["screenshot_file_name", incident.screenshotFileName || null],
    ["video_note", incident.videoNote || null],
    ["video_frame_data_uri", incident.videoFrameDataUri || null],
    [
      "video_frame_data_uris",
      incident.videoFrameDataUris.length > 0
        ? JSON.stringify(incident.videoFrameDataUris)
        : null,
    ],
    ["video_file_name", incident.videoFileName || null],
    ["logs", incident.logs],
    ["api_response", incident.apiResponse],
    ["db_snapshot", incident.dbSnapshot],
    ["git_diff", incident.gitDiff || null],
  ].map(([type, content]) => ({
    incident_id: incidentId,
    type,
    content,
    file_url: null,
  }));
}

function agentRunRows(incidentId: string, runs: AgentRun[]) {
  return runs.map((run) => ({
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
  }));
}

function recordFromFixture(): IncidentDashboardRecord {
  const payload = JSON.parse(readFileSync(fixturePath, "utf8")) as
    | IncidentDashboardRecord
    | { record?: IncidentDashboardRecord };

  const record = "record" in payload && payload.record ? payload.record : payload;
  if (!("incident" in record) || !Array.isArray(record.evidence) || !Array.isArray(record.agentRuns)) {
    fail(
      "Supabase persistence fixture must contain incident, evidence, and agentRuns.",
    );
  }

  return record as IncidentDashboardRecord;
}

function assertRoundTrip(
  record: IncidentDashboardRecord,
  expectedPackage?: FinalIncidentPackage,
) {
  const reconstructed = finalIncidentPackageSchema.parse(
    dashboardRecordToFinalPackage(record),
  );
  const requiredOutputs = [
    "intake",
    "vision",
    "logs",
    "api",
    "db",
    "rca",
    "tests",
    "release",
    "narrator",
  ] as const;
  const missingOutputs = requiredOutputs.filter(
    (key) => reconstructed.outputs[key] === null,
  );

  if (missingOutputs.length > 0) {
    fail(`Reconstructed dashboard package is missing outputs: ${missingOutputs.join(", ")}`);
  }

  if (reconstructed.agent_runs.length < requiredOutputs.length) {
    fail(
      `Reconstructed dashboard package has ${reconstructed.agent_runs.length} agent runs; expected at least ${requiredOutputs.length}.`,
    );
  }

  const failedRuns = reconstructed.agent_runs.filter(
    (run) => run.status !== "complete",
  );
  if (failedRuns.length > 0) {
    fail(
      `Reconstructed dashboard package has failed agents: ${failedRuns
        .map((run) => `${run.agent_name}: ${run.error ?? "failed"}`)
        .join("; ")}`,
    );
  }

  const quality = evaluateOutputQuality(reconstructed);
  if (quality.block > 0) {
    fail(
      `Reconstructed dashboard package has quality blockers: ${quality.checks
        .filter((check) => check.status === "block")
        .map((check) => `${check.label}: ${check.detail}`)
        .join("; ")}`,
    );
  }

  if (expectedPackage) {
    const expected = expectedPackage.incident;
    const actual = reconstructed.incident;
    const mismatches = [
      actual.title === expected.title ? null : "title",
      actual.module === expected.module ? null : "module",
      actual.logs === expected.logs ? null : "logs",
      actual.apiResponse === expected.apiResponse ? null : "apiResponse",
      actual.dbSnapshot === expected.dbSnapshot ? null : "dbSnapshot",
      actual.gitDiff === expected.gitDiff ? null : "gitDiff",
    ].filter((value): value is string => value !== null);

    if (mismatches.length > 0) {
      fail(`Reconstructed incident evidence mismatched fields: ${mismatches.join(", ")}`);
    }
  }

  console.log(`PASS Dashboard reconstruction - ${reconstructed.agent_runs.length} agent runs`);
  console.log(
    `PASS Output quality - ${quality.pass} pass, ${quality.warn} warning(s), ${quality.block} blocker(s)`,
  );
  console.log(
    `PASS Release gate - ${reconstructed.outputs.release?.release_gate ?? "missing"}`,
  );
}

async function runFixtureCheck() {
  const record = recordFromFixture();
  assertRoundTrip(record);
  console.log("\nSupabase persistence fixture verification passed.");
}

async function runLiveCheck() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const missing = [
    supabaseUrl ? null : "NEXT_PUBLIC_SUPABASE_URL",
    serviceRoleKey ? null : "SUPABASE_SERVICE_ROLE_KEY",
  ].filter((value): value is string => value !== null);

  if (missing.length > 0) {
    fail(
      `Missing Supabase verifier env: ${missing.join(", ")}. Set real Supabase values to run live insert/select verification.`,
    );
  }

  const supabase = createClient(
    supabaseUrl as string,
    serviceRoleKey as string,
    {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    },
  );
  const incident = verifierIncident();
  let incidentId = "";

  try {
    const incidentInsert = await supabase
      .from("incidents")
      .insert({
        title: incident.title,
        module: incident.module,
        status: "created",
        severity: "high",
      })
      .select("*")
      .single();

    if (incidentInsert.error || !incidentInsert.data?.id) {
      fail(
        `Create verifier incident failed: ${
          incidentInsert.error?.message ?? "No incident id returned"
        }`,
      );
    }

    incidentId = String(incidentInsert.data.id);
    const expectedPackage = buildLocalDemoIncidentPackage(incident, incidentId);

    const evidenceInsert = await supabase
      .from("incident_evidence")
      .insert(evidenceRows(incidentId, incident));
    if (evidenceInsert.error) {
      fail(`Save verifier evidence failed: ${evidenceInsert.error.message}`);
    }

    const runsInsert = await supabase
      .from("agent_runs")
      .insert(agentRunRows(incidentId, expectedPackage.agent_runs));
    if (runsInsert.error) {
      fail(`Save verifier agent runs failed: ${runsInsert.error.message}`);
    }

    const [incidentResult, evidenceResult, agentRunsResult] = await Promise.all([
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
    ]);

    if (incidentResult.error || !incidentResult.data) {
      fail(`Reload verifier incident failed: ${incidentResult.error?.message ?? "missing row"}`);
    }
    if (evidenceResult.error || !evidenceResult.data) {
      fail(`Reload verifier evidence failed: ${evidenceResult.error?.message ?? "missing rows"}`);
    }
    if (agentRunsResult.error || !agentRunsResult.data) {
      fail(`Reload verifier agent runs failed: ${agentRunsResult.error?.message ?? "missing rows"}`);
    }

    assertRoundTrip(
      {
        incident: incidentResult.data as IncidentRow,
        evidence: evidenceResult.data as EvidenceRow[],
        agentRuns: agentRunsResult.data as AgentRunRow[],
      },
      expectedPackage,
    );

    console.log(`PASS Supabase insert/select - ${incidentId}`);
  } finally {
    if (incidentId) {
      const deleteResult = await supabase.from("incidents").delete().eq("id", incidentId);
      if (deleteResult.error) {
        fail(
          `Verifier cleanup failed for incident ${incidentId}: ${deleteResult.error.message}`,
        );
      }
      console.log(`PASS Verifier cleanup - deleted incident ${incidentId}`);
    }
  }

  console.log("\nSupabase live persistence verification passed.");
}

async function main() {
  console.log("OpsVerse Supabase persistence verification");
  console.log("==========================================");
  console.log(fixturePath ? `Fixture ${fixturePath}` : "Mode live Supabase insert/select");

  if (fixturePath) {
    await runFixtureCheck();
    return;
  }

  await runLiveCheck();
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : "Unexpected verifier failure.");
});
