import { incidentEvidenceSchema } from "@/lib/cerebras/schemas";
import { incidentSamples, primaryIncidentSample } from "@/lib/samples";
import type { IncidentSample } from "@/lib/samples";

type PreflightStatus = "pass" | "warn" | "block";

type ModelReadiness = {
  ready: boolean;
  available: boolean;
  gemmaModel: boolean;
  availableModels: string[];
  checkedAt: string;
};

type LocalAgentModeState = {
  enabled: boolean;
  value: string;
};

type CerebrasState = {
  configured: boolean;
  model: string | null;
  missing: string[];
  error: string | null;
};

type PreflightCheck = {
  id: string;
  label: string;
  status: PreflightStatus;
  detail: string;
};

type SamplePreflight = {
  id: string;
  label: string;
  module: string;
  ready: boolean;
  evidence_count: number;
  missing: string[];
  signals: string[];
};

function sampleToEvidence(sample: IncidentSample) {
  return {
    title: sample.title,
    module: sample.module,
    screenshotNote: sample.screenshotNote,
    screenshotDataUri: "",
    screenshotFileName: "",
    videoNote: sample.videoNote,
    videoFrameDataUri: "",
    videoFrameDataUris: [],
    videoFileName: "",
    logs: sample.logs,
    apiResponse: sample.apiResponse,
    dbSnapshot: sample.dbSnapshot,
    gitDiff: sample.gitDiff,
  };
}

function countEvidence(sample: IncidentSample) {
  return [
    sample.screenshotNote,
    sample.videoNote,
    sample.logs,
    sample.apiResponse,
    sample.dbSnapshot,
    sample.gitDiff,
  ].filter((value) => value.trim().length > 0).length;
}

function sampleSignals(sample: IncidentSample) {
  const joined = [
    sample.title,
    sample.module,
    sample.logs,
    sample.apiResponse,
    sample.dbSnapshot,
    sample.gitDiff,
  ].join("\n");

  return [
    joined.includes("/api/cart/summary") ? "cart summary API" : null,
    joined.includes("422") ? "HTTP 422 validation failure" : null,
    joined.includes("confirmedQty") || joined.includes("confirmed_qty")
      ? "confirmed quantity field"
      : null,
    joined.includes("req-8f32") ? "correlation id req-8f32" : null,
    joined.includes("13321") && joined.includes("14498")
      ? "primary SKU pair"
      : null,
    joined.includes("confirmedQty: item.confirmedQty ?? 0")
      ? "removed fallback diff"
      : null,
  ].filter((signal): signal is string => signal !== null);
}

function validateSample(sample: IncidentSample): SamplePreflight {
  const evidence = sampleToEvidence(sample);
  const parsed = incidentEvidenceSchema.safeParse(evidence);
  const missing = parsed.success
    ? []
    : parsed.error.issues.map((issue) => issue.path.join("."));

  return {
    id: sample.id,
    label: sample.label,
    module: sample.module,
    ready: parsed.success,
    evidence_count: countEvidence(sample),
    missing,
    signals: sampleSignals(sample),
  };
}

function statusCounts(checks: PreflightCheck[]) {
  return {
    pass: checks.filter((check) => check.status === "pass").length,
    warn: checks.filter((check) => check.status === "warn").length,
    block: checks.filter((check) => check.status === "block").length,
  };
}

export async function buildRuntimePreflight({
  cerebrasState,
  localAgentMode,
  modelReadiness,
  persistenceConfigured = false,
}: {
  cerebrasState?: CerebrasState;
  localAgentMode?: LocalAgentModeState;
  modelReadiness?: ModelReadiness;
  persistenceConfigured?: boolean;
} = {}) {
  const checks: PreflightCheck[] = [];
  const samples = incidentSamples.map(validateSample);
  const primary = samples.find((sample) => sample.id === primaryIncidentSample.id);
  const localMode = localAgentMode ?? {
    enabled: false,
    value: "disabled",
  };
  const allSamplesReady = samples.every((sample) => sample.ready);
  const primarySignals = primary?.signals ?? [];
  const primaryHasExpectedSignals =
    primarySignals.includes("cart summary API") &&
    primarySignals.includes("HTTP 422 validation failure") &&
    primarySignals.includes("confirmed quantity field") &&
    primarySignals.includes("primary SKU pair");

  checks.push({
    id: "samples_valid",
    label: "Bundled sample evidence validates",
    status: allSamplesReady ? "pass" : "block",
    detail: allSamplesReady
      ? `${samples.length} synthetic samples pass the incident evidence schema.`
      : "At least one bundled sample is missing required incident evidence.",
  });
  checks.push({
    id: "primary_sample_signals",
    label: "Primary sample keeps required demo signals",
    status: primaryHasExpectedSignals ? "pass" : "block",
    detail: primaryHasExpectedSignals
      ? `Primary sample includes ${primarySignals.join(", ")}.`
      : "Primary sample is missing required cart summary, HTTP 422, quantity, or SKU signals.",
  });
  checks.push({
    id: "local_demo_mode",
    label: "Local deterministic demo mode",
    status: localMode.enabled ? "warn" : "pass",
    detail: localMode.enabled
      ? "Enabled. Output is evidence-derived local demo output and must not be claimed as live Gemma/Cerebras execution."
      : "Disabled. Swarm routes use the live Cerebras path when provider configuration is ready.",
  });

  let liveAiReady = false;
  let liveAiDetail = "";
  const cerebras = cerebrasState ?? {
    configured: false,
    model: null,
    missing: ["CEREBRAS_API_KEY"],
    error:
      "Cerebras runtime state was not injected. The API route must provide server-only env readiness.",
  };

  if (!cerebras.configured) {
    liveAiDetail =
      cerebras.error ??
      `Missing ${cerebras.missing.join(", ") || "Cerebras configuration"}.`;
  } else if (!modelReadiness) {
    liveAiDetail = "Cerebras is configured, but model availability was not checked.";
  } else {
    const readiness = modelReadiness;
    liveAiReady = readiness.ready;
    liveAiDetail = readiness.ready
      ? `${cerebras.model ?? "Configured Gemma model"} is configured and available.`
      : readiness.gemmaModel
        ? `${cerebras.model ?? "Configured Gemma model"} is configured but unavailable for this key. Available models: ${
            readiness.availableModels.join(", ") || "none returned"
          }.`
        : `${cerebras.model ?? "Configured model"} is configured but is not a Gemma model.`;
  }

  checks.push({
    id: "live_ai_ready",
    label: "Live Cerebras Gemma path",
    status: liveAiReady ? "pass" : localMode.enabled ? "warn" : "block",
    detail: liveAiDetail,
  });

  checks.push({
    id: "persistence_ready",
    label: "Supabase persistence",
    status: persistenceConfigured ? "pass" : "warn",
    detail: persistenceConfigured
      ? "Supabase env values are present. Run a live insert/select before claiming persisted dashboard refresh."
      : "Supabase is not configured. Runs can complete, but dashboard refresh persistence remains unavailable.",
  });

  const counts = statusCounts(checks);
  const canRunPrimarySample =
    allSamplesReady && primaryHasExpectedSignals && (liveAiReady || localMode.enabled);

  return {
    ok: counts.block === 0,
    generated_at: new Date().toISOString(),
    mode: localMode.enabled ? "local_demo" : "live_cerebras",
    summary: {
      can_run_primary_sample: canRunPrimarySample,
      ready_for_live_ai: liveAiReady,
      local_demo_enabled: localMode.enabled,
      persistence_configured: persistenceConfigured,
      sample_count: samples.length,
      checks: counts,
    },
    checks,
    samples,
  };
}

export type RuntimePreflight = Awaited<ReturnType<typeof buildRuntimePreflight>>;
