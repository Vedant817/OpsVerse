import { Gauge, Timer, Zap } from "lucide-react";
import type { AgentRun } from "@/lib/cerebras/schemas";

type SpeedMetricsProps = {
  agentRuns: AgentRun[];
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
    </section>
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
