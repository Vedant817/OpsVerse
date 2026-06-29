import { AlertTriangle, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import type { AgentRun } from "@/lib/cerebras/schemas";

export type AgentDisplayStatus = AgentRun["status"] | "pending" | "running";

type AgentCardProps = {
  label: string;
  status: AgentDisplayStatus;
  metrics?: AgentRun["metrics"];
  confidence?: number | null;
  error?: string | null;
  preview?: string | null;
};

function statusMeta(status: AgentDisplayStatus) {
  if (status === "complete") {
    return {
      label: "Complete",
      icon: <CheckCircle2 size={16} aria-hidden="true" />,
      className: "border-[#b8d9d4] bg-[#effaf8] text-[#155e57]",
    };
  }

  if (status === "failed") {
    return {
      label: "Failed",
      icon: <AlertTriangle size={16} aria-hidden="true" />,
      className: "border-[#f0b89d] bg-[#fff4ed] text-[#9a3412]",
    };
  }

  if (status === "running") {
    return {
      label: "Running",
      icon: <Loader2 className="animate-spin" size={16} aria-hidden="true" />,
      className: "border-[#b9c9e8] bg-[#eef4ff] text-[#244f86]",
    };
  }

  return {
    label: "Pending",
    icon: <Clock3 size={16} aria-hidden="true" />,
    className: "border-[#d6d1bf] bg-[#fbfaf5] text-[#625d52]",
  };
}

function formatNumber(value: number | null | undefined, suffix = "") {
  if (typeof value !== "number") {
    return "n/a";
  }

  return `${Number.isInteger(value) ? value : value.toFixed(2)}${suffix}`;
}

export function AgentCard({
  label,
  status,
  metrics,
  confidence,
  error,
  preview,
}: AgentCardProps) {
  const meta = statusMeta(status);

  return (
    <article className="grid min-h-48 gap-3 rounded border border-[#d6d1bf] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#161616]">{label}</h3>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-xs font-semibold ${meta.className}`}
        >
          {meta.icon}
          {meta.label}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded border border-[#e2decf] bg-[#fbfaf5] p-2">
          <dt className="text-[#625d52]">Latency</dt>
          <dd className="mt-1 font-mono text-[#161616]">
            {formatNumber(metrics?.latencyMs, "ms")}
          </dd>
        </div>
        <div className="rounded border border-[#e2decf] bg-[#fbfaf5] p-2">
          <dt className="text-[#625d52]">Tokens</dt>
          <dd className="mt-1 font-mono text-[#161616]">
            {formatNumber(metrics?.totalTokens)}
          </dd>
        </div>
        <div className="rounded border border-[#e2decf] bg-[#fbfaf5] p-2">
          <dt className="text-[#625d52]">Conf.</dt>
          <dd className="mt-1 font-mono text-[#161616]">
            {typeof confidence === "number"
              ? `${Math.round(confidence * 100)}%`
              : "n/a"}
          </dd>
        </div>
      </dl>

      <p className="min-h-12 text-sm leading-6 text-[#4f4a40]">
        {error || preview || "Waiting for upstream evidence and agent output."}
      </p>
    </article>
  );
}
