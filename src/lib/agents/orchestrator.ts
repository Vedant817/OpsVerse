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
import { runNarratorAgent } from "./narrator-agent";
import { runRcaAgent } from "./rca-agent";
import { runReleaseAgent } from "./release-agent";
import { runTestAgent } from "./test-agent";
import { runVisionAgent } from "./vision-agent";

export type SwarmStreamEvent =
  | {
      type: "agent_started";
      agent_name: string;
    }
  | {
      type: "agent_completed";
      run: AgentRun;
    };

type SwarmEventHandler = (event: SwarmStreamEvent) => void | Promise<void>;

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

async function emit(eventHandler: SwarmEventHandler | undefined, event: SwarmStreamEvent) {
  if (eventHandler) {
    await eventHandler(event);
  }
}

async function emitDependencyFailure(
  agentRuns: AgentRun[],
  eventHandler: SwarmEventHandler | undefined,
  agentName: string,
  message: string,
) {
  const run = dependencyFailure(agentName, message);
  agentRuns.push(run);
  await emit(eventHandler, {
    type: "agent_completed",
    run,
  });
}

export async function runIncidentSwarm(
  input: IncidentEvidence,
  options: {
    incidentId?: string | null;
  } = {},
): Promise<FinalIncidentPackage> {
  return runIncidentSwarmWithEvents(input, options);
}

export async function runIncidentSwarmWithEvents(
  input: IncidentEvidence,
  options: {
    incidentId?: string | null;
    onEvent?: SwarmEventHandler;
  } = {},
): Promise<FinalIncidentPackage> {
  const incident = incidentEvidenceSchema.parse(input);
  await emit(options.onEvent, {
    type: "agent_started",
    agent_name: "intake_agent",
  });
  const intake = runIntakeAgent({
    incident,
    incidentId: options.incidentId ?? null,
  });
  await emit(options.onEvent, {
    type: "agent_completed",
    run: intake.run,
  });

  // Fail before launching parallel calls when live AI is not configured.
  getCerebrasEnv();

  await Promise.all(
    ["vision_agent", "log_agent", "api_agent", "db_agent"].map((agentName) =>
      emit(options.onEvent, {
        type: "agent_started",
        agent_name: agentName,
      }),
    ),
  );

  const [vision, logs, api, db] = await Promise.all([
    runVisionAgent(incident).then(async (result) => {
      await emit(options.onEvent, {
        type: "agent_completed",
        run: result.run,
      });
      return result;
    }),
    runLogAgent(incident).then(async (result) => {
      await emit(options.onEvent, {
        type: "agent_completed",
        run: result.run,
      });
      return result;
    }),
    runApiAgent(incident).then(async (result) => {
      await emit(options.onEvent, {
        type: "agent_completed",
        run: result.run,
      });
      return result;
    }),
    runDbAgent(incident).then(async (result) => {
      await emit(options.onEvent, {
        type: "agent_completed",
        run: result.run,
      });
      return result;
    }),
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
    await emitDependencyFailure(
      agentRuns,
      options.onEvent,
      "rca_agent",
      "RCA skipped because one or more required evidence agents failed.",
    );
    await emitDependencyFailure(
      agentRuns,
      options.onEvent,
      "test_agent",
      "Regression tests skipped because RCA did not complete.",
    );
    await emitDependencyFailure(
      agentRuns,
      options.onEvent,
      "release_agent",
      "Release risk skipped because RCA and tests did not complete.",
    );
    await emitDependencyFailure(
      agentRuns,
      options.onEvent,
      "narrator_agent",
      "Demo narration skipped because the incident package did not complete.",
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
        narrator: null,
      },
    });
  }

  await emit(options.onEvent, {
    type: "agent_started",
    agent_name: "rca_agent",
  });
  const rca = await runRcaAgent({
    incident,
    logs: logs.output,
    api: api.output,
    db: db.output,
    vision: vision.output,
  });
  agentRuns.push(rca.run);
  await emit(options.onEvent, {
    type: "agent_completed",
    run: rca.run,
  });

  if (!rca.ok) {
    await emitDependencyFailure(
      agentRuns,
      options.onEvent,
      "test_agent",
      "Regression tests skipped because RCA did not complete.",
    );
    await emitDependencyFailure(
      agentRuns,
      options.onEvent,
      "release_agent",
      "Release risk skipped because RCA and tests did not complete.",
    );
    await emitDependencyFailure(
      agentRuns,
      options.onEvent,
      "narrator_agent",
      "Demo narration skipped because the incident package did not complete.",
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
        narrator: null,
      },
    });
  }

  await Promise.all(
    ["test_agent", "release_agent"].map((agentName) =>
      emit(options.onEvent, {
        type: "agent_started",
        agent_name: agentName,
      }),
    ),
  );

  const [tests, release] = await Promise.all([
    runTestAgent({
      incident,
      rca: rca.output,
      api: api.output,
      db: db.output,
    }).then(async (result) => {
      await emit(options.onEvent, {
        type: "agent_completed",
        run: result.run,
      });
      return result;
    }),
    runReleaseAgent({
      incident,
      rca: rca.output,
      api: api.output,
      db: db.output,
    }).then(async (result) => {
      await emit(options.onEvent, {
        type: "agent_completed",
        run: result.run,
      });
      return result;
    }),
  ]);

  agentRuns.push(tests.run, release.run);

  if (!tests.ok || !release.ok) {
    await emitDependencyFailure(
      agentRuns,
      options.onEvent,
      "narrator_agent",
      "Demo narration skipped because release risk did not complete.",
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
        tests: tests.output,
        release: release.output,
        narrator: null,
      },
    });
  }

  await emit(options.onEvent, {
    type: "agent_started",
    agent_name: "narrator_agent",
  });
  const narrator = await runNarratorAgent({
    incident,
    rca: rca.output,
    tests: tests.output,
    release: release.output,
  });
  agentRuns.push(narrator.run);
  await emit(options.onEvent, {
    type: "agent_completed",
    run: narrator.run,
  });

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
      narrator: narrator.output,
    },
  });
}
