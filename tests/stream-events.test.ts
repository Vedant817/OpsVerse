import test from "node:test";
import assert from "node:assert/strict";
import {
  heartbeatStreamEvent,
  metricsUpdatedStreamEvent,
  serializeSse,
} from "../src/lib/stream/sse";
import type { AgentRun } from "../src/lib/cerebras/schemas";

test("heartbeat stream event serializes as SSE without app data", () => {
  const heartbeat = heartbeatStreamEvent(new Date("2026-06-29T10:00:00.000Z"));
  const serialized = serializeSse("heartbeat", heartbeat);

  assert.equal(heartbeat.type, "heartbeat");
  assert.equal(heartbeat.timestamp, "2026-06-29T10:00:00.000Z");
  assert.match(serialized, /^event: heartbeat\n/);
  assert.match(serialized, /"type":"heartbeat"/);
  assert.match(serialized, /\n\n$/);
});

test("metrics stream event is emitted only for real agent metrics", () => {
  const runWithMetrics: AgentRun = {
    agent_name: "log_agent",
    status: "complete",
    output: { primary_error: "Example" },
    error: null,
    metrics: {
      latencyMs: 321,
      promptTokens: 100,
      completionTokens: 80,
      totalTokens: 180,
      tokensPerSecond: 249.22,
      timeInfo: { queue_ms: 2 },
    },
  };
  const runWithoutMetrics: AgentRun = {
    ...runWithMetrics,
    metrics: null,
  };

  const metricsEvent = metricsUpdatedStreamEvent(runWithMetrics);

  assert.deepEqual(metricsEvent, {
    type: "metrics_updated",
    agent_name: "log_agent",
    metrics: runWithMetrics.metrics,
  });
  assert.equal(metricsUpdatedStreamEvent(runWithoutMetrics), null);
  assert.match(
    serializeSse("metrics_updated", metricsEvent),
    /"tokensPerSecond":249.22/,
  );
});
