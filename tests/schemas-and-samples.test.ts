import test from "node:test";
import assert from "node:assert/strict";
import {
  agentRunSchema,
  apiOutputSchema,
  dbOutputSchema,
  demoNarratorOutputSchema,
  finalIncidentPackageSchema,
  incidentEvidenceSchema,
  logOutputSchema,
  rcaOutputSchema,
  regressionTestOutputSchema,
  releaseRiskOutputSchema,
  visionOutputSchema,
} from "../src/lib/cerebras/schemas";
import {
  incidentSamples,
  primaryIncidentSample,
} from "../src/lib/samples";

const baseIncident = {
  title: primaryIncidentSample.title,
  module: primaryIncidentSample.module,
  screenshotNote: primaryIncidentSample.screenshotNote,
  screenshotDataUri: "",
  screenshotFileName: "cart-summary.synthetic.png",
  videoNote: primaryIncidentSample.videoNote,
  videoFrameDataUri: "",
  videoFileName: "cart-summary-frame.synthetic.png",
  logs: primaryIncidentSample.logs,
  apiResponse: primaryIncidentSample.apiResponse,
  dbSnapshot: primaryIncidentSample.dbSnapshot,
  gitDiff: primaryIncidentSample.gitDiff,
};

const outputs = {
  intake: {
    incident_id: "unpersisted",
    detected_artifacts: ["screenshot", "logs", "api_response", "db_snapshot"],
    missing_artifacts: ["network trace"],
    recommended_agents: ["log_agent", "api_agent", "db_agent"],
    normalized_title: primaryIncidentSample.title,
    normalized_module: primaryIncidentSample.module,
  },
  vision: {
    screen_type: "Direct Orders cart",
    visible_error: "No visible frontend error",
    ui_state: "Cart remains on screen after summary action",
    affected_flow: "Cart to order summary",
    confidence: 0.74,
  },
  logs: {
    primary_error: "CartSummaryValidationException",
    service: "order-service",
    correlation_id: "req-8f32",
    timestamp: "2026-06-28T18:45:21Z",
    repeated_pattern: "confirmedQty null for one SKU",
    failing_function_or_module: "CartSummaryValidator.validate",
    probable_cause: "Mapper forwarded null confirmedQty into summary validation",
    confidence: 0.86,
  },
  api: {
    endpoint: "/api/cart/summary",
    status: 422,
    contract_violation: "items[0].confirmedQty is null",
    breaking_field: "items[0].confirmedQty",
    expected_value: "number",
    actual_value: "null",
    likely_impact: "Order summary is blocked",
    suggested_fix: "Restore default quantity mapping before validation",
    confidence: 0.9,
  },
  db: {
    suspected_tables: ["ck_stock"],
    inconsistent_fields: ["confirmed_qty"],
    missing_values: ["confirmed_qty for SKU 13321"],
    data_issue: "confirmed_qty missing for a cart SKU",
    possible_mapping_issue: "Mapper no longer defaults null confirmed_qty to 0",
    sql_checks: [
      "SELECT sku_code, confirmed_qty FROM ck_stock WHERE outlet_code = '1000023';",
    ],
    confidence: 0.78,
  },
  rca: {
    root_cause_summary:
      "Cart summary rejects the cart because confirmedQty is null for SKU 13321.",
    confidence: 0.88,
    evidence_links: ["api.items[0].confirmedQty", "logs.req-8f32"],
    hypotheses: [
      {
        hypothesis: "Backend mapper no longer defaults confirmedQty to zero",
        confidence: 0.88,
        supporting_evidence: ["Git diff removed null coalescing"],
      },
      {
        hypothesis: "Frontend hides the backend validation error",
        confidence: 0.71,
        supporting_evidence: ["Screenshot note reports no visible error"],
      },
      {
        hypothesis: "DB stock row has mixed case/piece quantity state",
        confidence: 0.62,
        supporting_evidence: ["DB snapshot has blank confirmed_qty"],
      },
    ],
    alternative_hypotheses: ["Network timeout not provided"],
    missing_evidence: ["frontend console errors"],
  },
  tests: {
    manual_qa_steps: [
      "Login as Direct Orders user",
      "Select outlet 1000023",
      "Add SKU 13321 and SKU 14498",
      "Click Proceed to Summary",
    ],
    sql_validation: [
      "SELECT sku_code, confirmed_qty FROM ck_stock WHERE outlet_code = '1000023';",
    ],
    api_regression_test:
      "POST /api/cart/summary should return 200 when confirmedQty is numeric.",
    postman_assertions: [
      "pm.expect(response.items[0].confirmedQty).to.be.a('number')",
    ],
    karate_test:
      "Given path '/api/cart/summary'\nWhen method post\nThen status 200",
    edge_cases: ["null confirmedQty", "missing SKU", "zero quantity"],
  },
  release: {
    release_gate: "BLOCK" as const,
    risk_score: 88,
    reason: "Core order placement path is blocked",
    must_fix_before_release: [
      "Restore confirmedQty default mapping",
      "Show frontend validation error",
    ],
    recommended_tests: ["Cart summary null quantity regression"],
  },
  narrator: {
    demo_script: "OpsVerse turns incident evidence into release-ready action.",
    discord_track_1_post: "Multimodal multi-agent incident swarm.",
    discord_track_3_post: "Enterprise impact through faster triage.",
    x_post: "OpsVerse on Gemma 4 and Cerebras.",
  },
};

test("bundled incident samples satisfy the runtime evidence schema", () => {
  assert.equal(incidentSamples.length, 3);

  for (const sample of incidentSamples) {
    const parsed = incidentEvidenceSchema.parse({
      title: sample.title,
      module: sample.module,
      screenshotNote: sample.screenshotNote,
      videoNote: sample.videoNote,
      logs: sample.logs,
      apiResponse: sample.apiResponse,
      dbSnapshot: sample.dbSnapshot,
      gitDiff: sample.gitDiff,
    });

    assert.equal(parsed.title, sample.title);
    assert.equal(parsed.module, sample.module);
    assert.match(parsed.logs, /ERROR|WARN|INFO/i);
  }
});

test("representative agent outputs validate against production schemas", () => {
  assert.equal(visionOutputSchema.parse(outputs.vision).confidence, 0.74);
  assert.equal(logOutputSchema.parse(outputs.logs).service, "order-service");
  assert.equal(apiOutputSchema.parse(outputs.api).status, 422);
  assert.deepEqual(dbOutputSchema.parse(outputs.db).suspected_tables, [
    "ck_stock",
  ]);
  assert.equal(rcaOutputSchema.parse(outputs.rca).hypotheses.length, 3);
  assert.match(
    regressionTestOutputSchema.parse(outputs.tests).karate_test,
    /Then status 200/,
  );
  assert.equal(releaseRiskOutputSchema.parse(outputs.release).release_gate, "BLOCK");
  assert.match(
    demoNarratorOutputSchema.parse(outputs.narrator).discord_track_1_post,
    /multi-agent/i,
  );
});

test("invalid release gates are rejected", () => {
  assert.throws(
    () =>
      releaseRiskOutputSchema.parse({
        ...outputs.release,
        release_gate: "SHIP_IT",
      }),
    /Invalid input/,
  );
});

test("final incident packages require all schema-backed output sections", () => {
  const completedRun = agentRunSchema.parse({
    agent_name: "release_agent",
    status: "complete",
    output: outputs.release,
    error: null,
    metrics: {
      latencyMs: 250,
      promptTokens: 100,
      completionTokens: 80,
      totalTokens: 180,
      tokensPerSecond: 320,
      timeInfo: null,
    },
  });

  const parsed = finalIncidentPackageSchema.parse({
    incident: baseIncident,
    agent_runs: [completedRun],
    outputs,
  });

  assert.equal(parsed.outputs.release?.release_gate, "BLOCK");
  assert.equal(parsed.agent_runs[0].metrics?.totalTokens, 180);
});
