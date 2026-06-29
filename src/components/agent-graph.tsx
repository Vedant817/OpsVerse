import type { AgentRun, FinalIncidentPackage } from "@/lib/cerebras/schemas";
import { AgentCard, type AgentDisplayStatus } from "@/components/agent-card";

const agents = [
  { name: "intake_agent", label: "Intake Agent" },
  { name: "vision_agent", label: "Vision Agent" },
  { name: "log_agent", label: "Log Agent" },
  { name: "api_agent", label: "API Agent" },
  { name: "db_agent", label: "DB Agent" },
  { name: "rca_agent", label: "RCA Agent" },
  { name: "test_agent", label: "Test Agent" },
  { name: "release_agent", label: "Release Judge" },
  { name: "narrator_agent", label: "Demo Narrator" },
] as const;

type AgentGraphProps = {
  result?: FinalIncidentPackage | null;
  runs?: AgentRun[];
  activeAgents?: string[];
  isRunning?: boolean;
};

function outputObject(output: unknown) {
  return typeof output === "object" && output !== null
    ? (output as Record<string, unknown>)
    : null;
}

function confidenceFromRun(run?: AgentRun) {
  const output = outputObject(run?.output);
  const confidence = output?.confidence;
  return typeof confidence === "number" ? confidence : null;
}

function previewFromRun(run?: AgentRun) {
  const output = outputObject(run?.output);

  if (!output) {
    return null;
  }

  for (const key of [
    "root_cause_summary",
    "probable_cause",
    "contract_violation",
    "data_issue",
    "reason",
    "api_regression_test",
    "screen_type",
  ]) {
    const value = output[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return JSON.stringify(output).slice(0, 180);
}

function statusForAgent(
  agentName: string,
  run: AgentRun | undefined,
  activeAgents: Set<string>,
  isRunning: boolean,
  useInitialRunningFallback: boolean,
) {
  if (run) {
    return run.status;
  }

  if (activeAgents.has(agentName)) {
    return "running";
  }

  if (
    isRunning &&
    useInitialRunningFallback &&
    ["intake_agent", "vision_agent", "log_agent", "api_agent", "db_agent"].includes(
      agentName,
    )
  ) {
    return "running";
  }

  return "pending";
}

export function AgentGraph({
  result,
  runs: streamedRuns,
  activeAgents,
  isRunning = false,
}: AgentGraphProps) {
  const recordedRuns = streamedRuns ?? result?.agent_runs ?? [];
  const activeAgentSet = new Set(activeAgents ?? []);
  const useInitialRunningFallback = activeAgents === undefined;
  const runs = new Map(recordedRuns.map((run) => [run.agent_name, run]));

  return (
    <section className="rounded border border-[#d6d1bf] bg-[#fdfcf7] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Agent Execution</h2>
          <p className="mt-1 text-sm text-[#625d52]">
            State is rendered from live route output. Pending agents have not
            produced a persisted run yet.
          </p>
        </div>
        <div className="font-mono text-xs text-[#625d52]">
          {recordedRuns.length}/9 runs recorded
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {agents.map((agent) => {
          const run = runs.get(agent.name);
          const status = statusForAgent(
            agent.name,
            run,
            activeAgentSet,
            isRunning,
            useInitialRunningFallback,
          ) as AgentDisplayStatus;

          return (
            <AgentCard
              key={agent.name}
              label={agent.label}
              status={status}
              metrics={run?.metrics}
              confidence={confidenceFromRun(run)}
              error={run?.error}
              preview={previewFromRun(run)}
            />
          );
        })}
      </div>
    </section>
  );
}
