#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { finalIncidentPackageSchema } from "../src/lib/cerebras/schemas";
import { evaluateOutputQuality } from "../src/lib/quality/output-quality";
import { primaryIncidentSample } from "../src/lib/samples";

const tinyPngDataUri =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const baseUrl =
  process.env.PRIMARY_SAMPLE_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://127.0.0.1:3000";
const fixturePath = process.env.PRIMARY_SAMPLE_FIXTURE || "";
const allowLocalDemo =
  process.env.PRIMARY_SAMPLE_ALLOW_LOCAL_DEMO?.toLowerCase() === "true";

type RoutePayload = {
  ok?: boolean;
  error?: string | null;
  result?: unknown;
  persistence?: unknown;
};

function endpoint(base: string) {
  return new URL("/api/agents/run", base).toString();
}

function primarySampleBody() {
  return {
    title: primaryIncidentSample.title,
    module: primaryIncidentSample.module,
    screenshotNote: primaryIncidentSample.screenshotNote,
    screenshotDataUri: tinyPngDataUri,
    screenshotFileName: "primary-sample-verifier.synthetic.png",
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

async function loadPayload(): Promise<{ responseOk: boolean; payload: RoutePayload }> {
  if (fixturePath) {
    const payload = JSON.parse(readFileSync(fixturePath, "utf8")) as RoutePayload;
    return {
      responseOk: payload.ok !== false,
      payload,
    };
  }

  const response = await fetch(endpoint(baseUrl), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(primarySampleBody()),
  });

  return {
    responseOk: response.ok,
    payload: (await response.json()) as RoutePayload,
  };
}

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

async function main() {
  console.log("OpsVerse primary sample verification");
  console.log("====================================");
  console.log(fixturePath ? `Fixture ${fixturePath}` : `URL ${endpoint(baseUrl)}`);

  let routePayload: Awaited<ReturnType<typeof loadPayload>>;

  try {
    routePayload = await loadPayload();
  } catch (error) {
    fail(
      `Unable to run primary sample route: ${
        error instanceof Error ? error.message : "request failed"
      }`,
    );
  }

  if (!routePayload.responseOk || routePayload.payload.ok === false) {
    fail(
      routePayload.payload.error ||
        "Primary sample route returned a failed response.",
    );
  }

  const result = finalIncidentPackageSchema.safeParse(routePayload.payload.result);
  if (!result.success) {
    fail(
      `Primary sample response failed final package schema validation: ${result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  const incidentPackage = result.data;
  const runtimeMode = incidentPackage.runtime?.mode ?? "unknown";

  if (runtimeMode !== "live_cerebras" && !allowLocalDemo) {
    fail(
      `Primary sample completed in ${runtimeMode} mode. Set PRIMARY_SAMPLE_ALLOW_LOCAL_DEMO=true only for explicitly labeled local demo verification.`,
    );
  }

  const failedRuns = incidentPackage.agent_runs.filter(
    (run) => run.status !== "complete",
  );
  if (failedRuns.length > 0) {
    fail(
      `Primary sample has failed agents: ${failedRuns
        .map((run) => `${run.agent_name}: ${run.error ?? "failed"}`)
        .join("; ")}`,
    );
  }

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
    (key) => incidentPackage.outputs[key] === null,
  );
  if (missingOutputs.length > 0) {
    fail(`Primary sample is missing outputs: ${missingOutputs.join(", ")}`);
  }

  const quality = evaluateOutputQuality(incidentPackage);
  if (quality.block > 0) {
    fail(
      `Output quality blockers: ${quality.checks
        .filter((check) => check.status === "block")
        .map((check) => `${check.label}: ${check.detail}`)
        .join("; ")}`,
    );
  }

  const metricRuns = incidentPackage.agent_runs.filter((run) => run.metrics);
  if (runtimeMode === "live_cerebras" && metricRuns.length === 0) {
    fail("Live primary sample did not include any provider metrics.");
  }

  console.log(`PASS Runtime mode - ${runtimeMode}`);
  console.log(`PASS Agent runs - ${incidentPackage.agent_runs.length} complete`);
  console.log(`PASS Required outputs - ${requiredOutputs.join(", ")}`);
  console.log(
    `PASS Output quality - ${quality.pass} pass, ${quality.warn} warning(s), ${quality.block} blocker(s)`,
  );
  console.log(`PASS Provider metrics - ${metricRuns.length} run(s) with metrics`);
  console.log(
    `PASS Release gate - ${incidentPackage.outputs.release?.release_gate ?? "missing"}`,
  );
  console.log("\nPrimary sample verification passed.");
}

void main();
