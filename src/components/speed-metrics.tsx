"use client";

import { Gauge, Loader2, Timer, Zap } from "lucide-react";
import { useState } from "react";
import type { AgentRun } from "@/lib/cerebras/schemas";

type SpeedMetricsProps = {
  agentRuns: AgentRun[];
};

type BaselineResult =
  | null
  | {
      enabled: boolean;
      configured: boolean;
      provider: "gemini";
      status: "disabled" | "missing_config" | "complete" | "failed";
      model: string;
      note?: string;
      missing?: string[];
      error?: string;
      statusCode?: number | null;
      content?: string;
      metrics?: {
        latencyMs: number;
        promptTokens: number | null;
        completionTokens: number | null;
        totalTokens: number | null;
        tokensPerSecond: number | null;
      };
    };

type BenchmarkResponse = {
  ok: boolean;
  error?: string;
  detail?: string;
  provider?: "cerebras";
  model?: string;
  metrics?: {
    latencyMs: number;
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
    tokensPerSecond: number | null;
  };
  baseline?: BaselineResult;
};

function metricRuns(agentRuns: AgentRun[]) {
  return agentRuns.filter((run) => run.status === "complete" && run.metrics);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function formatNumber(value: number | null | undefined, suffix = "") {
  if (typeof value !== "number") {
    return "n/a";
  }

  return `${Number.isInteger(value) ? value : value.toFixed(2)}${suffix}`;
}

function ttftFromTimeInfo(timeInfo: unknown): number | null {
  if (typeof timeInfo !== "object" || timeInfo === null) {
    return null;
  }

  const record = timeInfo as Record<string, unknown>;
  for (const key of ["ttft", "time_to_first_token", "timeToFirstTokenMs"]) {
    const value = record[key];

    if (typeof value === "number") {
      return value;
    }
  }

  return null;
}

export function SpeedMetrics({ agentRuns }: SpeedMetricsProps) {
  const [benchmark, setBenchmark] = useState<BenchmarkResponse | null>(null);
  const [benchmarkError, setBenchmarkError] = useState("");
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const completedRuns = metricRuns(agentRuns);
  const totalLatencyMs = sum(
    completedRuns.map((run) => run.metrics?.latencyMs ?? 0),
  );
  const totalTokens = sum(completedRuns.map((run) => run.metrics?.totalTokens ?? 0));
  const tokenSpeeds = completedRuns
    .map((run) => run.metrics?.tokensPerSecond)
    .filter((value): value is number => typeof value === "number");
  const averageTokensPerSecond =
    tokenSpeeds.length > 0 ? sum(tokenSpeeds) / tokenSpeeds.length : null;
  const sortedByLatency = [...completedRuns].sort(
    (a, b) => (a.metrics?.latencyMs ?? 0) - (b.metrics?.latencyMs ?? 0),
  );
  const fastest = sortedByLatency[0];
  const slowest = sortedByLatency[sortedByLatency.length - 1];
  const ttft = completedRuns
    .map((run) => ttftFromTimeInfo(run.metrics?.timeInfo))
    .find((value): value is number => typeof value === "number");

  async function runBenchmark() {
    setIsBenchmarking(true);
    setBenchmarkError("");

    try {
      const response = await fetch("/api/benchmark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includeBaseline: true,
          prompt:
            "Return one concise sentence confirming live OpsVerse benchmark connectivity.",
        }),
      });
      const body = (await response.json()) as BenchmarkResponse;
      setBenchmark(body);
      if (!response.ok) {
        setBenchmarkError(body.error || "Benchmark request failed.");
      }
    } catch (error) {
      setBenchmarkError(
        error instanceof Error ? error.message : "Benchmark request failed.",
      );
    } finally {
      setIsBenchmarking(false);
    }
  }

  return (
    <section className="rounded border border-[#d6d1bf] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Cerebras Speed Metrics</h2>
          <p className="mt-1 text-sm text-[#625d52]">
            Values are calculated only from completed live agent calls.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded border border-[#d6d1bf] px-3 py-1 text-sm font-semibold text-[#116d6e]">
          <Zap size={16} aria-hidden="true" />
          Gemma 4
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MetricCard
          icon={<Timer size={17} aria-hidden="true" />}
          label="Total agent time"
          value={formatNumber(totalLatencyMs || null, "ms")}
        />
        <MetricCard
          icon={<Gauge size={17} aria-hidden="true" />}
          label="Avg tokens/sec"
          value={formatNumber(averageTokensPerSecond)}
        />
        <MetricCard label="Total tokens" value={formatNumber(totalTokens || null)} />
        <MetricCard label="TTFT" value={formatNumber(ttft, "ms")} />
        <MetricCard label="Fastest agent" value={fastest?.agent_name ?? "n/a"} />
        <MetricCard label="Slowest agent" value={slowest?.agent_name ?? "n/a"} />
      </div>

      {completedRuns.length === 0 ? (
        <div className="mt-4 rounded border border-[#f0b89d] bg-[#fff4ed] p-3 text-sm text-[#9a3412]">
          No successful model timing metrics were returned yet. Failed provider
          calls are shown in the agent graph instead of synthetic speed data.
        </div>
      ) : null}

      <section className="mt-5 rounded border border-[#e2decf] bg-[#fbfaf5] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Provider Benchmark</h3>
            <p className="mt-1 text-sm text-[#625d52]">
              Runs a live Cerebras probe and optional Gemini baseline only when
              clicked.
            </p>
          </div>
          <button
            type="button"
            onClick={runBenchmark}
            disabled={isBenchmarking}
            className="inline-flex h-10 items-center gap-2 rounded border border-[#d6d1bf] bg-white px-3 text-sm font-semibold hover:bg-[#f5f2e8] disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isBenchmarking ? (
              <Loader2 className="animate-spin" size={16} aria-hidden="true" />
            ) : (
              <Zap size={16} aria-hidden="true" />
            )}
            Run Benchmark
          </button>
        </div>

        {benchmarkError ? (
          <div className="mt-3 rounded border border-[#f0b89d] bg-[#fff4ed] p-3 text-sm text-[#9a3412]">
            {benchmarkError}
          </div>
        ) : null}

        {benchmark ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ProviderBenchmarkCard
              provider="Cerebras"
              model={benchmark.model ?? "configured model"}
              status={benchmark.ok ? "complete" : "failed"}
              latencyMs={benchmark.metrics?.latencyMs ?? null}
              tokensPerSecond={benchmark.metrics?.tokensPerSecond ?? null}
              detail={
                benchmark.ok
                  ? "Live Cerebras benchmark completed."
                  : benchmark.error || benchmark.detail || "Cerebras benchmark failed."
              }
            />
            <BaselineBenchmarkCard baseline={benchmark.baseline ?? null} />
          </div>
        ) : null}
      </section>
    </section>
  );
}

function BaselineBenchmarkCard({ baseline }: { baseline: BaselineResult }) {
  if (!baseline) {
    return (
      <ProviderBenchmarkCard
        provider="Gemini"
        model="baseline"
        status="disabled"
        latencyMs={null}
        tokensPerSecond={null}
        detail="Baseline comparison was not requested or is disabled."
      />
    );
  }

  if (baseline.status === "complete") {
    return (
      <ProviderBenchmarkCard
        provider="Gemini"
        model={baseline.model}
        status="complete"
        latencyMs={baseline.metrics?.latencyMs ?? null}
        tokensPerSecond={baseline.metrics?.tokensPerSecond ?? null}
        detail="Live Gemini baseline completed."
      />
    );
  }

  return (
    <ProviderBenchmarkCard
      provider="Gemini"
      model={baseline.model}
      status={baseline.status}
      latencyMs={null}
      tokensPerSecond={null}
      detail={
        baseline.note ||
        baseline.error ||
        (baseline.missing ? `Missing ${baseline.missing.join(", ")}` : "Baseline unavailable.")
      }
    />
  );
}

function ProviderBenchmarkCard({
  provider,
  model,
  status,
  latencyMs,
  tokensPerSecond,
  detail,
}: {
  provider: string;
  model: string;
  status: string;
  latencyMs: number | null;
  tokensPerSecond: number | null;
  detail: string;
}) {
  const isComplete = status === "complete";

  return (
    <article
      className={`rounded border p-3 ${
        isComplete
          ? "border-[#b8d9d4] bg-[#effaf8] text-[#155e57]"
          : "border-[#d6d1bf] bg-white text-[#4f4a40]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{provider}</h4>
        <span className="font-mono text-xs uppercase">{status}</span>
      </div>
      <p className="mt-1 font-mono text-xs">{model}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt>Latency</dt>
          <dd className="font-mono">{formatNumber(latencyMs, "ms")}</dd>
        </div>
        <div>
          <dt>Tokens/sec</dt>
          <dd className="font-mono">{formatNumber(tokensPerSecond)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm leading-6">{detail}</p>
    </article>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded border border-[#e2decf] bg-[#fbfaf5] p-3">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase text-[#625d52]">
        {icon}
        {label}
      </p>
      <p className="mt-2 break-words font-mono text-sm text-[#161616]">{value}</p>
    </div>
  );
}
