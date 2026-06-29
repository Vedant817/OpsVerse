import test from "node:test";
import assert from "node:assert/strict";
import type { z } from "zod";
import { parseStructuredJson } from "../src/lib/cerebras/json";
import {
  buildApiAgentPrompt,
  buildDbAgentPrompt,
  buildDemoNarratorAgentPrompt,
  buildLogAgentPrompt,
  buildRcaAgentPrompt,
  buildReleaseAgentPrompt,
  buildTestAgentPrompt,
  buildVisionAgentPrompt,
} from "../src/lib/cerebras/prompts";
import {
  apiOutputSchema,
  dbOutputSchema,
  demoNarratorOutputSchema,
  logOutputSchema,
  rcaOutputSchema,
  regressionTestOutputSchema,
  releaseRiskOutputSchema,
  visionOutputSchema,
  type IncidentEvidence,
} from "../src/lib/cerebras/schemas";
import { primaryIncidentSample } from "../src/lib/samples";

const incident: IncidentEvidence = {
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

const vision = {
  screen_type: "Direct Orders cart",
  visible_error: "No visible frontend error",
  ui_state: "Cart remains open after the summary action",
  affected_flow: "Cart to order summary",
  confidence: 0.74,
};

const logs = {
  primary_error: "CartSummaryValidationException",
  service: "order-service",
  correlation_id: "req-8f32",
  timestamp: "2026-06-28T18:45:21Z",
  repeated_pattern: "confirmedQty cannot be null",
  failing_function_or_module: "CartSummaryValidator.validate",
  probable_cause: "Null confirmedQty reached summary validation",
  confidence: 0.86,
};

const api = {
  endpoint: "/api/cart/summary",
  status: 422,
  contract_violation: "items[0].confirmedQty is null",
  breaking_field: "items[0].confirmedQty",
  expected_value: "number",
  actual_value: "null",
  likely_impact: "Order summary cannot be opened",
  suggested_fix: "Default confirmedQty before validation",
  confidence: 0.9,
};

const db = {
  suspected_tables: ["ck_stock"],
  inconsistent_fields: ["confirmed_qty"],
  missing_values: ["SKU 13321 confirmed_qty"],
  data_issue: "confirmed_qty is blank for one SKU",
  possible_mapping_issue: "Mapper stopped converting blank quantity to zero",
  sql_checks: [
    "SELECT sku_code, confirmed_qty FROM ck_stock WHERE outlet_code = '1000023';",
  ],
  confidence: 0.78,
};

const rca = {
  root_cause_summary:
    "Cart summary is blocked because confirmedQty is null for SKU 13321.",
  confidence: 0.88,
  evidence_links: ["log_agent", "api_agent", "db_agent"],
  hypotheses: [
    {
      hypothesis: "Backend mapper no longer defaults confirmedQty",
      confidence: 0.88,
      supporting_evidence: ["api_agent breaking_field", "db_agent missing_values"],
    },
    {
      hypothesis: "Frontend hides validation feedback",
      confidence: 0.7,
      supporting_evidence: ["vision_agent visible_error"],
    },
    {
      hypothesis: "Stock row quantity data is inconsistent",
      confidence: 0.62,
      supporting_evidence: ["db_agent data_issue"],
    },
  ],
  alternative_hypotheses: ["Network trace not provided"],
  missing_evidence: ["frontend console logs"],
};

const regressionTests = {
  manual_qa_steps: [
    "Login as Direct Orders user",
    "Select outlet 1000023",
    "Add SKU 13321 and SKU 14498 to cart",
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
  edge_cases: ["null confirmedQty", "blank confirmed_qty"],
};

const release = {
  release_gate: "BLOCK" as const,
  risk_score: 88,
  reason: "Core order placement path is blocked",
  must_fix_before_release: [
    "Restore confirmedQty default mapping",
    "Show validation feedback in the cart UI",
  ],
  recommended_tests: ["Cart summary null quantity regression"],
};

const narrator = {
  demo_script: "OpsVerse shows the swarm turning evidence into release action.",
  discord_track_1_post: "OpsVerse is a multimodal multi-agent incident swarm.",
  discord_track_3_post:
    "OpsVerse reduces enterprise incident triage time with structured evidence.",
  x_post: "OpsVerse turns incident evidence into release-ready action.",
};

function wrappedJson(value: unknown) {
  return `Model draft:\n${JSON.stringify(value, null, 2)}\nEnd.`;
}

test("mocked model responses for every prompt validate through production parser", () => {
  const promptCases = [
    {
      name: "vision",
      prompt: buildVisionAgentPrompt(incident),
      schema: visionOutputSchema,
      output: vision,
      requiredTerms: ["screen_type", "visible_error", "ui_state", "confidence"],
    },
    {
      name: "logs",
      prompt: buildLogAgentPrompt(incident),
      schema: logOutputSchema,
      output: logs,
      requiredTerms: ["primary_error", "service", "correlation_id", "confidence"],
    },
    {
      name: "api",
      prompt: buildApiAgentPrompt(incident),
      schema: apiOutputSchema,
      output: api,
      requiredTerms: ["endpoint", "status", "contract_violation", "suggested_fix"],
    },
    {
      name: "db",
      prompt: buildDbAgentPrompt(incident),
      schema: dbOutputSchema,
      output: db,
      requiredTerms: ["suspected_tables", "data_issue", "sql_checks", "confidence"],
    },
    {
      name: "rca",
      prompt: buildRcaAgentPrompt({ incident, logs, api, db, vision }),
      schema: rcaOutputSchema,
      output: rca,
      requiredTerms: [
        "root_cause_summary",
        "evidence_links",
        "alternative_hypotheses",
      ],
    },
    {
      name: "regression",
      prompt: buildTestAgentPrompt({ incident, rca, api, db }),
      schema: regressionTestOutputSchema,
      output: regressionTests,
      requiredTerms: ["karate_test", "postman_assertions", "manual_qa_steps"],
    },
    {
      name: "release",
      prompt: buildReleaseAgentPrompt({ incident, rca, api, db }),
      schema: releaseRiskOutputSchema,
      output: release,
      requiredTerms: [
        "business impact",
        "affected flow",
        "severity signal",
        "missing evidence",
        "regression-test coverage",
        "release_gate",
        "risk_score",
        "recommended_tests",
      ],
    },
    {
      name: "narrator",
      prompt: buildDemoNarratorAgentPrompt({
        incident,
        rca,
        tests: regressionTests,
        release,
      }),
      schema: demoNarratorOutputSchema,
      output: narrator,
      requiredTerms: ["demo_script", "discord_track_1_post", "x_post"],
    },
  ] as const;

  for (const promptCase of promptCases) {
    assert.match(promptCase.prompt, /Return only valid JSON/, promptCase.name);
    for (const term of promptCase.requiredTerms) {
      assert.match(promptCase.prompt, new RegExp(term), promptCase.name);
    }

    const parsed = parseStructuredJson(
      wrappedJson(promptCase.output),
      promptCase.schema as z.ZodType<unknown>,
    );

    assert.deepEqual(parsed, promptCase.output, promptCase.name);
  }
});

test("analysis schemas reject outputs that omit required confidence fields", () => {
  const cases = [
    { name: "vision", schema: visionOutputSchema, output: vision },
    { name: "logs", schema: logOutputSchema, output: logs },
    { name: "api", schema: apiOutputSchema, output: api },
    { name: "db", schema: dbOutputSchema, output: db },
    { name: "rca", schema: rcaOutputSchema, output: rca },
  ] as const;

  for (const item of cases) {
    const withoutConfidence = { ...item.output };
    delete (withoutConfidence as { confidence?: number }).confidence;

    assert.throws(
      () => item.schema.parse(withoutConfidence),
      /confidence/,
      item.name,
    );
  }

  const hypothesisWithoutConfidence = {
    ...rca,
    hypotheses: [{ ...rca.hypotheses[0], confidence: undefined }],
  };

  assert.throws(
    () => rcaOutputSchema.parse(hypothesisWithoutConfidence),
    /confidence/,
  );
});
