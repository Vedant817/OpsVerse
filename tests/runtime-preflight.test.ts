import test from "node:test";
import assert from "node:assert/strict";
import { buildRuntimePreflight } from "../src/lib/runtime/preflight";

test("runtime preflight passes sample checks and live AI readiness when model is ready", async () => {
  const preflight = await buildRuntimePreflight({
    cerebrasState: {
      configured: true,
      model: "gemma-4-31b",
      missing: [],
      error: null,
    },
    localAgentMode: {
      enabled: false,
      value: "disabled",
    },
    modelReadiness: {
      ready: true,
      available: true,
      gemmaModel: true,
      availableModels: ["gemma-4-31b"],
      checkedAt: "2026-07-01T00:00:00.000Z",
    },
    persistenceConfigured: false,
  });

  assert.equal(preflight.ok, true);
  assert.equal(preflight.summary.ready_for_live_ai, true);
  assert.equal(preflight.summary.can_run_primary_sample, true);
  assert.equal(preflight.summary.persistence_configured, false);
  assert.equal(preflight.summary.checks.block, 0);
  assert.equal(preflight.summary.checks.warn, 1);
  assert.equal(preflight.samples.length, 3);
  assert.equal(preflight.samples.every((sample) => sample.ready), true);
  assert.ok(
    preflight.samples
      .find((sample) => sample.id === "cart-summary-failure")
      ?.signals.includes("confirmed quantity field"),
  );
});

test("runtime preflight blocks live mode when Cerebras config is missing", async () => {
  const preflight = await buildRuntimePreflight({
    cerebrasState: {
      configured: false,
      model: "gemma-4-31b",
      missing: ["CEREBRAS_API_KEY"],
      error:
        "Cerebras is not configured. Set CEREBRAS_API_KEY on the server before running live AI requests.",
    },
    localAgentMode: {
      enabled: false,
      value: "disabled",
    },
    persistenceConfigured: false,
  });
  const liveCheck = preflight.checks.find((check) => check.id === "live_ai_ready");

  assert.equal(preflight.ok, false);
  assert.equal(preflight.summary.ready_for_live_ai, false);
  assert.equal(preflight.summary.can_run_primary_sample, false);
  assert.equal(liveCheck?.status, "block");
  assert.match(liveCheck?.detail ?? "", /CEREBRAS_API_KEY/);
});

test("runtime preflight allows primary sample in explicit local demo mode", async () => {
  const preflight = await buildRuntimePreflight({
    cerebrasState: {
      configured: false,
      model: "gemma-4-31b",
      missing: ["CEREBRAS_API_KEY"],
      error:
        "Cerebras is not configured. Set CEREBRAS_API_KEY on the server before running live AI requests.",
    },
    localAgentMode: {
      enabled: true,
      value: "enabled",
    },
    persistenceConfigured: false,
  });
  const liveCheck = preflight.checks.find((check) => check.id === "live_ai_ready");
  const localCheck = preflight.checks.find((check) => check.id === "local_demo_mode");

  assert.equal(preflight.ok, true);
  assert.equal(preflight.mode, "local_demo");
  assert.equal(preflight.summary.local_demo_enabled, true);
  assert.equal(preflight.summary.can_run_primary_sample, true);
  assert.equal(localCheck?.status, "warn");
  assert.equal(liveCheck?.status, "warn");
});
