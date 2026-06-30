import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildLocalDemoIncidentPackage } from "../src/lib/agents/local-demo-output";
import { primaryIncidentSample } from "../src/lib/samples";
import type { FinalIncidentPackage, IncidentEvidence } from "../src/lib/cerebras/schemas";

const scriptPath = resolve("scripts/primary-sample-check.ts");

function incident(): IncidentEvidence {
  return {
    title: primaryIncidentSample.title,
    module: primaryIncidentSample.module,
    screenshotNote: primaryIncidentSample.screenshotNote,
    screenshotDataUri: "",
    screenshotFileName: "",
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

function writeFixture(payload: unknown) {
  const dir = mkdtempSync(join(tmpdir(), "opsverse-primary-sample-"));
  const path = join(dir, "payload.json");
  writeFileSync(path, JSON.stringify(payload));
  return path;
}

function completeLivePackage(): FinalIncidentPackage {
  const localPackage = buildLocalDemoIncidentPackage(incident());

  return {
    ...localPackage,
    runtime: {
      mode: "live_cerebras",
      label: "Live Cerebras Gemma",
      note: "Fixture package shaped like a successful live route response.",
    },
    agent_runs: localPackage.agent_runs.map((run, index) => ({
      ...run,
      metrics: {
        latencyMs: 100 + index,
        promptTokens: 50,
        completionTokens: 40,
        totalTokens: 90,
        tokensPerSecond: 300,
        timeInfo: null,
      },
    })),
  };
}

function runVerifier(fixturePath: string, extraEnv: Record<string, string> = {}) {
  return spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
    env: {
      ...process.env,
      PRIMARY_SAMPLE_FIXTURE: fixturePath,
      ...extraEnv,
    },
    encoding: "utf8",
  });
}

test("primary sample verifier passes for a complete live package fixture", () => {
  const fixturePath = writeFixture({
    ok: true,
    error: null,
    result: completeLivePackage(),
  });
  const result = runVerifier(fixturePath);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS Runtime mode - live_cerebras/);
  assert.match(result.stdout, /PASS Output quality/);
  assert.match(result.stdout, /Primary sample verification passed/);
});

test("primary sample verifier fails local demo mode unless explicitly allowed", () => {
  const fixturePath = writeFixture({
    ok: true,
    error: null,
    result: buildLocalDemoIncidentPackage(incident()),
  });
  const blocked = runVerifier(fixturePath);

  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /local_demo mode/);

  const allowed = runVerifier(fixturePath, {
    PRIMARY_SAMPLE_ALLOW_LOCAL_DEMO: "true",
  });
  assert.equal(allowed.status, 0, allowed.stderr || allowed.stdout);
  assert.match(allowed.stdout, /PASS Runtime mode - local_demo/);
});

test("primary sample verifier fails when final package quality has blockers", () => {
  const packageWithMissingTests: FinalIncidentPackage = {
    ...completeLivePackage(),
    outputs: {
      ...completeLivePackage().outputs,
      tests: null,
    },
  };
  const fixturePath = writeFixture({
    ok: true,
    error: null,
    result: packageWithMissingTests,
  });
  const result = runVerifier(fixturePath);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing outputs: tests/i);
});
