import test from "node:test";
import assert from "node:assert/strict";
import { buildIncidentReportMarkdown } from "../src/lib/exports/incident-report";
import { retrieveRunbookMatches } from "../src/lib/runbook/synthetic-runbook";
import { finalIncidentPackageSchema } from "../src/lib/cerebras/schemas";
import { primaryIncidentSample } from "../src/lib/samples";

const incident = {
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

test("synthetic runbook retrieval ranks the cart summary entry first", () => {
  const matches = retrieveRunbookMatches(incident);

  assert.equal(matches[0].id, "direct-orders-cart-summary-null-quantity");
  assert.ok(matches[0].score > 0);
  assert.ok(matches[0].matchedTerms.includes("confirmedqty"));
  assert.match(matches[0].reason, /Matched/);
  assert.ok(
    matches[0].diagnosticChecks.some((check) =>
      check.includes("/api/cart/summary"),
    ),
  );
});

test("synthetic runbook retrieval returns no matches for unrelated evidence", () => {
  const matches = retrieveRunbookMatches({
    ...incident,
    title: "Marketing page typography issue",
    module: "Brand site",
    screenshotNote: "A heading is misaligned.",
    videoNote: "",
    logs: "INFO static renderer completed",
    apiResponse: "{}",
    dbSnapshot: "",
    gitDiff: "",
  });

  assert.deepEqual(matches, []);
});

test("incident report markdown includes synthetic runbook matches", () => {
  const incidentPackage = finalIncidentPackageSchema.parse({
    incident,
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

  assert.match(markdown, /## Synthetic Runbook Matches/);
  assert.match(markdown, /Direct Orders cart summary blocked by null quantity/);
  assert.match(markdown, /Backend validation \+ frontend cart owner/);
});
