#!/usr/bin/env node

import { readFileSync } from "node:fs";

const baseUrl =
  process.env.RUNTIME_PREFLIGHT_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://127.0.0.1:3000";
const fixturePath = process.env.RUNTIME_PREFLIGHT_FIXTURE || "";

function preflightUrl(base) {
  return new URL("/api/runtime/preflight", base).toString();
}

function statusMarker(status) {
  if (status === "pass") {
    return "PASS";
  }

  if (status === "warn") {
    return "WARN";
  }

  return "FAIL";
}

function assertPreflightShape(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Preflight response was not a JSON object.");
  }

  if (!payload.summary || typeof payload.summary !== "object") {
    throw new Error("Preflight response is missing summary.");
  }

  if (!Array.isArray(payload.checks)) {
    throw new Error("Preflight response is missing checks array.");
  }

  if (!Array.isArray(payload.samples)) {
    throw new Error("Preflight response is missing samples array.");
  }
}

console.log("OpsVerse runtime preflight");
console.log("=========================");
console.log(fixturePath ? `Fixture ${fixturePath}` : `URL ${preflightUrl(baseUrl)}`);

let payload;
let response;

try {
  if (fixturePath) {
    payload = JSON.parse(readFileSync(fixturePath, "utf8"));
    response = {
      ok: payload.ok !== false,
    };
  } else {
    response = await fetch(preflightUrl(baseUrl), {
      headers: {
        Accept: "application/json",
      },
    });
    payload = await response.json();
  }
  assertPreflightShape(payload);
} catch (error) {
  console.error(
    fixturePath
      ? `FAIL Unable to read runtime preflight fixture: ${
          error instanceof Error ? error.message : "invalid JSON"
        }`
      : `FAIL Unable to reach or parse runtime preflight endpoint: ${
          error instanceof Error ? error.message : "request failed"
        }`,
  );
  process.exit(1);
}

console.log(
  `${payload.summary.can_run_primary_sample ? "PASS" : "FAIL"} Primary sample runnable - mode ${payload.mode}`,
);
console.log(
  `${payload.summary.ready_for_live_ai ? "PASS" : "WARN"} Live AI readiness - ${
    payload.summary.ready_for_live_ai ? "ready" : "not ready"
  }`,
);
console.log(
  `${payload.summary.persistence_configured ? "PASS" : "WARN"} Persistence - ${
    payload.summary.persistence_configured ? "configured" : "not configured"
  }`,
);
console.log(
  `Checks pass=${payload.summary.checks.pass} warn=${payload.summary.checks.warn} block=${payload.summary.checks.block}`,
);

for (const check of payload.checks) {
  console.log(`${statusMarker(check.status)} ${check.label} - ${check.detail}`);
}

const blockers = payload.checks.filter((check) => check.status === "block");

if (!response.ok || blockers.length > 0 || !payload.summary.can_run_primary_sample) {
  console.error(
    `\n${blockers.length || 1} runtime preflight blocker(s) failed.`,
  );
  process.exit(1);
}

console.log("\nRuntime preflight passed.");
