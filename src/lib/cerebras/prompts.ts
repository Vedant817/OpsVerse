import type {
  ApiOutput,
  DbOutput,
  DemoNarratorOutput,
  IncidentEvidence,
  LogOutput,
  RcaOutput,
  RegressionTestOutput,
  ReleaseRiskOutput,
  VisionOutput,
} from "@/lib/cerebras/schemas";

const jsonOnly = "Return only valid JSON. Do not wrap the JSON in markdown.";

export function buildVisionAgentPrompt(incident: IncidentEvidence) {
  return `${jsonOnly}

You are the Vision Triage Agent in an enterprise incident-response swarm.

Analyze the provided screenshot or representative video frame together with the
incident metadata. Return:
- screen_type
- visible_error
- ui_state
- affected_flow
- confidence from 0 to 1

If the image does not visibly contain an error, say that directly. Do not invent
text or UI state that is not visible.

Incident title: ${incident.title}
Module: ${incident.module}
Screenshot notes: ${incident.screenshotNote || "No screenshot notes provided."}
Video/frame notes: ${incident.videoNote || "No video/frame notes provided."}`;
}

export function buildLogAgentPrompt(incident: IncidentEvidence) {
  return `${jsonOnly}

You are the Log Analysis Agent in an enterprise incident-response swarm.

Analyze only the backend logs and incident metadata below. Extract:
- primary_error
- service
- correlation_id
- timestamp
- repeated_pattern
- failing_function_or_module
- probable_cause
- confidence from 0 to 1

Incident title: ${incident.title}
Module: ${incident.module}

Logs:
${incident.logs}`;
}

export function buildApiAgentPrompt(incident: IncidentEvidence) {
  return `${jsonOnly}

You are the API Contract Agent.

Analyze only the API request/response evidence below. Extract:
- endpoint
- status as a number
- contract_violation
- breaking_field
- expected_value
- actual_value
- likely_impact
- suggested_fix
- confidence from 0 to 1

Incident title: ${incident.title}
Module: ${incident.module}

API evidence:
${incident.apiResponse}`;
}

export function buildDbAgentPrompt(incident: IncidentEvidence) {
  return `${jsonOnly}

You are the DB Consistency Agent.

Analyze only the DB snapshot and incident metadata below. Identify:
- suspected_tables
- inconsistent_fields
- missing_values
- data_issue
- possible_mapping_issue
- sql_checks as non-destructive SELECT statements
- confidence from 0 to 1

Incident title: ${incident.title}
Module: ${incident.module}

DB snapshot:
${incident.dbSnapshot}

Optional git diff:
${incident.gitDiff || "No git diff provided."}`;
}

export function buildRcaAgentPrompt({
  incident,
  logs,
  api,
  db,
  vision,
}: {
  incident: IncidentEvidence;
  logs: LogOutput;
  api: ApiOutput;
  db: DbOutput;
  vision: VisionOutput | null;
}) {
  return `${jsonOnly}

You are the Root Cause Agent.

Combine the evidence from Vision, Log, API, and DB agents. Produce:
- root_cause_summary
- user_impact
- likely_owner
- confidence from 0 to 1
- evidence_links using agent names
- at least three hypotheses with hypothesis, confidence, and supporting_evidence
- alternative_hypotheses
- missing_evidence

Do not invent facts beyond the evidence. If evidence is missing, list it.
When evidence shows a blocked user journey, name the user impact and likely
engineering owner directly.

Incident:
${JSON.stringify(incident, null, 2)}

Log agent output:
${JSON.stringify(logs, null, 2)}

API agent output:
${JSON.stringify(api, null, 2)}

DB agent output:
${JSON.stringify(db, null, 2)}

Vision agent output:
${vision ? JSON.stringify(vision, null, 2) : "Vision output unavailable."}`;
}

export function buildTestAgentPrompt({
  incident,
  rca,
  api,
  db,
}: {
  incident: IncidentEvidence;
  rca: RcaOutput;
  api: ApiOutput;
  db: DbOutput;
}) {
  return `${jsonOnly}

You are the Regression Test Agent.

Using the incident, RCA, API analysis, and DB analysis, generate:
- manual_qa_steps as an array
- sql_validation as an array of non-destructive SELECT statements
- api_expectations as an array of objects with behavior and assertion
- api_regression_test as a concise test description or code-like block
- postman_assertions as an array
- karate_test as a Gherkin/Karate-style scenario
- edge_cases as an array

For a broken API contract, include positive-path expectations, non-null response
shape assertions, and type assertions for fields that failed validation.

Return exactly this JSON object shape:
{
  "manual_qa_steps": ["step"],
  "sql_validation": ["SELECT ..."],
  "api_expectations": [
    { "behavior": "expected behavior", "assertion": "machine-checkable assertion" }
  ],
  "api_regression_test": "concise test description or code-like block",
  "postman_assertions": ["pm.expect(...)"],
  "karate_test": "Given ...\\nWhen ...\\nThen ...",
  "edge_cases": ["edge case"]
}

Incident:
${JSON.stringify(incident, null, 2)}

RCA:
${JSON.stringify(rca, null, 2)}

API analysis:
${JSON.stringify(api, null, 2)}

DB analysis:
${JSON.stringify(db, null, 2)}`;
}

export function buildReleaseAgentPrompt({
  incident,
  rca,
  api,
  db,
}: {
  incident: IncidentEvidence;
  rca: RcaOutput;
  api: ApiOutput;
  db: DbOutput;
}) {
  return `${jsonOnly}

You are the Release Risk Agent.

Decide whether the release should PASS, WARN, or BLOCK. Consider business impact,
affected flow, severity signal, confidence, missing evidence, API contract risk,
DB consistency risk, and available or missing regression-test coverage.
Regression tests run in parallel; recommend the required test coverage instead of
depending on generated test output.
If the evidence shows a core order placement or checkout journey is blocked,
return BLOCK unless the evidence also proves a safe mitigation.

Return:
- release_gate: PASS, WARN, or BLOCK
- risk_score from 0 to 100
- reason
- must_fix_before_release
- recommended_tests

Return exactly this JSON object shape:
{
  "release_gate": "BLOCK",
  "risk_score": 0,
  "reason": "release decision reason",
  "must_fix_before_release": ["required fix"],
  "recommended_tests": ["recommended test"]
}

Incident:
${JSON.stringify(incident, null, 2)}

RCA:
${JSON.stringify(rca, null, 2)}

API analysis:
${JSON.stringify(api, null, 2)}

DB analysis:
${JSON.stringify(db, null, 2)}`;
}

export function buildDemoNarratorAgentPrompt({
  incident,
  rca,
  tests,
  release,
}: {
  incident: IncidentEvidence;
  rca: RcaOutput;
  tests: RegressionTestOutput;
  release: ReleaseRiskOutput;
}): string {
  const outputShape: Record<keyof DemoNarratorOutput, string> = {
    demo_script: "60-second script grounded only in implemented behavior",
    discord_track_1_post: "Track 1 post explaining multimodal multi-agent flow",
    discord_track_3_post: "Track 3 post explaining enterprise impact",
    x_post: "Short post without fake links or unverified deployment claims",
  };

  return `${jsonOnly}

You are the Demo Narrator Agent for OpsVerse.

Generate submission-ready narrative artifacts that describe only the completed
incident package below. Do not claim a live URL, GitHub URL, demo video, or
successful production deployment unless that evidence is present in the input.
Do not invent provider metrics. If speed metrics are missing, describe the
metrics panel as displaying live metrics when successful provider responses are
available.

Return this exact JSON shape:
${JSON.stringify(outputShape, null, 2)}

Incident:
${JSON.stringify(incident, null, 2)}

RCA:
${JSON.stringify(rca, null, 2)}

Regression tests:
${JSON.stringify(tests, null, 2)}

Release decision:
${JSON.stringify(release, null, 2)}`;
}
