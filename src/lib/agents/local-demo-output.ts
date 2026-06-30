import {
  finalIncidentPackageSchema,
  type AgentRun,
  type ApiOutput,
  type DbOutput,
  type DemoNarratorOutput,
  type FinalIncidentPackage,
  type IncidentEvidence,
  type IntakeOutput,
  type LogOutput,
  type RcaOutput,
  type RegressionTestOutput,
  type ReleaseRiskOutput,
  type VisionOutput,
} from "@/lib/cerebras/schemas";

export const localDemoRuntime = {
  mode: "local_demo" as const,
  label: "Local deterministic demo",
  note:
    "OPSVERSE_LOCAL_AGENT_MODE is enabled. Outputs are derived from submitted evidence without provider calls and must not be claimed as live Gemma or Cerebras execution.",
};

function textMatch(value: string, pattern: RegExp, fallback: string) {
  return value.match(pattern)?.[1]?.trim() || fallback;
}

function parseApiResponse(raw: string) {
  try {
    const parsed = JSON.parse(raw) as {
      endpoint?: unknown;
      status?: unknown;
      error?: unknown;
      details?: Array<{ field?: unknown; message?: unknown }>;
    };
    const firstDetail = Array.isArray(parsed.details) ? parsed.details[0] : null;

    return {
      endpoint:
        typeof parsed.endpoint === "string" ? parsed.endpoint : "submitted API endpoint",
      status: typeof parsed.status === "number" ? parsed.status : 0,
      error: typeof parsed.error === "string" ? parsed.error : "API contract issue",
      field:
        typeof firstDetail?.field === "string"
          ? firstDetail.field
          : textMatch(raw, /"?field"?\s*:\s*"([^"]+)"/i, "submitted field"),
      message:
        typeof firstDetail?.message === "string"
          ? firstDetail.message
          : textMatch(raw, /"?message"?\s*:\s*"([^"]+)"/i, "Unexpected API response shape"),
    };
  } catch {
    return {
      endpoint: textMatch(raw, /endpoint["\s:]+([^,"\n]+)/i, "submitted API endpoint"),
      status: Number(textMatch(raw, /status["\s:]+(\d+)/i, "0")),
      error: textMatch(raw, /error["\s:]+([^,"\n]+)/i, "API contract issue"),
      field: textMatch(raw, /field["\s:]+([^,"\n]+)/i, "submitted field"),
      message: textMatch(raw, /message["\s:]+([^"\n]+)/i, "Unexpected API response shape"),
    };
  }
}

function parseDbSnapshot(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headers = lines[0]?.split(",").map((header) => header.trim()) ?? [];
  const rows = lines.slice(1).map((line) => line.split(",").map((cell) => cell.trim()));
  const blankFields = rows.flatMap((row, rowIndex) =>
    row.flatMap((cell, columnIndex) => {
      if (cell) {
        return [];
      }

      const skuIndex = headers.findIndex((header) => /sku/i.test(header));
      const sku = skuIndex >= 0 ? row[skuIndex] : `row ${rowIndex + 1}`;
      return [`${headers[columnIndex] ?? `column_${columnIndex + 1}`} blank for ${sku}`];
    }),
  );
  const outlet = textMatch(raw, /(?:^|\n)(\d{6,})[,|\s]/, "submitted outlet");

  return {
    headers,
    blankFields,
    outlet,
  };
}

function completeRun(agentName: string, output: unknown): AgentRun {
  return {
    agent_name: agentName,
    status: "complete",
    output,
    error: null,
    metrics: null,
  };
}

function hasText(value: string | undefined) {
  return Boolean(value?.trim());
}

function buildIntakeOutput(
  incident: IncidentEvidence,
  incidentId: string | null,
): IntakeOutput {
  const visualEvidence = hasText(incident.screenshotDataUri) || incident.videoFrameDataUris.length > 0;
  const recommendedAgents = [
    visualEvidence || hasText(incident.screenshotNote) || hasText(incident.videoNote)
      ? "vision_agent"
      : null,
    hasText(incident.logs) ? "log_agent" : null,
    hasText(incident.apiResponse) ? "api_agent" : null,
    hasText(incident.dbSnapshot) ? "db_agent" : null,
    "rca_agent",
    "test_agent",
    "release_agent",
  ].filter((agent): agent is string => agent !== null);

  return {
    incident_id: incidentId ?? "local-demo-incident",
    detected_artifacts: [
      hasText(incident.screenshotNote) || hasText(incident.screenshotDataUri)
        ? "screenshot"
        : null,
      incident.videoFrameDataUris.length > 0 || hasText(incident.videoNote)
        ? "video_frames"
        : null,
      hasText(incident.logs) ? "logs" : null,
      hasText(incident.apiResponse) ? "api_response" : null,
      hasText(incident.dbSnapshot) ? "db_snapshot" : null,
      hasText(incident.gitDiff) ? "git_diff" : null,
    ].filter((artifact): artifact is string => artifact !== null),
    missing_artifacts: [
      visualEvidence || hasText(incident.screenshotNote) || hasText(incident.videoNote)
        ? null
        : "visual_evidence",
      hasText(incident.gitDiff) ? null : "git_diff",
    ].filter((artifact): artifact is string => artifact !== null),
    recommended_agents: recommendedAgents,
    normalized_title: incident.title,
    normalized_module: incident.module,
  };
}

function buildVisionOutput(incident: IncidentEvidence): VisionOutput {
  return {
    screen_type: incident.module ? `${incident.module} workflow evidence` : "Submitted workflow evidence",
    visible_error:
      incident.screenshotNote || incident.videoNote
        ? "No frontend error is explicitly visible in the supplied visual notes."
        : "No visual evidence note was supplied.",
    ui_state:
      incident.screenshotNote ||
      incident.videoNote ||
      "UI state inferred only from submitted non-visual evidence.",
    affected_flow: incident.title,
    confidence: incident.screenshotNote || incident.videoNote ? 0.72 : 0.45,
  };
}

function buildLogOutput(incident: IncidentEvidence): LogOutput {
  return {
    primary_error: textMatch(
      incident.logs,
      /([A-Za-z0-9]+Exception|ERROR[^\n]*)/,
      "Submitted service error",
    ),
    service: textMatch(incident.logs, /ERROR\s+([A-Za-z0-9_-]+)/, incident.module),
    correlation_id: textMatch(
      incident.logs,
      /CorrelationId=([A-Za-z0-9_-]+)/i,
      "not supplied",
    ),
    timestamp: textMatch(incident.logs, /^([0-9TZ:.-]+)/, "timestamp not supplied"),
    repeated_pattern: textMatch(
      incident.logs,
      /:\s*([^\n]*null[^\n]*)/i,
      "No repeated pattern was directly visible.",
    ),
    failing_function_or_module: textMatch(
      incident.logs,
      /at\s+([A-Za-z0-9_.]+)\(/,
      incident.module,
    ),
    probable_cause: "The submitted logs show a backend failure aligned with the API contract evidence.",
    confidence: 0.82,
  };
}

function buildApiOutput(incident: IncidentEvidence): ApiOutput {
  const api = parseApiResponse(incident.apiResponse);

  return {
    endpoint: api.endpoint,
    status: api.status,
    contract_violation: `${api.field}: ${api.message}`,
    breaking_field: api.field,
    expected_value: api.message.match(/Expected\s+([^,]+)/i)?.[1] ?? "valid value",
    actual_value: api.message.match(/received\s+(.+)$/i)?.[1] ?? api.error,
    likely_impact: `${incident.title} cannot complete successfully.`,
    suggested_fix: `Normalize ${api.field} before ${api.endpoint} validation and return a visible field error when validation fails.`,
    confidence: 0.9,
  };
}

function buildDbOutput(incident: IncidentEvidence): DbOutput {
  const db = parseDbSnapshot(incident.dbSnapshot);
  const suspectedTable =
    incident.module.toLowerCase().includes("order") || incident.title.toLowerCase().includes("cart")
      ? "cart_or_stock_snapshot"
      : "submitted_snapshot";

  return {
    suspected_tables: [suspectedTable],
    inconsistent_fields: db.blankFields.length > 0 ? db.blankFields : ["No blank CSV fields detected"],
    missing_values: db.blankFields.length > 0 ? db.blankFields : ["No missing DB values detected"],
    data_issue:
      db.blankFields.length > 0
        ? `${db.blankFields[0]} in the submitted DB snapshot.`
        : "The supplied DB snapshot needs comparison against API mapper expectations.",
    possible_mapping_issue:
      "A mapper or validation layer may be passing raw snapshot values into the API contract without defaulting nullable quantity fields.",
    sql_checks: [
      `SELECT * FROM ${suspectedTable} WHERE outlet_code = '${db.outlet}';`,
      "SELECT sku_code, confirmed_qty FROM cart_or_stock_snapshot WHERE confirmed_qty IS NULL OR confirmed_qty = '';",
    ],
    confidence: db.blankFields.length > 0 ? 0.8 : 0.58,
  };
}

function buildRcaOutput({
  incident,
  vision,
  logs,
  api,
  db,
}: {
  incident: IncidentEvidence;
  vision: VisionOutput;
  logs: LogOutput;
  api: ApiOutput;
  db: DbOutput;
}): RcaOutput {
  return {
    root_cause_summary: `${incident.title} is most likely caused by ${api.breaking_field} failing the ${api.endpoint} contract while backend logs report ${logs.primary_error}.`,
    user_impact: `Users cannot complete ${incident.module} flow: ${incident.title}.`,
    likely_owner: "Backend validation plus frontend error handling",
    confidence: 0.84,
    evidence_links: ["vision_agent", "log_agent", "api_agent", "db_agent"],
    hypotheses: [
      {
        hypothesis: `Backend/API contract rejects ${api.breaking_field} before the workflow can continue.`,
        confidence: 0.88,
        supporting_evidence: [`api_agent ${api.contract_violation}`, `log_agent ${logs.primary_error}`],
      },
      {
        hypothesis: "Frontend does not surface the backend validation failure and leaves the user on the same workflow state.",
        confidence: 0.72,
        supporting_evidence: [`vision_agent ${vision.visible_error}`],
      },
      {
        hypothesis: "Snapshot-to-API mapping is not normalizing nullable quantity fields before validation.",
        confidence: 0.68,
        supporting_evidence: [`db_agent ${db.data_issue}`],
      },
    ],
    alternative_hypotheses: [
      "Network timing or auth failures cannot be ruled out without browser/network traces.",
    ],
    missing_evidence: ["frontend console logs", "network trace", "exact deployed commit SHA"],
  };
}

function buildRegressionTests({
  incident,
  api,
  db,
}: {
  incident: IncidentEvidence;
  api: ApiOutput;
  db: DbOutput;
}): RegressionTestOutput {
  return {
    manual_qa_steps: [
      `Open ${incident.module}.`,
      "Load the same outlet/SKU combination from the submitted evidence.",
      `Trigger the workflow: ${incident.title}.`,
      "Verify the user reaches the expected next screen or sees a field-level validation error.",
    ],
    sql_validation: db.sql_checks,
    api_expectations: [
      {
        behavior: `${api.endpoint} should accept normalized quantity fields for valid SKUs.`,
        assertion: "response status is 200 for valid normalized input",
      },
      {
        behavior: `${api.breaking_field} should never be null in successful summary responses.`,
        assertion: "every returned confirmed quantity is numeric",
      },
    ],
    api_regression_test: `POST ${api.endpoint} with normalized evidence should return 200 and a non-empty order summary.`,
    postman_assertions: [
      "pm.expect(pm.response.code).to.be.oneOf([200, 422]);",
      `pm.expect(pm.response.json()).to.have.nested.property('${api.breaking_field.replace(/\[(\d+)\]/g, ".$1")}');`,
    ],
    karate_test: `Given path '${api.endpoint}'\nWhen method post\nThen status 200\nAnd match response.items[*].confirmedQty contains only '#number'`,
    edge_cases: ["null quantity", "blank CSV quantity", "zero quantity", "mixed case/piece quantity"],
  };
}

function buildReleaseRisk(incident: IncidentEvidence): ReleaseRiskOutput {
  return {
    release_gate: "BLOCK",
    risk_score: 86,
    reason: `Core ${incident.module} workflow is blocked for ${incident.title}.`,
    must_fix_before_release: [
      "Normalize nullable quantity fields before API validation.",
      "Show backend validation errors in the user workflow.",
      "Add regression coverage for the submitted failing evidence.",
    ],
    recommended_tests: [
      "API contract regression for nullable quantity fields",
      "Manual QA on the affected workflow",
      "DB snapshot validation for blank quantity fields",
    ],
  };
}

function buildNarrator(incident: IncidentEvidence): DemoNarratorOutput {
  return {
    demo_script:
      "OpsVerse loads synthetic incident evidence, runs a visibly labeled local deterministic demo swarm, and turns the evidence into RCA, regression checks, Jira-ready notes, and a BLOCK release decision. Replace local demo mode with live Gemma on Cerebras before claiming provider speed.",
    discord_track_1_post: `OpsVerse demonstrates a multimodal incident swarm for ${incident.module} using synthetic evidence and explicit local demo mode when live Gemma is unavailable.`,
    discord_track_3_post: `OpsVerse converts enterprise app incident evidence into structured engineering action for ${incident.module}: RCA, tests, SQL checks, Jira notes, and release risk.`,
    x_post:
      "OpsVerse turns synthetic incident evidence into release-ready engineering action with a visibly labeled multi-agent demo path.",
  };
}

export function buildLocalDemoIncidentPackage(
  incident: IncidentEvidence,
  incidentId: string | null = null,
): FinalIncidentPackage {
  const intake = buildIntakeOutput(incident, incidentId);
  const vision = buildVisionOutput(incident);
  const logs = buildLogOutput(incident);
  const api = buildApiOutput(incident);
  const db = buildDbOutput(incident);
  const rca = buildRcaOutput({ incident, vision, logs, api, db });
  const tests = buildRegressionTests({ incident, api, db });
  const release = buildReleaseRisk(incident);
  const narrator = buildNarrator(incident);

  return finalIncidentPackageSchema.parse({
    incident,
    runtime: localDemoRuntime,
    agent_runs: [
      completeRun("intake_agent", intake),
      completeRun("vision_agent", vision),
      completeRun("log_agent", logs),
      completeRun("api_agent", api),
      completeRun("db_agent", db),
      completeRun("rca_agent", rca),
      completeRun("test_agent", tests),
      completeRun("release_agent", release),
      completeRun("narrator_agent", narrator),
    ],
    outputs: {
      intake,
      vision,
      logs,
      api,
      db,
      rca,
      tests,
      release,
      narrator,
    },
  });
}
