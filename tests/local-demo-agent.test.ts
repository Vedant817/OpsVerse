import test from "node:test";
import assert from "node:assert/strict";
import { buildLocalDemoIncidentPackage } from "../src/lib/agents/local-demo-output";
import { finalIncidentPackageSchema, type IncidentEvidence } from "../src/lib/cerebras/schemas";
import { primaryIncidentSample } from "../src/lib/samples";

function incident(overrides: Partial<IncidentEvidence> = {}): IncidentEvidence {
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
    ...overrides,
  };
}

test("local demo package is explicit, complete, and excludes provider metrics", () => {
  const result = buildLocalDemoIncidentPackage(incident(), "incident-123");
  const parsed = finalIncidentPackageSchema.parse(result);

  assert.equal(parsed.runtime?.mode, "local_demo");
  assert.match(parsed.runtime?.note ?? "", /without provider calls/);
  assert.equal(parsed.agent_runs.length, 9);
  assert.ok(parsed.agent_runs.every((run) => run.status === "complete"));
  assert.ok(parsed.agent_runs.every((run) => run.metrics === null));
  assert.equal(parsed.outputs.api?.endpoint, "/api/cart/summary");
  assert.equal(parsed.outputs.api?.status, 422);
  assert.match(parsed.outputs.rca?.root_cause_summary ?? "", /confirmedQty/);
  assert.deepEqual(parsed.outputs.tests?.manual_qa_steps.slice(0, 4), [
    "Login as a Direct Orders user.",
    "Select outlet 1000023.",
    "Add SKU 13321 and 14498 to the affected workflow.",
    "Trigger the workflow: Unable to move from cart to order summary.",
  ]);
  assert.deepEqual(
    parsed.outputs.tests?.api_expectations.map((item) => item.behavior),
    [
      "/api/cart/summary should return 200 when valid SKUs are present.",
      "response.orderSummary should not be null.",
      "response.items[*].confirmedQty should contain numbers.",
    ],
  );
  assert.equal(parsed.outputs.release?.release_gate, "BLOCK");
  assert.match(parsed.outputs.narrator?.demo_script ?? "", /local deterministic demo/i);
});

test("local demo output responds to changed incident evidence", () => {
  const result = buildLocalDemoIncidentPackage(
    incident({
      title: "Payment approval page fails",
      module: "Payments",
      apiResponse: JSON.stringify(
        {
          endpoint: "/api/payments/approve",
          status: 409,
          error: "Conflict",
          details: [
            {
              field: "approval.state",
              message: "Expected approved, received pending",
            },
          ],
        },
        null,
        2,
      ),
      logs: `2026-06-30T09:30:00Z ERROR payment-service
CorrelationId=req-pay-77
PaymentApprovalException: approval.state remained pending
at PaymentApprovalService.approve(PaymentApprovalService.java:88)`,
      dbSnapshot: `payment_id,approval_state,attempts
pay-77,,2`,
    }),
  );

  assert.equal(result.outputs.api?.endpoint, "/api/payments/approve");
  assert.equal(result.outputs.api?.status, 409);
  assert.equal(result.outputs.api?.breaking_field, "approval.state");
  assert.match(result.outputs.logs?.service ?? "", /payment-service/);
  assert.match(result.outputs.rca?.root_cause_summary ?? "", /approval.state/);
});
