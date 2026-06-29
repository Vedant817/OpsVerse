import test from "node:test";
import assert from "node:assert/strict";
import { analyzePrDiff } from "../src/lib/diff/pr-diff-analysis";
import { buildIncidentReportMarkdown } from "../src/lib/exports/incident-report";
import { finalIncidentPackageSchema } from "../src/lib/cerebras/schemas";
import { primaryIncidentSample } from "../src/lib/samples";

const fullDiff = `diff --git a/src/cart/mapper.ts b/src/cart/mapper.ts
index 1111111..2222222 100644
--- a/src/cart/mapper.ts
+++ b/src/cart/mapper.ts
@@ -4,7 +4,7 @@ export function mapItem(item) {
-  confirmedQty: item.confirmedQty ?? 0
+  confirmedQty: item.confirmedQty
 }`;

test("PR diff analyzer detects removed null fallback and quantity-field risk", () => {
  const analysis = analyzePrDiff(fullDiff);

  assert.equal(analysis.supplied, true);
  assert.deepEqual(analysis.files, ["src/cart/mapper.ts"]);
  assert.equal(analysis.addedLines, 1);
  assert.equal(analysis.removedLines, 1);
  assert.ok(analysis.changedFields.includes("confirmedQty"));
  assert.ok(analysis.changedFields.includes("item.confirmedQty"));
  assert.equal(analysis.risks[0].severity, "high");
  assert.match(analysis.risks[0].title, /fallback removed/i);
  assert.ok(
    analysis.recommendedTests.includes(
      "response.items[*].confirmedQty is always a number in successful summaries.",
    ),
  );
});

test("PR diff analyzer returns explicit unavailable state without diff evidence", () => {
  const analysis = analyzePrDiff("");

  assert.equal(analysis.supplied, false);
  assert.equal(analysis.summary, "No Git diff evidence was supplied.");
  assert.deepEqual(analysis.risks, []);
});

test("incident report markdown includes PR diff analysis section", () => {
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
      logs: null,
      api: null,
      db: null,
      rca: null,
      tests: null,
      release: null,
      narrator: null,
    },
  });

  const markdown = buildIncidentReportMarkdown(incidentPackage);

  assert.match(markdown, /## PR Diff Analysis/);
  assert.match(markdown, /Null\/default fallback removed/);
  assert.match(markdown, /confirmedQty/);
});
