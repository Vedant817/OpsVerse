import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const scriptPath = resolve("scripts/runtime-preflight-check.mjs");

function preflightPayload(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    generated_at: "2026-07-01T00:00:00.000Z",
    mode: "live_cerebras",
    summary: {
      can_run_primary_sample: true,
      ready_for_live_ai: true,
      local_demo_enabled: false,
      persistence_configured: false,
      sample_count: 3,
      checks: {
        pass: 4,
        warn: 1,
        block: 0,
      },
    },
    checks: [
      {
        id: "samples_valid",
        label: "Bundled sample evidence validates",
        status: "pass",
        detail: "3 synthetic samples pass the incident evidence schema.",
      },
      {
        id: "persistence_ready",
        label: "Supabase persistence",
        status: "warn",
        detail: "Supabase is not configured.",
      },
    ],
    samples: [
      {
        id: "cart-summary-failure",
        label: "Cart Summary Failure",
        module: "Direct Orders",
        ready: true,
        evidence_count: 6,
        missing: [],
        signals: ["cart summary API"],
      },
    ],
    ...overrides,
  };
}

function writePreflightFixture(payload: unknown) {
  const dir = mkdtempSync(join(tmpdir(), "opsverse-preflight-"));
  const path = join(dir, "preflight.json");
  writeFileSync(path, JSON.stringify(payload));
  return path;
}

function runPreflightVerifier(fixturePath: string) {
  return spawnSync(process.execPath, [scriptPath], {
    env: {
      ...process.env,
      RUNTIME_PREFLIGHT_FIXTURE: fixturePath,
    },
    encoding: "utf8",
  });
}

test("runtime preflight verifier passes with runnable sample and warnings", async () => {
  const fixturePath = writePreflightFixture(preflightPayload());
  const result = runPreflightVerifier(fixturePath);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS Primary sample runnable/);
  assert.match(result.stdout, /WARN Persistence/);
  assert.match(result.stdout, /Runtime preflight passed/);
});

test("runtime preflight verifier fails when blockers are returned", async () => {
  const fixturePath = writePreflightFixture(
    preflightPayload({
      ok: false,
      summary: {
        can_run_primary_sample: false,
        ready_for_live_ai: false,
        local_demo_enabled: false,
        persistence_configured: false,
        sample_count: 3,
        checks: {
          pass: 2,
          warn: 1,
          block: 1,
        },
      },
      checks: [
        {
          id: "live_ai_ready",
          label: "Live Cerebras Gemma path",
          status: "block",
          detail: "Missing CEREBRAS_API_KEY.",
        },
      ],
    }),
  );
  const result = runPreflightVerifier(fixturePath);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /FAIL Primary sample runnable/);
  assert.match(result.stdout, /FAIL Live Cerebras Gemma path/);
  assert.match(result.stderr, /runtime preflight blocker/);
});
