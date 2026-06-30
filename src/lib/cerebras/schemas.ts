import { z } from "zod";

export const incidentEvidenceSchema = z.object({
  title: z.string().trim().min(1, "Incident title is required"),
  module: z.string().trim().min(1, "Module or service is required"),
  screenshotNote: z.string().trim().optional().default(""),
  screenshotDataUri: z.string().trim().optional().default(""),
  screenshotFileName: z.string().trim().optional().default(""),
  videoNote: z.string().trim().optional().default(""),
  videoFrameDataUri: z.string().trim().optional().default(""),
  videoFrameDataUris: z.array(z.string().trim()).optional().default([]),
  videoFileName: z.string().trim().optional().default(""),
  logs: z.string().trim().min(1, "Logs are required"),
  apiResponse: z.string().trim().min(1, "API response is required"),
  dbSnapshot: z.string().trim().min(1, "DB snapshot is required"),
  gitDiff: z.string().trim().optional().default(""),
});

export const intakeOutputSchema = z.object({
  incident_id: z.string().min(1),
  detected_artifacts: z.array(z.string()),
  missing_artifacts: z.array(z.string()),
  recommended_agents: z.array(z.string()),
  normalized_title: z.string(),
  normalized_module: z.string(),
});

export const visionOutputSchema = z.object({
  screen_type: z.string(),
  visible_error: z.string(),
  ui_state: z.string(),
  affected_flow: z.string(),
  confidence: z.number().min(0).max(1),
});

export const logOutputSchema = z.object({
  primary_error: z.string(),
  service: z.string(),
  correlation_id: z.string(),
  timestamp: z.string(),
  repeated_pattern: z.string(),
  failing_function_or_module: z.string(),
  probable_cause: z.string(),
  confidence: z.number().min(0).max(1),
});

export const apiOutputSchema = z.object({
  endpoint: z.string(),
  status: z.number(),
  contract_violation: z.string(),
  breaking_field: z.string(),
  expected_value: z.string(),
  actual_value: z.string(),
  likely_impact: z.string(),
  suggested_fix: z.string(),
  confidence: z.number().min(0).max(1),
});

export const dbOutputSchema = z.object({
  suspected_tables: z.array(z.string()),
  inconsistent_fields: z.array(z.string()),
  missing_values: z.array(z.string()),
  data_issue: z.string(),
  possible_mapping_issue: z.string(),
  sql_checks: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const rootCauseHypothesisSchema = z.object({
  hypothesis: z.string().trim().min(1),
  confidence: z.number().min(0).max(1),
  supporting_evidence: z.array(z.string().trim().min(1)).min(1),
});

export const apiExpectationSchema = z.object({
  behavior: z.string().trim().min(1),
  assertion: z.string().trim().min(1),
});

export const rcaOutputSchema = z.object({
  root_cause_summary: z.string().trim().min(1),
  user_impact: z.string().trim().min(1),
  likely_owner: z.string().trim().min(1),
  confidence: z.number().min(0).max(1),
  evidence_links: z.array(z.string().trim().min(1)).min(1),
  hypotheses: z.array(rootCauseHypothesisSchema).min(3),
  alternative_hypotheses: z.array(z.string().trim().min(1)),
  missing_evidence: z.array(z.string().trim().min(1)),
});

export const regressionTestOutputSchema = z.object({
  manual_qa_steps: z.array(z.string().trim().min(1)).min(1),
  sql_validation: z.array(z.string().trim().min(1)).min(1),
  api_expectations: z.array(apiExpectationSchema).min(1),
  api_regression_test: z.string().trim().min(1),
  postman_assertions: z.array(z.string().trim().min(1)).min(1),
  karate_test: z.string().trim().min(1),
  edge_cases: z.array(z.string().trim().min(1)),
});

export const releaseRiskOutputSchema = z.object({
  release_gate: z.union([
    z.literal("PASS"),
    z.literal("WARN"),
    z.literal("BLOCK"),
  ]),
  risk_score: z.number().min(0).max(100),
  reason: z.string().trim().min(1),
  must_fix_before_release: z.array(z.string().trim().min(1)).min(1),
  recommended_tests: z.array(z.string().trim().min(1)).min(1),
});

export const demoNarratorOutputSchema = z.object({
  demo_script: z.string(),
  discord_track_1_post: z.string(),
  discord_track_3_post: z.string(),
  x_post: z.string(),
});

export const agentMetricsSchema = z.object({
  latencyMs: z.number(),
  promptTokens: z.number().nullable(),
  completionTokens: z.number().nullable(),
  totalTokens: z.number().nullable(),
  tokensPerSecond: z.number().nullable(),
  timeInfo: z.unknown(),
});

export const agentRunSchema = z.object({
  agent_name: z.string(),
  status: z.union([z.literal("complete"), z.literal("failed")]),
  output: z.unknown().nullable(),
  error: z.string().nullable(),
  metrics: agentMetricsSchema.nullable(),
});

export const finalIncidentPackageSchema = z.object({
  incident: incidentEvidenceSchema,
    agent_runs: z.array(agentRunSchema),
  outputs: z.object({
    intake: intakeOutputSchema.nullable(),
    vision: visionOutputSchema.nullable(),
    logs: logOutputSchema.nullable(),
    api: apiOutputSchema.nullable(),
    db: dbOutputSchema.nullable(),
    rca: rcaOutputSchema.nullable(),
    tests: regressionTestOutputSchema.nullable(),
    release: releaseRiskOutputSchema.nullable(),
    narrator: demoNarratorOutputSchema.nullable(),
  }),
});

export type IncidentEvidence = z.infer<typeof incidentEvidenceSchema>;
export type IntakeOutput = z.infer<typeof intakeOutputSchema>;
export type VisionOutput = z.infer<typeof visionOutputSchema>;
export type LogOutput = z.infer<typeof logOutputSchema>;
export type ApiOutput = z.infer<typeof apiOutputSchema>;
export type DbOutput = z.infer<typeof dbOutputSchema>;
export type RcaOutput = z.infer<typeof rcaOutputSchema>;
export type RegressionTestOutput = z.infer<typeof regressionTestOutputSchema>;
export type ReleaseRiskOutput = z.infer<typeof releaseRiskOutputSchema>;
export type DemoNarratorOutput = z.infer<typeof demoNarratorOutputSchema>;
export type AgentRun = z.infer<typeof agentRunSchema>;
export type FinalIncidentPackage = z.infer<typeof finalIncidentPackageSchema>;
