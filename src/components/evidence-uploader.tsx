"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileJson,
  FileText,
  GitBranch,
  ImagePlus,
  Loader2,
  Play,
  RotateCcw,
  ServerCog,
  Sparkles,
  Video,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AgentGraph } from "@/components/agent-graph";
import { Hero } from "@/components/hero";
import { ResultTabs } from "@/components/result-tabs";
import type { AgentRun, FinalIncidentPackage } from "@/lib/cerebras/schemas";
import type { IncidentSample } from "@/lib/samples";

type EvidenceFormState = {
  title: string;
  module: string;
  screenshotNote: string;
  screenshotDataUri: string;
  screenshotFileName: string;
  videoNote: string;
  videoFrameDataUri: string;
  videoFrameDataUris: string[];
  videoFileName: string;
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

type SwarmStreamEvent =
  | {
      type: "agent_started";
      agent_name: string;
    }
  | {
      type: "agent_completed";
      run: AgentRun;
    }
  | {
      type: "metrics_updated";
      agent_name: string;
      metrics: NonNullable<AgentRun["metrics"]>;
    }
  | {
      type: "heartbeat";
      timestamp: string;
    }
  | {
      type: "swarm_completed";
      ok: boolean;
      error: string | null;
      result: FinalIncidentPackage;
      persistence?: SwarmApiResponse["persistence"];
    }
  | {
      type: "swarm_error";
      error: string;
      detail?: string;
      missing?: string[];
      issues?: Array<{ path: string; message: string }>;
    };

type RuntimeStatus = {
  ok: boolean;
  generated_at: string;
  app: {
    public_url: string | null;
    node_env: string | null;
  };
  cerebras: {
    configured: boolean;
    model: string | null;
    model_available: boolean;
    gemma_model: boolean;
    generation_ready: boolean;
    available_models: string[];
    checked_at: string | null;
    base_url_origin: string | null;
    request_timeout_ms: number | null;
    retry_attempts: number | null;
    retry_backoff_ms: number | null;
    agent_concurrency: number;
    missing: string[];
    note: string;
  };
  supabase: {
    configured: boolean;
    url_origin: string | null;
    missing: string[];
    note: string;
  };
  baseline: {
    enabled: boolean;
    configured: boolean;
    provider: "gemini";
    model: string;
    missing: string[];
    note: string;
  };
  local_agent_mode: {
    enabled: boolean;
    value: string;
    note: string;
  };
};

const emptyForm: EvidenceFormState = {
  title: "",
  module: "",
  screenshotNote: "",
  screenshotDataUri: "",
  screenshotFileName: "",
  videoNote: "",
  videoFrameDataUri: "",
  videoFrameDataUris: [],
  videoFileName: "",
  logs: "",
  apiResponse: "",
  dbSnapshot: "",
  gitDiff: "",
};

const requiredFields = [
  "title",
  "module",
  "logs",
  "apiResponse",
  "dbSnapshot",
] as const satisfies ReadonlyArray<keyof EvidenceFormState>;

const imageMimeTypes = ["image/png", "image/jpeg", "image/webp"];
const maxImageBytes = 2 * 1024 * 1024;
const maxVideoBytes = 30 * 1024 * 1024;
const extractedVideoFrameCount = 3;
const maxExtractedFrameWidth = 960;

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let currentY = y;

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (context.measureText(nextLine).width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = nextLine;
    }
  }

  if (line) {
    context.fillText(line, x, currentY);
  }

  return currentY + lineHeight;
}

function sampleScreenshotDataUri(sample: IncidentSample) {
  if (sample.id !== "cart-summary-failure") {
    return "";
  }

  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 620;
  const context = canvas.getContext("2d");

  if (!context) {
    return "";
  }

  context.fillStyle = "#f4f2ea";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111111";
  context.fillRect(0, 0, canvas.width, 72);
  context.fillStyle = "#f7f7f2";
  context.font = "600 28px Arial";
  context.fillText(sample.module, 32, 46);
  context.font = "16px Arial";
  context.fillStyle = "#d8d6c8";
  context.fillText("Synthetic Direct Orders evidence", 760, 46);

  context.fillStyle = "#ffffff";
  context.fillRect(32, 108, 896, 410);
  context.strokeStyle = "#d6d1bf";
  context.lineWidth = 2;
  context.strokeRect(32, 108, 896, 410);

  context.fillStyle = "#161616";
  context.font = "700 32px Arial";
  context.fillText("Cart", 60, 158);
  context.font = "18px Arial";
  context.fillStyle = "#625d52";
  context.fillText("Outlet 1000023", 60, 190);

  const rows = [
    ["SKU 13321", "Case 1 / Piece 12", "confirmedQty: null"],
    ["SKU 14498", "Case 0 / Piece 6", "confirmedQty: 0"],
  ];
  rows.forEach((row, index) => {
    const y = 232 + index * 82;
    context.fillStyle = index === 0 ? "#fff4ed" : "#fbfaf5";
    context.fillRect(60, y, 840, 58);
    context.strokeStyle = index === 0 ? "#f0b89d" : "#e2decf";
    context.strokeRect(60, y, 840, 58);
    context.fillStyle = "#161616";
    context.font = "700 18px Arial";
    context.fillText(row[0], 84, y + 36);
    context.font = "16px Arial";
    context.fillStyle = "#4f4a40";
    context.fillText(row[1], 320, y + 36);
    context.fillStyle = index === 0 ? "#9a3412" : "#4f4a40";
    context.fillText(row[2], 620, y + 36);
  });

  context.fillStyle = "#116d6e";
  context.fillRect(640, 414, 260, 54);
  context.fillStyle = "#ffffff";
  context.font = "700 18px Arial";
  context.fillText("Proceed to Summary", 690, 448);

  context.fillStyle = "#fff4ed";
  context.fillRect(60, 538, 840, 48);
  context.strokeStyle = "#f0b89d";
  context.strokeRect(60, 538, 840, 48);
  context.fillStyle = "#9a3412";
  context.font = "16px Arial";
  wrapCanvasText(
    context,
    "After Proceed to Summary is selected, the cart remains visible and no frontend validation error is shown.",
    82,
    568,
    790,
    20,
  );

  return canvas.toDataURL("image/png");
}

function sampleToForm(
  sample: IncidentSample,
  screenshotDataUri = "",
): EvidenceFormState {
  return {
    title: sample.title,
    module: sample.module,
    screenshotNote: sample.screenshotNote,
    screenshotDataUri,
    screenshotFileName: `${sample.id}.synthetic.png`,
    videoNote: sample.videoNote,
    videoFrameDataUri: "",
    videoFrameDataUris: [],
    videoFileName: `${sample.id}-frames.synthetic`,
    logs: sample.logs,
    apiResponse: sample.apiResponse,
    dbSnapshot: sample.dbSnapshot,
    gitDiff: sample.gitDiff,
  };
}

function countFilledEvidence(form: EvidenceFormState, screenshotName: string) {
  return [
    form.screenshotDataUri || form.screenshotNote || screenshotName,
    form.videoFrameDataUris.length > 0
      ? "video frames"
      : form.videoFrameDataUri || form.videoNote,
    form.logs,
    form.apiResponse,
    form.dbSnapshot,
    form.gitDiff,
  ].filter((value) => value.trim().length > 0).length;
}

function fileToDataUri(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read the selected file."));
    };
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });
}

function waitForEvent(target: EventTarget, eventName: string) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(eventName, onEvent);
      target.removeEventListener("error", onError);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Unable to read the selected video file."));
    };

    target.addEventListener(eventName, onEvent, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

async function seekVideo(video: HTMLVideoElement, time: number) {
  const seeked = waitForEvent(video, "seeked");
  video.currentTime = time;
  await seeked;
}

function captureVideoFrame(video: HTMLVideoElement) {
  const width = Math.min(video.videoWidth, maxExtractedFrameWidth);
  const height = Math.max(1, Math.round((width / video.videoWidth) * video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to extract a frame from the selected video.");
  }

  context.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function extractVideoFrames(file: File) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";

  try {
    video.src = url;
    await waitForEvent(video, "loadedmetadata");

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error("Unable to read duration from the selected video.");
    }

    const timestamps = Array.from(
      { length: extractedVideoFrameCount },
      (_, index) => {
        const ratio = (index + 1) / (extractedVideoFrameCount + 1);
        return Math.min(
          Math.max(video.duration * ratio, 0.1),
          Math.max(video.duration - 0.1, 0),
        );
      },
    );
    const frames: string[] = [];

    for (const timestamp of timestamps) {
      await seekVideo(video, timestamp);
      frames.push(captureVideoFrame(video));
    }

    return frames;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
}

function formatFieldName(field: keyof EvidenceFormState) {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function replaceAgentRun(runs: AgentRun[], nextRun: AgentRun) {
  const existingIndex = runs.findIndex(
    (run) => run.agent_name === nextRun.agent_name,
  );

  if (existingIndex === -1) {
    return [...runs, nextRun];
  }

  return runs.map((run, index) => (index === existingIndex ? nextRun : run));
}

function streamErrorMessage(event: Extract<SwarmStreamEvent, { type: "swarm_error" }>) {
  if (event.issues?.length) {
    return `${event.error} ${event.issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ")}`;
  }

  if (event.missing?.length) {
    return `${event.error} Missing: ${event.missing.join(", ")}`;
  }

  return event.detail ? `${event.error} ${event.detail}` : event.error;
}

function parseSseBlock(block: string) {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  if (!data) {
    return null;
  }

  return JSON.parse(data) as SwarmStreamEvent;
}

function isEventStream(response: Response) {
  return response.headers
    .get("content-type")
    ?.toLowerCase()
    .includes("text/event-stream");
}

function statusClass(configured: boolean) {
  return configured
    ? "border-[#b8d9d4] bg-[#effaf8] text-[#155e57]"
    : "border-[#f0b89d] bg-[#fff4ed] text-[#9a3412]";
}

export function EvidenceUploader({ samples }: EvidenceUploaderProps) {
  const [form, setForm] = useState<EvidenceFormState>(emptyForm);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState("");
  const [videoName, setVideoName] = useState("");
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [showArchitecture, setShowArchitecture] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitState, setSubmitState] = useState<
    "idle" | "validating" | "running" | "complete" | "failed"
  >("idle");
  const [runResult, setRunResult] = useState<SwarmApiResponse | null>(null);
  const [runError, setRunError] = useState("");
  const [streamRuns, setStreamRuns] = useState<AgentRun[]>([]);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [streamStatus, setStreamStatus] = useState("");
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [runtimeStatusError, setRuntimeStatusError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const filledEvidenceCount = useMemo(
    () => countFilledEvidence(form, screenshotName),
    [form, screenshotName],
  );

  const selectedSample = samples.find((sample) => sample.id === selectedSampleId);
  const runPackage = runResult?.result ?? null;

  useEffect(() => {
    const controller = new AbortController();

    async function loadRuntimeStatus() {
      try {
        const response = await fetch("/api/runtime/status", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as RuntimeStatus;

        if (!response.ok) {
          throw new Error("Runtime status request failed.");
        }

        setRuntimeStatus(payload);
        setRuntimeStatusError("");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setRuntimeStatusError(
          error instanceof Error ? error.message : "Runtime status unavailable.",
        );
      }
    }

    void loadRuntimeStatus();

    return () => controller.abort();
  }, []);

  function updateField<K extends keyof EvidenceFormState>(
    field: K,
    value: EvidenceFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setSubmitState("idle");
  }

  function loadSample(sample: IncidentSample) {
    const screenshotDataUri = sampleScreenshotDataUri(sample);
    setForm(sampleToForm(sample, screenshotDataUri));
    setSelectedSampleId(sample.id);
    setScreenshotName(`${sample.id}.synthetic.png`);
    setVideoName(`${sample.id}-frames.synthetic`);
    setFileErrors([]);
    setValidationErrors([]);
    setSubmitState("idle");
    setRunResult(null);
    setRunError("");
    setStreamRuns([]);
    setActiveAgents([]);
    setStreamStatus("");
  }

  function resetForm() {
    setForm(emptyForm);
    setSelectedSampleId(null);
    setScreenshotName("");
    setVideoName("");
    setFileErrors([]);
    setValidationErrors([]);
    setSubmitState("idle");
    setRunResult(null);
    setRunError("");
    setStreamRuns([]);
    setActiveAgents([]);
    setStreamStatus("");
  }

  function focusForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validateForm() {
    const missing = requiredFields.filter(
      (field) => form[field].trim().length === 0,
    );
    const errors = missing.map((field) => `${formatFieldName(field)} is required`);

    if (!form.screenshotNote.trim() && !form.screenshotDataUri && !screenshotName) {
      errors.push("Screenshot evidence is required");
    }

    return [...errors, ...fileErrors];
  }

  async function handleImageFile(file: File | undefined, field: "screenshot" | "frame") {
    if (!file) {
      if (field === "screenshot") {
        setScreenshotName("");
        updateField("screenshotDataUri", "");
        updateField("screenshotFileName", "");
      } else {
        setVideoName("");
        updateField("videoFrameDataUri", "");
        updateField("videoFrameDataUris", []);
        updateField("videoFileName", "");
      }

      return;
    }

    const label = field === "screenshot" ? "Screenshot" : "Video frame";

    if (file.type.startsWith("video/")) {
      if (field === "screenshot") {
        const error =
          "Screenshot upload received a video file. Upload a PNG, JPEG, or WebP screenshot instead.";
        setFileErrors([error]);
        setValidationErrors([error]);
        return;
      }

      if (file.size > maxVideoBytes) {
        const error = `Video must be ${maxVideoBytes / (1024 * 1024)}MB or smaller for browser frame extraction.`;
        setFileErrors([error]);
        setValidationErrors([error]);
        return;
      }

      try {
        const frames = await extractVideoFrames(file);
        setVideoName(`${file.name} (${frames.length} frames extracted)`);
        updateField("videoFrameDataUri", frames[0] ?? "");
        updateField("videoFrameDataUris", frames);
        updateField("videoFileName", file.name);
        if (!form.videoNote.trim()) {
          updateField(
            "videoNote",
            `Extracted ${frames.length} representative frames from ${file.name}.`,
          );
        }
        setFileErrors([]);
        setValidationErrors([]);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to extract frames from the selected video.";
        setFileErrors([message]);
        setValidationErrors([message]);
      }
      return;
    }

    if (!imageMimeTypes.includes(file.type as (typeof imageMimeTypes)[number])) {
      const error = `${label} must be PNG, JPEG, or WebP.`;
      setFileErrors([error]);
      setValidationErrors([error]);
      return;
    }

    if (file.size > maxImageBytes) {
      const error = `${label} must be 2MB or smaller.`;
      setFileErrors([error]);
      setValidationErrors([error]);
      return;
    }

    const dataUri = await fileToDataUri(file);

    setFileErrors([]);
    setValidationErrors([]);

    if (field === "screenshot") {
      setScreenshotName(file.name);
      updateField("screenshotDataUri", dataUri);
      updateField("screenshotFileName", file.name);
      return;
    }

    setVideoName(file.name);
    updateField("videoFrameDataUri", dataUri);
    updateField("videoFrameDataUris", [dataUri]);
    updateField("videoFileName", file.name);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("validating");
    setRunResult(null);
    setRunError("");
    setStreamRuns([]);
    setActiveAgents([]);
    setStreamStatus("Validating evidence package.");

    const errors = validateForm();
    setValidationErrors(errors);

    if (errors.length > 0) {
      setSubmitState("idle");
      setStreamStatus("");
      return;
    }

    setSubmitState("running");
    setStreamStatus("Opening live swarm stream.");
    let sawStreamEvent = false;

    async function runJsonFallback(reason: string) {
      setStreamStatus(`${reason} Running non-stream fallback.`);
      setActiveAgents([]);
      setStreamRuns([]);

      const response = await fetch("/api/agents/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as SwarmApiResponse;
      const finalPayload: SwarmApiResponse = {
        ok: payload.ok,
        error: payload.error,
        result: payload.result,
        persistence: payload.persistence,
      };

      setRunResult(finalPayload);
      setStreamRuns(payload.result?.agent_runs ?? []);
      setStreamStatus("Non-stream fallback completed.");

      if (!response.ok || !payload.ok) {
        setRunError(
          payload.error ??
            "Incident swarm did not complete. Inspect agent runs for details.",
        );
        setSubmitState("failed");
        return;
      }

      setSubmitState("complete");
    }

    try {
      const response = await fetch("/api/agents/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.body || !isEventStream(response)) {
        await runJsonFallback("Live stream transport is unavailable.");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json()) as SwarmApiResponse;
        const message = payload.error ?? "Incident swarm request failed.";

        setRunError(message);
        setRunResult({
          ok: false,
          error: message,
          result: payload.result,
          persistence: payload.persistence,
        });
        setSubmitState("failed");
        return;
      }

      const decoder = new TextDecoder();
      const reader = response.body.getReader();
      let buffer = "";
      let finalPayload: SwarmApiResponse | null = null;

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });

        const blocks = buffer.split(/\n\n|\r\n\r\n/);
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const streamEvent = parseSseBlock(block);

          if (!streamEvent) {
            continue;
          }

          sawStreamEvent = true;

          if (streamEvent.type === "agent_started") {
            setActiveAgents((current) =>
              current.includes(streamEvent.agent_name)
                ? current
                : [...current, streamEvent.agent_name],
            );
            setStreamStatus(`${streamEvent.agent_name} started.`);
          } else if (streamEvent.type === "agent_completed") {
            setActiveAgents((current) =>
              current.filter((agentName) => agentName !== streamEvent.run.agent_name),
            );
            setStreamRuns((current) => replaceAgentRun(current, streamEvent.run));
            setStreamStatus(
              `${streamEvent.run.agent_name} ${streamEvent.run.status}.`,
            );
          } else if (streamEvent.type === "metrics_updated") {
            setStreamRuns((current) =>
              current.map((run) =>
                run.agent_name === streamEvent.agent_name
                  ? { ...run, metrics: streamEvent.metrics }
                  : run,
              ),
            );
            setStreamStatus(`${streamEvent.agent_name} metrics updated.`);
          } else if (streamEvent.type === "heartbeat") {
            setStreamStatus(`Live stream active at ${streamEvent.timestamp}.`);
          } else if (streamEvent.type === "swarm_completed") {
            finalPayload = {
              ok: streamEvent.ok,
              error: streamEvent.error,
              result: streamEvent.result,
              persistence: streamEvent.persistence,
            };
            setRunResult(finalPayload);
            setStreamRuns(streamEvent.result.agent_runs);
            setActiveAgents([]);
            setStreamStatus("Incident swarm stream closed.");
          } else if (streamEvent.type === "swarm_error") {
            throw new Error(streamErrorMessage(streamEvent));
          }
        }

        if (done) {
          break;
        }
      }

      if (!finalPayload) {
        throw new Error("Incident swarm stream ended before a final package arrived.");
      }

      if (!finalPayload.ok) {
        setRunError(
          finalPayload.error ??
            "Incident swarm did not complete. Inspect agent runs for details.",
        );
        setSubmitState("failed");
        return;
      }

      setSubmitState("complete");
    } catch (error) {
      if (!sawStreamEvent) {
        try {
          await runJsonFallback(
            error instanceof Error
              ? `Live stream failed before events: ${error.message}`
              : "Live stream failed before events.",
          );
          return;
        } catch (fallbackError) {
          setRunError(
            fallbackError instanceof Error
              ? fallbackError.message
              : "Incident swarm fallback request failed.",
          );
        }
      } else {
        setRunError(
          error instanceof Error
            ? error.message
            : "Incident swarm request failed.",
        );
      }
      setActiveAgents([]);
      setSubmitState("failed");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#161616]">
      <Hero
        architectureVisible={showArchitecture}
        onRunDemo={() => loadSample(samples[0])}
        onUploadEvidence={focusForm}
        onToggleArchitecture={() => setShowArchitecture((visible) => !visible)}
      />

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
                <dd className="font-mono text-[#155e57]">SSE route</dd>
              </div>
            </dl>
          </div>

          <RuntimeStatusPanel
            status={runtimeStatus}
            error={runtimeStatusError}
          />
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
                        void handleImageFile(event.target.files?.[0], "screenshot")
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
                        void handleImageFile(event.target.files?.[0], "frame")
                      }
                    />
                  </span>
                  {videoName ? (
                    <span className="font-mono text-xs text-[#116d6e]">
                      {videoName}
                    </span>
                  ) : null}
                  {form.videoFrameDataUris.length > 0 ? (
                    <span className="text-xs font-normal text-[#625d52]">
                      {form.videoFrameDataUris.length} representative frame
                      {form.videoFrameDataUris.length === 1 ? "" : "s"} ready for
                      Vision.
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
                    {runPackage?.runtime?.mode === "local_demo"
                      ? "The server streamed the explicitly enabled local deterministic demo mode and returned structured output derived from the submitted evidence."
                      : "The server streamed real agent events and returned structured output from the live route."}
                  </p>
                  {runPackage?.runtime ? (
                    <p className="mt-2 rounded border border-[#b8d9d4] bg-white/70 p-3 text-xs leading-5">
                      <span className="font-semibold">{runPackage.runtime.label}:</span>{" "}
                      {runPackage.runtime.note}
                    </p>
                  ) : null}
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

              {submitState === "running" && streamStatus ? (
                <div className="rounded border border-[#b9c9e8] bg-[#eef4ff] p-4 text-sm text-[#244f86]">
                  <div className="flex items-center gap-2 font-semibold">
                    <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                    Live swarm stream
                  </div>
                  <p className="mt-2 font-mono text-xs">{streamStatus}</p>
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
                  disabled={submitState === "running" || submitState === "validating"}
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
              runs={runPackage ? undefined : streamRuns}
              activeAgents={activeAgents}
              isRunning={submitState === "running"}
            />
          ) : null}

          {runPackage ? <ResultTabs result={runPackage} /> : null}
        </div>
      </section>
    </main>
  );
}

function RuntimeStatusPanel({
  status,
  error,
}: {
  status: RuntimeStatus | null;
  error: string;
}) {
  return (
    <div className="rounded border border-[#d6d1bf] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase text-[#555044]">
          Runtime
        </h2>
        <ServerCog size={17} className="text-[#116d6e]" aria-hidden="true" />
      </div>

      {error ? (
        <div className="rounded border border-[#f0b89d] bg-[#fff4ed] p-3 text-xs leading-5 text-[#9a3412]">
          {error}
        </div>
      ) : null}

      {!status && !error ? (
        <div className="flex items-center gap-2 rounded border border-[#d6d1bf] bg-[#fbfaf5] p-3 text-xs text-[#625d52]">
          <Loader2 className="animate-spin" size={15} aria-hidden="true" />
          Checking runtime status
        </div>
      ) : null}

      {status ? (
        <div className="grid gap-3 text-xs">
          <RuntimeStatusRow
            label="Cerebras"
            configured={status.cerebras.generation_ready}
            detail={
              status.cerebras.generation_ready
                ? `${status.cerebras.model ?? "Gemma model"} available`
                : status.cerebras.configured
                  ? status.cerebras.gemma_model
                    ? `${status.cerebras.model ?? "configured Gemma model"} unavailable; available: ${
                        status.cerebras.available_models.join(", ") || "none returned"
                      }`
                    : `${status.cerebras.model ?? "configured model"} is not Gemma`
                  : `Missing ${
                      status.cerebras.missing.join(", ") || "configuration"
                    }`
            }
          />
          <RuntimeStatusRow
            label="Supabase"
            configured={status.supabase.configured}
            detail={
              status.supabase.configured
                ? `${status.supabase.url_origin ?? "configured"}; not verified`
                : `Missing ${status.supabase.missing.join(", ") || "configuration"}`
            }
          />
          <RuntimeStatusRow
            label="Gemini"
            configured={!status.baseline.enabled || status.baseline.configured}
            detail={
              status.baseline.enabled
                ? status.baseline.configured
                  ? `${status.baseline.model} baseline ready`
                  : `Missing ${status.baseline.missing.join(", ") || "configuration"}`
                : "baseline disabled"
            }
          />
          <RuntimeStatusRow
            label="Local demo"
            configured={status.local_agent_mode.enabled}
            neutral={!status.local_agent_mode.enabled}
            detail={
              status.local_agent_mode.enabled
                ? "enabled; deterministic evidence-derived output"
                : "disabled; live Cerebras path required"
            }
          />
          <div className="rounded border border-[#e2decf] bg-[#fbfaf5] p-3">
            <p className="font-semibold text-[#555044]">App URL</p>
            <p className="mt-1 truncate font-mono text-[#161616]">
              {status.app.public_url ?? "not set"}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RuntimeStatusRow({
  label,
  configured,
  neutral = false,
  detail,
}: {
  label: string;
  configured: boolean;
  neutral?: boolean;
  detail: string;
}) {
  return (
    <div
      className={`rounded border p-3 ${
        neutral ? "border-[#e2decf] bg-[#fbfaf5] text-[#625d52]" : statusClass(configured)
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{label}</span>
        {configured ? (
          <CheckCircle2 size={15} aria-hidden="true" />
        ) : (
          <AlertTriangle size={15} aria-hidden="true" />
        )}
      </div>
      <p className="mt-1 truncate font-mono">{detail}</p>
    </div>
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
