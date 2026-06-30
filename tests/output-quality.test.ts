import test from "node:test";
import assert from "node:assert/strict";
import { buildLocalDemoIncidentPackage } from "../src/lib/agents/local-demo-output";
import { evaluateOutputQuality } from "../src/lib/quality/output-quality";
import { primaryIncidentSample } from "../src/lib/samples";
import type { FinalIncidentPackage, IncidentEvidence } from "../src/lib/cerebras/schemas";

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

test("output quality passes for a complete primary incident package", () => {
  const result = buildLocalDemoIncidentPackage(incident());
  const report = evaluateOutputQuality(result);

  assert.equal(report.status, "pass");
  assert.equal(report.block, 0);
  assert.equal(report.warn, 0);
  assert.equal(report.checks.length, 8);
  assert.deepEqual(
    report.checks.map((check) => check.id),
    [
      "incident_summary",
      "screenshot_understanding",
      "root_cause_hypotheses",
      "reproduction_steps",
      "sql_checks",
      "api_regression_tests",
      "release_decision",
      "primary_sample_alignment",
    ],
  );
});

test("output quality blocks incomplete packages without RCA and tests", () => {
  const result = buildLocalDemoIncidentPackage(incident());
  const incomplete: FinalIncidentPackage = {
    ...result,
    outputs: {
      ...result.outputs,
      rca: null,
      tests: null,
      release: null,
    },
  };
  const report = evaluateOutputQuality(incomplete);

  assert.equal(report.status, "block");
  assert.ok(report.block >= 4);
  assert.equal(
    report.checks.find((check) => check.id === "incident_summary")?.status,
    "block",
  );
  assert.equal(
    report.checks.find((check) => check.id === "api_regression_tests")?.status,
    "block",
  );
});

test("output quality warns when release gate does not block risky API evidence", () => {
  const result = buildLocalDemoIncidentPackage(incident());
  const riskyWarn: FinalIncidentPackage = {
    ...result,
    outputs: {
      ...result.outputs,
      release: result.outputs.release
        ? {
            ...result.outputs.release,
            release_gate: "WARN",
          }
        : null,
    },
  };
  const report = evaluateOutputQuality(riskyWarn);

  assert.equal(report.status, "warn");
  assert.equal(
    report.checks.find((check) => check.id === "release_decision")?.status,
    "warn",
  );
});
