import type { FinalIncidentPackage } from "@/lib/cerebras/schemas";

export type OutputQualityStatus = "pass" | "warn" | "block";

export type OutputQualityCheck = {
  id: string;
  label: string;
  status: OutputQualityStatus;
  detail: string;
  evidence: string[];
};

export type OutputQualityReport = {
  status: OutputQualityStatus;
  pass: number;
  warn: number;
  block: number;
  checks: OutputQualityCheck[];
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function includesAny(value: string, terms: string[]) {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function joined(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => hasText(value)).join("\n");
}

function nonDestructiveSql(sql: string) {
  return /^\s*select\b/i.test(sql) && !/\b(delete|update|insert|drop|alter|truncate)\b/i.test(sql);
}

function statusFromChecks(checks: OutputQualityCheck[]): OutputQualityStatus {
  if (checks.some((check) => check.status === "block")) {
    return "block";
  }

  if (checks.some((check) => check.status === "warn")) {
    return "warn";
  }

  return "pass";
}

function evidenceSignals(result: FinalIncidentPackage) {
  const source = joined([
    result.incident.title,
    result.incident.module,
    result.incident.logs,
    result.incident.apiResponse,
    result.incident.dbSnapshot,
    result.incident.gitDiff,
  ]);

  const outlet = source.match(/\b(\d{6,})\b/)?.[1] ?? "";
  const skus = [...new Set([...source.matchAll(/\b(\d{5})\b/g)].map((match) => match[1]))]
    .filter((value) => value !== outlet)
    .slice(0, 4);

  return {
    source,
    outlet,
    skus,
    hasCartSummarySignal: source.includes("/api/cart/summary"),
    hasConfirmedQuantitySignal: /confirmed_?qty/i.test(source),
    hasValidationFailureSignal: /422|validation failed/i.test(source),
  };
}

export function evaluateOutputQuality(
  result: FinalIncidentPackage,
): OutputQualityReport {
  const checks: OutputQualityCheck[] = [];
  const signals = evidenceSignals(result);
  const rca = result.outputs.rca;
  const vision = result.outputs.vision;
  const tests = result.outputs.tests;
  const release = result.outputs.release;
  const api = result.outputs.api;
  const db = result.outputs.db;

  checks.push({
    id: "incident_summary",
    label: "Incident summary is actionable",
    status:
      rca &&
      hasText(rca.root_cause_summary) &&
      hasText(rca.user_impact) &&
      hasText(rca.likely_owner) &&
      typeof rca.confidence === "number"
        ? "pass"
        : "block",
    detail: rca
      ? "RCA includes summary, user impact, likely owner, and confidence."
      : "RCA output is missing.",
    evidence: [
      rca?.root_cause_summary ?? "",
      rca?.user_impact ?? "",
      rca?.likely_owner ?? "",
    ].filter(hasText),
  });

  checks.push({
    id: "screenshot_understanding",
    label: "Screenshot understanding is explicit",
    status:
      vision &&
      hasText(vision.screen_type) &&
      hasText(vision.visible_error) &&
      hasText(vision.ui_state) &&
      hasText(vision.affected_flow)
        ? "pass"
        : "warn",
    detail: vision
      ? "Vision output includes screen type, visible error state, UI state, and affected flow."
      : "Vision output is unavailable or skipped.",
    evidence: [
      vision?.screen_type ?? "",
      vision?.visible_error ?? "",
      vision?.ui_state ?? "",
      vision?.affected_flow ?? "",
    ].filter(hasText),
  });

  const hypothesisConfidences = rca?.hypotheses.map((item) => item.confidence) ?? [];
  const hypothesesRanked = hypothesisConfidences.every(
    (confidence, index) => index === 0 || confidence <= hypothesisConfidences[index - 1],
  );
  checks.push({
    id: "root_cause_hypotheses",
    label: "Root-cause hypotheses are ranked and evidence-backed",
    status:
      rca &&
      rca.hypotheses.length >= 3 &&
      rca.hypotheses.every((item) => item.supporting_evidence.length > 0)
        ? hypothesesRanked
          ? "pass"
          : "warn"
        : "block",
    detail:
      rca && rca.hypotheses.length >= 3
        ? hypothesesRanked
          ? "At least three hypotheses include supporting evidence and descending confidence."
          : "At least three hypotheses include supporting evidence, but confidence ordering should be reviewed."
        : "At least three evidence-backed hypotheses are required.",
    evidence: rca?.hypotheses.map((item) => item.hypothesis) ?? [],
  });

  const qaSteps = joined(tests?.manual_qa_steps ?? []);
  const hasOutlet = signals.outlet ? qaSteps.includes(signals.outlet) : true;
  const hasSku = signals.skus.length > 0
    ? signals.skus.some((sku) => qaSteps.includes(sku))
    : true;
  checks.push({
    id: "reproduction_steps",
    label: "Reproduction steps are usable by QA",
    status:
      tests && tests.manual_qa_steps.length >= 4 && hasOutlet && hasSku
        ? "pass"
        : tests && tests.manual_qa_steps.length >= 4
          ? "warn"
          : "block",
    detail:
      tests && tests.manual_qa_steps.length >= 4
        ? hasOutlet && hasSku
          ? "Manual QA steps include the submitted outlet/SKU details where available."
          : "Manual QA steps exist, but submitted outlet/SKU details are not both visible."
        : "Manual QA steps are missing or too short.",
    evidence: tests?.manual_qa_steps ?? [],
  });

  const sqlChecks = tests?.sql_validation ?? db?.sql_checks ?? [];
  checks.push({
    id: "sql_checks",
    label: "SQL validation is non-destructive",
    status:
      sqlChecks.length > 0 && sqlChecks.every(nonDestructiveSql) ? "pass" : "block",
    detail:
      sqlChecks.length > 0 && sqlChecks.every(nonDestructiveSql)
        ? "SQL checks are present and use SELECT-only statements."
        : "SQL checks must exist and avoid destructive statements.",
    evidence: sqlChecks,
  });

  const apiExpectations = joined([
    ...(tests?.api_expectations.map((item) => `${item.behavior} ${item.assertion}`) ?? []),
    tests?.api_regression_test,
    tests?.karate_test,
    ...(tests?.postman_assertions ?? []),
  ]);
  const apiCoversStatus = includesAny(apiExpectations, ["status 200", "status === 200", "code).to.eql(200"]);
  const apiCoversSummary = includesAny(apiExpectations, ["orderSummary", "order summary"]);
  const apiCoversConfirmedQty = includesAny(apiExpectations, ["confirmedQty", "confirmed quantity"]);
  checks.push({
    id: "api_regression_tests",
    label: "API regression tests cover response shape",
    status:
      tests && apiCoversStatus && apiCoversSummary && apiCoversConfirmedQty
        ? "pass"
        : tests
          ? "warn"
          : "block",
    detail:
      tests && apiCoversStatus && apiCoversSummary && apiCoversConfirmedQty
        ? "API regression output covers 200 status, order summary presence, and confirmed quantity typing."
        : "API regression output should cover status, order summary, and confirmedQty shape.",
    evidence: tests?.api_expectations.map((item) => `${item.behavior}: ${item.assertion}`) ?? [],
  });

  const releaseShouldBlock =
    (api?.status ?? 0) >= 400 ||
    signals.hasCartSummarySignal ||
    signals.hasValidationFailureSignal;
  checks.push({
    id: "release_decision",
    label: "Release decision is risk-aware",
    status:
      release &&
      hasText(release.reason) &&
      release.must_fix_before_release.length > 0 &&
      release.recommended_tests.length > 0 &&
      (!releaseShouldBlock || release.release_gate === "BLOCK")
        ? "pass"
        : release
          ? "warn"
          : "block",
    detail:
      release && (!releaseShouldBlock || release.release_gate === "BLOCK")
        ? "Release output includes gate, risk score, reason, must-fix items, and recommended tests."
        : "Release output should block risky validation/API failures and include must-fix/test guidance.",
    evidence: release
      ? [
          `Gate: ${release.release_gate}`,
          `Risk: ${release.risk_score}`,
          release.reason,
          ...release.must_fix_before_release,
          ...release.recommended_tests,
        ]
      : [],
  });

  checks.push({
    id: "primary_sample_alignment",
    label: "Primary sample signals remain aligned",
    status:
      signals.hasCartSummarySignal &&
      signals.hasConfirmedQuantitySignal &&
      signals.hasValidationFailureSignal
        ? "pass"
        : "warn",
    detail:
      "Checks whether the evidence still contains the cart summary, confirmed quantity, and validation-failure signals used by the hackathon demo.",
    evidence: [
      signals.hasCartSummarySignal ? "/api/cart/summary" : "",
      signals.hasConfirmedQuantitySignal ? "confirmedQty/confirmed_qty" : "",
      signals.hasValidationFailureSignal ? "HTTP 422 validation failure" : "",
    ].filter(hasText),
  });

  const pass = checks.filter((check) => check.status === "pass").length;
  const warn = checks.filter((check) => check.status === "warn").length;
  const block = checks.filter((check) => check.status === "block").length;

  return {
    status: statusFromChecks(checks),
    pass,
    warn,
    block,
    checks,
  };
}
