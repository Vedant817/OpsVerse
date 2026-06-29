import "server-only";

import { getCerebrasEnv } from "@/lib/env";
import {
  finalIncidentPackageSchema,
  incidentEvidenceSchema,
  type AgentRun,
  type FinalIncidentPackage,
  type IncidentEvidence,
} from "@/lib/cerebras/schemas";
import { runApiAgent } from "./api-agent";
import { runDbAgent } from "./db-agent";
import { runIntakeAgent } from "./intake-agent";
import { runLogAgent } from "./log-agent";
import { runRcaAgent } from "./rca-agent";
import { runReleaseAgent } from "./release-agent";
import { runTestAgent } from "./test-agent";
import { runVisionAgent } from "./vision-agent";

function dependencyFailure(agentName: string, message: string): AgentRun {
  return {
    agent_name: agentName,
    status: "failed",
    output: null,
    error: message,
    metrics: null,
  };
}

function hasImageEvidence(incident: IncidentEvidence) {
  return Boolean(incident.screenshotDataUri || incident.videoFrameDataUri);
}

export async function runIncidentSwarm(
  input: IncidentEvidence,
  options: {
    incidentId?: string | null;
  } = {},
): Promise<FinalIncidentPackage> {
  const incident = incidentEvidenceSchema.parse(input);
  const intake = runIntakeAgent({
    incident,
    incidentId: options.incidentId ?? null,
  });

  // Fail before launching parallel calls when live AI is not configured.
  getCerebrasEnv();

  const [vision, logs, api, db] = await Promise.all([
    runVisionAgent(incident),
    runLogAgent(incident),
    runApiAgent(incident),
    runDbAgent(incident),
  ]);

  const agentRuns: AgentRun[] = [
    intake.run,
    vision.run,
    logs.run,
    api.run,
    db.run,
  ];

  const requiredVisionFailed = hasImageEvidence(incident) && !vision.ok;

  if (requiredVisionFailed || !logs.ok || !api.ok || !db.ok) {
    agentRuns.push(
      dependencyFailure(
        "rca_agent",
        "RCA skipped because one or more required evidence agents failed.",
      ),
      dependencyFailure(
        "test_agent",
        "Regression tests skipped because RCA did not complete.",
      ),
      dependencyFailure(
        "release_agent",
        "Release risk skipped because RCA and tests did not complete.",
      ),
    );

    return finalIncidentPackageSchema.parse({
      incident,
      agent_runs: agentRuns,
      outputs: {
        intake: intake.output,
        vision: vision.output,
        logs: logs.output,
        api: api.output,
        db: db.output,
        rca: null,
        tests: null,
        release: null,
      },
    });
  }

  const rca = await runRcaAgent({
    incident,
    logs: logs.output,
    api: api.output,
    db: db.output,
    vision: vision.output,
  });
  agentRuns.push(rca.run);

  if (!rca.ok) {
    agentRuns.push(
      dependencyFailure(
        "test_agent",
        "Regression tests skipped because RCA did not complete.",
      ),
      dependencyFailure(
        "release_agent",
        "Release risk skipped because RCA and tests did not complete.",
      ),
    );

    return finalIncidentPackageSchema.parse({
      incident,
      agent_runs: agentRuns,
      outputs: {
        intake: intake.output,
        vision: vision.output,
        logs: logs.output,
        api: api.output,
        db: db.output,
        rca: null,
        tests: null,
        release: null,
      },
    });
  }

  const tests = await runTestAgent({
    incident,
    rca: rca.output,
    api: api.output,
    db: db.output,
  });
  agentRuns.push(tests.run);

  if (!tests.ok) {
    agentRuns.push(
      dependencyFailure(
        "release_agent",
        "Release risk skipped because regression tests did not complete.",
      ),
    );

    return finalIncidentPackageSchema.parse({
      incident,
      agent_runs: agentRuns,
      outputs: {
        intake: intake.output,
        vision: vision.output,
        logs: logs.output,
        api: api.output,
        db: db.output,
        rca: rca.output,
        tests: null,
        release: null,
      },
    });
  }

  const release = await runReleaseAgent({
    incident,
    rca: rca.output,
    tests: tests.output,
  });
  agentRuns.push(release.run);

  return finalIncidentPackageSchema.parse({
    incident,
    agent_runs: agentRuns,
    outputs: {
      intake: intake.output,
      vision: vision.output,
      logs: logs.output,
      api: api.output,
      db: db.output,
      rca: rca.output,
      tests: tests.output,
      release: release.output,
    },
  });
}
