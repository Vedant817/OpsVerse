"use client";

import {
  AlertTriangle,
  Boxes,
  ClipboardCheck,
  Database,
  FileJson,
  FileText,
  GitBranch,
  ImagePlus,
  Loader2,
  Network,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Upload,
  Video,
} from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { AgentGraph } from "@/components/agent-graph";
import { ResultTabs } from "@/components/result-tabs";
import type { FinalIncidentPackage } from "@/lib/cerebras/schemas";
import type { IncidentSample } from "@/lib/samples";

type EvidenceFormState = {
  title: string;
  module: string;
  screenshotNote: string;
  videoNote: string;
  logs: string;
  apiResponse: string;
  dbSnapshot: string;
  gitDiff: string;
};

type EvidenceUploaderProps = {
  samples: IncidentSample[];
};

type SwarmApiResponse = {
  ok: boolean;
  error: string | null;
  result?: FinalIncidentPackage;
  persistence?: {
    enabled: boolean;
    incident_id: string | null;
    saved_agent_runs: boolean;
    saved_speed_benchmark: boolean;
    error: string | null;
  };
};

const emptyForm: EvidenceFormState = {
  title: "",
  module: "",
  screenshotNote: "",
  videoNote: "",
  logs: "",
  apiResponse: "",
  dbSnapshot: "",
  gitDiff: "",
};

const requiredFields: Array<keyof EvidenceFormState> = [
  "title",
  "module",
  "logs",
  "apiResponse",
  "dbSnapshot",
];

function sampleToForm(sample: IncidentSample): EvidenceFormState {
  return {
    title: sample.title,
    module: sample.module,
    screenshotNote: sample.screenshotNote,
    videoNote: sample.videoNote,
    logs: sample.logs,
    apiResponse: sample.apiResponse,
    dbSnapshot: sample.dbSnapshot,
    gitDiff: sample.gitDiff,
  };
}

function countFilledEvidence(form: EvidenceFormState, screenshotName: string) {
  return [
    form.screenshotNote || screenshotName,
    form.videoNote,
    form.logs,
    form.apiResponse,
    form.dbSnapshot,
    form.gitDiff,
  ].filter((value) => value.trim().length > 0).length;
}

function formatFieldName(field: keyof EvidenceFormState) {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function EvidenceUploader({ samples }: EvidenceUploaderProps) {
  const [form, setForm] = useState<EvidenceFormState>(emptyForm);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState("");
  const [videoName, setVideoName] = useState("");
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitState, setSubmitState] = useState<
    "idle" | "validating" | "running" | "complete" | "failed"
  >("idle");
  const [runResult, setRunResult] = useState<SwarmApiResponse | null>(null);
  const [runError, setRunError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const filledEvidenceCount = useMemo(
    () => countFilledEvidence(form, screenshotName),
    [form, screenshotName],
  );

  const selectedSample = samples.find((sample) => sample.id === selectedSampleId);
  const runPackage = runResult?.result ?? null;

  function updateField(field: keyof EvidenceFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setSubmitState("idle");
  }

  function loadSample(sample: IncidentSample) {
    setForm(sampleToForm(sample));
    setSelectedSampleId(sample.id);
    setScreenshotName(`${sample.id}.synthetic.png`);
    setVideoName(`${sample.id}-frames.synthetic`);
    setValidationErrors([]);
    setSubmitState("idle");
    setRunResult(null);
    setRunError("");
  }

  function resetForm() {
    setForm(emptyForm);
    setSelectedSampleId(null);
    setScreenshotName("");
    setVideoName("");
    setValidationErrors([]);
    setSubmitState("idle");
    setRunResult(null);
    setRunError("");
  }

  function focusForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validateForm() {
    const missing = requiredFields.filter(
      (field) => form[field].trim().length === 0,
    );
    const errors = missing.map((field) => `${formatFieldName(field)} is required`);

    if (!form.screenshotNote.trim() && !screenshotName) {
      errors.push("Screenshot evidence is required");
    }

    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("validating");
    setRunResult(null);
    setRunError("");

    const errors = validateForm();
    setValidationErrors(errors);

    if (errors.length > 0) {
      setSubmitState("idle");
      return;
    }

    setSubmitState("running");

    try {
      const response = await fetch("/api/agents/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as SwarmApiResponse;

      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Incident swarm request failed.";

        setRunError(message);
        setRunResult(payload);
        setSubmitState("failed");
        return;
      }

      setRunResult(payload);
      setSubmitState("complete");
    } catch (error) {
      setRunError(
        error instanceof Error
          ? error.message
          : "Incident swarm request failed.",
      );
      setSubmitState("failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#161616]">
      <section className="border-b border-[#d9d7c9] bg-[#111111] text-[#f7f7f2]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 md:grid-cols-[minmax(0,1fr)_360px] md:px-8">
          <div className="space-y-7">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#d8d6c8]">
              <span className="inline-flex items-center gap-2 rounded border border-[#4c4b45] px-3 py-1">
                <Network size={16} aria-hidden="true" />
                Gemma 4 on Cerebras
              </span>
              <span className="inline-flex items-center gap-2 rounded border border-[#4c4b45] px-3 py-1">
                <ShieldAlert size={16} aria-hidden="true" />
                Synthetic evidence only
              </span>
            </div>

            <div className="max-w-3xl space-y-4">
              <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
                OpsVerse
              </h1>
              <p className="max-w-2xl text-xl leading-8 text-[#e5e2d5]">
                Multimodal Incident Swarm for Enterprise Apps
              </p>
              <p className="max-w-3xl text-base leading-7 text-[#c9c6ba]">
                Upload a screenshot, logs, API response, and DB snapshot. The
                server runs the text-agent swarm through Cerebras and returns
                structured RCA, test, and release-gate output.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadSample(samples[0])}
                className="inline-flex h-11 items-center gap-2 rounded bg-[#f4c95d] px-4 text-sm font-semibold text-[#15120a] transition hover:bg-[#ffd86f]"
              >
                <Play size={17} aria-hidden="true" />
                Run Demo Incident
              </button>
              <button
                type="button"
                onClick={focusForm}
                className="inline-flex h-11 items-center gap-2 rounded border border-[#6b6a61] px-4 text-sm font-semibold text-[#f7f7f2] transition hover:bg-[#202020]"
              >
                <Upload size={17} aria-hidden="true" />
                Upload Evidence
              </button>
              <button
                type="button"
                onClick={() => setShowArchitecture((visible) => !visible)}
                className="inline-flex h-11 items-center gap-2 rounded border border-[#6b6a61] px-4 text-sm font-semibold text-[#f7f7f2] transition hover:bg-[#202020]"
              >
                <Boxes size={17} aria-hidden="true" />
                View Architecture
              </button>
            </div>
          </div>

          <div className="grid gap-3 self-end">
            {[
              ["Multimodal RCA", "Screenshot, logs, API, DB, diff"],
              ["Agent Swarm", "Vision, Log, API, DB, RCA, Test, Release"],
              ["Release-Ready Output", "Jira, SQL, regression tests, gate"],
            ].map(([title, detail]) => (
              <div
                key={title}
                className="rounded border border-[#3d3c37] bg-[#1b1b1a] p-4"
              >
                <p className="text-sm font-semibold text-[#f7f7f2]">{title}</p>
                <p className="mt-1 text-sm text-[#b9b6aa]">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[280px_minmax(0,1fr)] md:px-8">
        <aside className="space-y-4">
          <div className="rounded border border-[#d6d1bf] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase text-[#555044]">
                Samples
              </h2>
              <Sparkles size={17} className="text-[#116d6e]" aria-hidden="true" />
            </div>
            <div className="grid gap-2">
              {samples.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => loadSample(sample)}
                  className={`rounded border px-3 py-3 text-left text-sm transition ${
                    selectedSampleId === sample.id
                      ? "border-[#116d6e] bg-[#e9f7f6]"
                      : "border-[#d6d1bf] bg-[#fbfaf5] hover:border-[#116d6e]"
                  }`}
                >
                  <span className="block font-semibold">{sample.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#5f5b50]">
                    {sample.module}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded border border-[#d6d1bf] bg-white p-4">
            <h2 className="text-sm font-semibold uppercase text-[#555044]">
              Evidence State
            </h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-[#625d52]">Artifacts</dt>
                <dd className="font-mono text-[#111111]">{filledEvidenceCount}/6</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#625d52]">Sample</dt>
                <dd className="max-w-32 truncate text-right font-mono text-[#111111]">
                  {selectedSample?.id ?? "manual"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[#625d52]">Swarm</dt>
                <dd className="font-mono text-[#155e57]">server route</dd>
              </div>
            </dl>
          </div>
        </aside>

        <div className="space-y-6">
          {showArchitecture ? (
            <section className="rounded border border-[#d6d1bf] bg-white p-5">
              <h2 className="text-lg font-semibold">Architecture Path</h2>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                {["Intake API", "Evidence Parser", "Agent Orchestrator", "Dashboard"].map(
                  (step) => (
                    <div
                      key={step}
                      className="rounded border border-[#d6d1bf] bg-[#fbfaf5] p-3 font-mono"
                    >
                      {step}
                    </div>
                  ),
                )}
              </div>
            </section>
          ) : null}

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="rounded border border-[#d6d1bf] bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2decf] p-5">
              <div>
                <h2 className="text-xl font-semibold">Incident Intake</h2>
                <p className="mt-1 text-sm text-[#625d52]">
                  Evidence stays editable after loading a sample.
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-10 items-center gap-2 rounded border border-[#d6d1bf] px-3 text-sm font-semibold hover:bg-[#f5f2e8]"
              >
                <RotateCcw size={16} aria-hidden="true" />
                Reset
              </button>
            </div>

            <div className="grid gap-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  Incident title
                  <input
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    className="h-11 rounded border border-[#cfcab8] px-3 font-normal outline-none focus:border-[#116d6e]"
                    placeholder="Unable to move from cart to order summary"
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Module / service
                  <input
                    value={form.module}
                    onChange={(event) => updateField("module", event.target.value)}
                    className="h-11 rounded border border-[#cfcab8] px-3 font-normal outline-none focus:border-[#116d6e]"
                    placeholder="Direct Orders"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  Screenshot upload
                  <span className="flex min-h-11 items-center gap-3 rounded border border-dashed border-[#cfcab8] px-3 font-normal text-[#625d52]">
                    <ImagePlus size={17} aria-hidden="true" />
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="w-full text-sm"
                      onChange={(event) =>
                        setScreenshotName(event.target.files?.[0]?.name ?? "")
                      }
                    />
                  </span>
                  {screenshotName ? (
                    <span className="font-mono text-xs text-[#116d6e]">
                      {screenshotName}
                    </span>
                  ) : null}
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Video or frame upload
                  <span className="flex min-h-11 items-center gap-3 rounded border border-dashed border-[#cfcab8] px-3 font-normal text-[#625d52]">
                    <Video size={17} aria-hidden="true" />
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime"
                      className="w-full text-sm"
                      onChange={(event) =>
                        setVideoName(event.target.files?.[0]?.name ?? "")
                      }
                    />
                  </span>
                  {videoName ? (
                    <span className="font-mono text-xs text-[#116d6e]">
                      {videoName}
                    </span>
                  ) : null}
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold">
                Screenshot / frame notes
                <textarea
                  value={form.screenshotNote}
                  onChange={(event) =>
                    updateField("screenshotNote", event.target.value)
                  }
                  className="min-h-24 resize-y rounded border border-[#cfcab8] p-3 font-mono text-sm font-normal outline-none focus:border-[#116d6e]"
                />
              </label>

              <div className="grid gap-4 lg:grid-cols-2">
                <EvidenceTextArea
                  icon={<FileText size={17} aria-hidden="true" />}
                  label="Logs"
                  value={form.logs}
                  onChange={(value) => updateField("logs", value)}
                />
                <EvidenceTextArea
                  icon={<FileJson size={17} aria-hidden="true" />}
                  label="API response"
                  value={form.apiResponse}
                  onChange={(value) => updateField("apiResponse", value)}
                />
                <EvidenceTextArea
                  icon={<Database size={17} aria-hidden="true" />}
                  label="DB snapshot"
                  value={form.dbSnapshot}
                  onChange={(value) => updateField("dbSnapshot", value)}
                />
                <EvidenceTextArea
                  icon={<GitBranch size={17} aria-hidden="true" />}
                  label="Git diff"
                  value={form.gitDiff}
                  onChange={(value) => updateField("gitDiff", value)}
                  optional
                />
              </div>

              {validationErrors.length > 0 ? (
                <div className="rounded border border-[#f0b89d] bg-[#fff4ed] p-4 text-sm text-[#9a3412]">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle size={17} aria-hidden="true" />
                    Validation failed
                  </div>
                  <ul className="mt-2 list-inside list-disc">
                    {validationErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {submitState === "complete" ? (
                <div className="rounded border border-[#b8d9d4] bg-[#effaf8] p-4 text-sm text-[#155e57]">
                  <div className="flex items-center gap-2 font-semibold">
                    <ClipboardCheck size={17} aria-hidden="true" />
                    Incident swarm complete
                  </div>
                  <p className="mt-2 leading-6">
                    The server returned structured agent output from the live
                    route.
                  </p>
                  {runResult?.persistence?.incident_id ? (
                    <a
                      href={`/dashboard/${runResult.persistence.incident_id}`}
                      className="mt-3 inline-flex h-10 items-center rounded border border-[#b8d9d4] px-3 text-sm font-semibold hover:bg-[#dff7f3]"
                    >
                      Open persisted dashboard
                    </a>
                  ) : null}
                </div>
              ) : null}

              {submitState === "failed" ? (
                <div className="rounded border border-[#f0b89d] bg-[#fff4ed] p-4 text-sm text-[#9a3412]">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle size={17} aria-hidden="true" />
                    Incident swarm failed
                  </div>
                  <p className="mt-2 leading-6">{runError}</p>
                  {runResult ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-semibold">
                        Raw route response
                      </summary>
                      <pre className="mt-3 max-h-72 overflow-auto rounded bg-[#3b1f16] p-3 text-xs leading-5 text-[#ffe7dd]">
                        {JSON.stringify(runResult, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2decf] pt-5">
                <p className="text-sm text-[#625d52]">
                  {selectedSample
                    ? `${selectedSample.label} loaded as synthetic evidence.`
                    : "Manual evidence mode."}
                </p>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center gap-2 rounded bg-[#116d6e] px-4 text-sm font-semibold text-white transition hover:bg-[#0d5d5f]"
                >
                  {submitState === "validating" || submitState === "running" ? (
                    <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                  ) : (
                    <Play size={17} aria-hidden="true" />
                  )}
                  {submitState === "running" ? "Running Swarm" : "Run Incident Swarm"}
                </button>
              </div>
            </div>
          </form>

          {submitState === "running" || runPackage ? (
            <AgentGraph
              result={runPackage}
              isRunning={submitState === "running"}
            />
          ) : null}

          {runPackage ? <ResultTabs result={runPackage} /> : null}
        </div>
      </section>
    </main>
  );
}

function EvidenceTextArea({
  icon,
  label,
  value,
  onChange,
  optional = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      <span className="flex items-center gap-2">
        {icon}
        {label}
        {optional ? (
          <span className="font-normal text-[#777166]">optional</span>
        ) : null}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-52 resize-y rounded border border-[#cfcab8] bg-[#fffefa] p-3 font-mono text-sm font-normal leading-6 outline-none focus:border-[#116d6e]"
      />
    </label>
  );
}
