import test from "node:test";
import assert from "node:assert/strict";
import {
  cerebrasErrorStatus,
  isRetryableCerebrasError,
  retryDelayMs,
} from "../src/lib/cerebras/errors";

test("Cerebras error helpers extract status from SDK-shaped errors", () => {
  assert.equal(cerebrasErrorStatus({ status: 429 }), 429);
  assert.equal(cerebrasErrorStatus({ code: 503 }), 503);
  assert.equal(cerebrasErrorStatus(new Error("429 status code (no body)")), 429);
  assert.equal(cerebrasErrorStatus(new Error("network failed")), null);
});

test("Cerebras retry policy only retries transient provider statuses", () => {
  assert.equal(isRetryableCerebrasError({ status: 429 }), true);
  assert.equal(isRetryableCerebrasError({ status: 503 }), true);
  assert.equal(isRetryableCerebrasError({ status: 400 }), false);
  assert.equal(isRetryableCerebrasError(new Error("401 status code (no body)")), false);
});

test("Cerebras retry delay honors retry-after before bounded linear backoff", () => {
  assert.equal(
    retryDelayMs({ headers: { "retry-after": "2" } }, 1, 1200),
    2000,
  );
  assert.equal(retryDelayMs({ status: 429 }, 3, 1200), 3600);
  assert.equal(retryDelayMs({ status: 429 }, 100, 1200), 30000);
});
