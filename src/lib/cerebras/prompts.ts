import type {
  ApiOutput,
  DbOutput,
  IncidentEvidence,
  LogOutput,
  RcaOutput,
} from "@/lib/cerebras/schemas";

const jsonOnly = "Return only valid JSON. Do not wrap the JSON in markdown.";

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
}: {
  incident: IncidentEvidence;
  logs: LogOutput;
  api: ApiOutput;
  db: DbOutput;
}) {
  return `${jsonOnly}

You are the Root Cause Agent.

Combine the evidence from Log, API, and DB agents. Produce:
- root_cause_summary
- confidence from 0 to 1
- evidence_links using agent names
- hypotheses with hypothesis, confidence, and supporting_evidence
- alternative_hypotheses
- missing_evidence

Do not invent facts beyond the evidence. If evidence is missing, list it.

Incident:
${JSON.stringify(incident, null, 2)}

Log agent output:
${JSON.stringify(logs, null, 2)}

API agent output:
${JSON.stringify(api, null, 2)}

DB agent output:
${JSON.stringify(db, null, 2)}`;
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
- api_regression_test as a concise test description or code-like block
- postman_assertions as an array
- karate_test as a Gherkin/Karate-style scenario
- edge_cases as an array

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
  tests,
}: {
  incident: IncidentEvidence;
  rca: RcaOutput;
  tests: unknown;
}) {
  return `${jsonOnly}

You are the Release Risk Agent.

Decide whether the release should PASS, WARN, or BLOCK. Consider business impact,
affected flow, confidence, missing evidence, and available regression tests.

Return:
- release_gate: PASS, WARN, or BLOCK
- risk_score from 0 to 100
- reason
- must_fix_before_release
- recommended_tests

Incident:
${JSON.stringify(incident, null, 2)}

RCA:
${JSON.stringify(rca, null, 2)}

Regression tests:
${JSON.stringify(tests, null, 2)}`;
}
