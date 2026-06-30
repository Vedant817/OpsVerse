import test from "node:test";
import assert from "node:assert/strict";
import {
  buildIncidentReportMarkdown,
  buildIncidentReportPdf,
  buildJiraMarkdown,
  incidentReportSlug,
} from "../src/lib/exports/incident-report";
import {
  finalIncidentPackageSchema,
  type FinalIncidentPackage,
} from "../src/lib/cerebras/schemas";
import { primaryIncidentSample } from "../src/lib/samples";

const incidentPackage: FinalIncidentPackage = finalIncidentPackageSchema.parse({
  incident: {
    title: primaryIncidentSample.title,
    module: primaryIncidentSample.module,
    screenshotNote: primaryIncidentSample.screenshotNote,
    screenshotDataUri: "",
    screenshotFileName: "cart-summary.synthetic.png",
    videoNote: primaryIncidentSample.videoNote,
    videoFrameDataUri: "",
    videoFrameDataUris: [],
    videoFileName: "",
    logs: primaryIncidentSample.logs,
    apiResponse: primaryIncidentSample.apiResponse,
    dbSnapshot: primaryIncidentSample.dbSnapshot,
    gitDiff: primaryIncidentSample.gitDiff,
  },
  agent_runs: [
    {
      agent_name: "api_agent",
      status: "complete",
      output: null,
      error: null,
      metrics: {
        latencyMs: 240,
        promptTokens: 100,
        completionTokens: 80,
        totalTokens: 180,
        tokensPerSecond: 300,
        timeInfo: null,
      },
    },
  ],
  outputs: {
    intake: null,
    vision: {
      screen_type: "Direct Orders cart",
      visible_error: "No visible frontend error",
      ui_state: "Cart remains visible after Proceed to Summary",
      affected_flow: "Cart to order summary",
      confidence: 0.74,
    },
    logs: {
      primary_error: "CartSummaryValidationException",
      service: "order-service",
      correlation_id: "req-8f32",
      timestamp: "2026-06-28T18:45:21Z",
      repeated_pattern: "confirmedQty cannot be null",
      failing_function_or_module: "CartSummaryValidator.validate",
      probable_cause: "confirmedQty is null for SKU 13321",
      confidence: 0.86,
    },
    api: {
      endpoint: "/api/cart/summary",
      status: 422,
      contract_violation: "items[0].confirmedQty is null",
      breaking_field: "items[0].confirmedQty",
      expected_value: "number",
      actual_value: "null",
      likely_impact: "Blocks order placement",
      suggested_fix: "Default confirmedQty before validation",
      confidence: 0.9,
    },
    db: {
      suspected_tables: ["ck_stock"],
      inconsistent_fields: ["confirmed_qty"],
      missing_values: ["confirmed_qty for SKU 13321"],
      data_issue: "confirmed_qty missing for SKU 13321",
      possible_mapping_issue: "Mapper no longer defaults null quantity",
      sql_checks: [
        "SELECT sku_code, confirmed_qty FROM ck_stock WHERE outlet_code = '1000023';",
      ],
      confidence: 0.78,
    },
    rca: {
      root_cause_summary:
        "Cart summary rejects the cart because confirmedQty is null.",
      user_impact: "Blocks order placement",
      likely_owner: "Backend validation + frontend error handling",
      confidence: 0.88,
      evidence_links: ["api.items[0].confirmedQty"],
      hypotheses: [
        {
          hypothesis: "Backend summary API rejects null confirmedQty",
          confidence: 0.88,
          supporting_evidence: ["API response reports null confirmedQty"],
        },
        {
          hypothesis: "Frontend does not show backend validation error",
          confidence: 0.72,
          supporting_evidence: ["Screenshot note reports no visible error"],
        },
        {
          hypothesis: "DB stock snapshot contains mixed quantity values",
          confidence: 0.63,
          supporting_evidence: ["DB snapshot has blank confirmed_qty"],
        },
      ],
      alternative_hypotheses: [],
      missing_evidence: [],
    },
    tests: {
      manual_qa_steps: [
        "Login as Direct Orders user",
        "Select outlet 1000023",
        "Add SKU 13321 and SKU 14498 to cart",
        "Click Proceed to Summary",
        "Observe that the app remains on cart page and order summary is not opened",
      ],
      sql_validation: [
        "SELECT sku_code, confirmed_qty FROM ck_stock WHERE outlet_code = '1000023';",
      ],
      api_expectations: [
        {
          behavior: "Cart summary should return 200 when valid SKUs are present",
          assertion: "response.status === 200",
        },
        {
          behavior: "response.orderSummary should not be null",
          assertion: "response.orderSummary != null",
        },
        {
          behavior: "response.items[*].confirmedQty should contain numbers",
          assertion: "every confirmedQty is a number",
        },
      ],
      api_regression_test:
        "POST /api/cart/summary returns 200 when confirmedQty is numeric.",
      postman_assertions: [
        "pm.expect(response.items[0].confirmedQty).to.be.a('number')",
      ],
      karate_test:
        "Given path '/api/cart/summary'\nWhen method post\nThen status 200",
      edge_cases: ["null confirmedQty"],
    },
    release: {
      release_gate: "BLOCK",
      risk_score: 88,
      reason: "Core order placement journey is broken.",
      must_fix_before_release: ["Fix confirmedQty mapper"],
      recommended_tests: ["Cart summary confirmedQty regression"],
    },
    narrator: null,
  },
});

test("Jira markdown export is built from incident package fields", () => {
  const markdown = buildJiraMarkdown(incidentPackage);

  assert.match(markdown, /^# Unable to move from cart to order summary/);
  assert.match(markdown, /in Direct Orders app/);
  assert.match(markdown, /Blocks order placement/);
  assert.match(markdown, /items\[0\]\.confirmedQty/);
  assert.match(markdown, /response\.orderSummary should not be null/);
});

test("incident report markdown includes RCA, tests, release gate, and evidence", () => {
  const markdown = buildIncidentReportMarkdown(incidentPackage);

  assert.match(markdown, /## Root-Cause Hypotheses/);
  assert.match(markdown, /Backend summary API rejects null confirmedQty/);
  assert.match(markdown, /Likely owner: Backend validation \+ frontend error handling/);
  assert.match(markdown, /Then status 200/);
  assert.match(markdown, /response\.items\[\*\]\.confirmedQty should contain numbers/);
  assert.match(markdown, /## Output Quality Gates/);
  assert.match(markdown, /Overall: PASS/);
  assert.match(markdown, /PASS: API regression tests cover response shape/);
  assert.match(markdown, /Decision: BLOCK/);
  assert.match(markdown, /CartSummaryValidationException/);
});

test("incident report PDF export produces a downloadable PDF payload", () => {
  const pdf = buildIncidentReportPdf(incidentPackage);
  const pdfText = new TextDecoder().decode(pdf);

  assert.equal(incidentReportSlug(incidentPackage), "direct-orders-unable-to-move-from-cart-to-order-summary");
  assert.match(pdfText, /^%PDF-1\.4/);
  assert.match(pdfText, /\/Type \/Catalog/);
  assert.match(pdfText, /OpsVerse Incident Report/);
  assert.match(pdfText, /%%EOF$/);
});
