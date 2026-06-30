import test from "node:test";
import assert from "node:assert/strict";
import { finalIncidentPackageSchema } from "../src/lib/cerebras/schemas";
import { answerIncidentQuestion } from "../src/lib/followup/evidence-chat";
import { buildIncidentReportMarkdown } from "../src/lib/exports/incident-report";
import { primaryIncidentSample } from "../src/lib/samples";

const incidentPackage = finalIncidentPackageSchema.parse({
  incident: {
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
  },
  agent_runs: [],
  outputs: {
    intake: null,
    vision: null,
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
    rca: null,
    tests: null,
    release: null,
    narrator: null,
  },
});

test("evidence chat answers root-cause questions from supplied evidence", () => {
  const answer = answerIncidentQuestion(
    incidentPackage,
    "What is the likely root cause?",
  );

  assert.equal(answer.ok, true);
  assert.match(answer.answer, /Root-cause evidence/);
  assert.ok(
    answer.sources.some((source) =>
      /confirmedQty|CartSummaryValidationException/.test(source.excerpt),
    ),
  );
});

test("evidence chat answers SQL questions from DB evidence", () => {
  const answer = answerIncidentQuestion(
    incidentPackage,
    "Which SQL checks should I run?",
  );

  assert.equal(answer.ok, true);
  assert.ok(answer.sources[0].label.includes("DB"));
  assert.match(answer.answer, /ck_stock/);
});

test("evidence chat refuses unsupported questions without evidence", () => {
  const answer = answerIncidentQuestion(
    incidentPackage,
    "What is the customer's browser extension list?",
  );

  assert.equal(answer.ok, false);
  assert.match(answer.answer, /could not find direct support/);
  assert.deepEqual(answer.sources, []);
});

test("incident report markdown lists grounded follow-up questions", () => {
  const markdown = buildIncidentReportMarkdown(incidentPackage);

  assert.match(markdown, /## Grounded Follow-up Questions/);
  assert.match(markdown, /What is the likely root cause\?/);
});
