import { NextResponse } from "next/server";
import { z } from "zod";
import { incidentEvidenceSchema } from "@/lib/cerebras/schemas";
import {
  getCerebrasEnv,
  isEnvConfigError,
  isSupabasePersistenceConfigured,
} from "@/lib/env";
import { runIncidentSwarm } from "@/lib/agents/orchestrator";
import {
  createIncidentWithEvidence,
  DatabaseQueryError,
  loadIncidentEvidence,
  saveAgentRuns,
  saveSpeedBenchmarkData,
} from "@/lib/db/queries";
import {
  ImageValidationError,
  validateIncidentImageEvidence,
} from "@/lib/cerebras/image";

export const runtime = "nodejs";

const existingIncidentRequestSchema = z.object({
  incident_id: z.string().trim().min(1).optional(),
  incidentId: z.string().trim().min(1).optional(),
});

type PersistenceState = {
  enabled: boolean;
  incident_id: string | null;
  saved_agent_runs: boolean;
  saved_speed_benchmark: boolean;
  error: string | null;
};

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected server error";
}

function isZodLikeError(error: unknown): error is {
  issues: Array<{ path: Array<string | number>; message: string }>;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues?: unknown }).issues)
  );
}

function databaseErrorResponse(error: DatabaseQueryError, persistence: PersistenceState) {
  return NextResponse.json(
    {
      ok: false,
      error: error.message,
      detail: error.causeDetail,
      persistence: {
        ...persistence,
        error: error.causeDetail ?? error.message,
      },
    },
    { status: 502 },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON request body.",
      },
      { status: 400 },
    );
  }

  try {
    const existingIncidentRequest = existingIncidentRequestSchema.parse(body);
    const requestedIncidentId =
      existingIncidentRequest.incident_id ?? existingIncidentRequest.incidentId ?? null;
    const persistence: PersistenceState = {
      enabled: isSupabasePersistenceConfigured(),
      incident_id: requestedIncidentId,
      saved_agent_runs: false,
      saved_speed_benchmark: false,
      error: null,
    };
    const incident = requestedIncidentId
      ? await loadIncidentEvidence(requestedIncidentId)
      : incidentEvidenceSchema.parse(body);

    validateIncidentImageEvidence(incident);

    if (!requestedIncidentId && persistence.enabled) {
      try {
        persistence.incident_id = await createIncidentWithEvidence(incident);
      } catch (error) {
        if (error instanceof DatabaseQueryError) {
          return databaseErrorResponse(error, persistence);
        }

        throw error;
      }
    }

    const result = await runIncidentSwarm(incident, {
      incidentId: persistence.incident_id,
    });
    const completed = result.agent_runs.every((run) => run.status === "complete");

    if (persistence.enabled && persistence.incident_id) {
      try {
        await saveAgentRuns(persistence.incident_id, result.agent_runs);
        persistence.saved_agent_runs = true;

        if (completed && result.runtime?.mode === "live_cerebras") {
          await saveSpeedBenchmarkData(
            persistence.incident_id,
            result,
            getCerebrasEnv().CEREBRAS_MODEL,
          );
          persistence.saved_speed_benchmark = true;
        }
      } catch (error) {
        if (error instanceof DatabaseQueryError) {
          return NextResponse.json(
            {
              ok: false,
              error: "Incident swarm completed but persistence failed.",
              detail: error.causeDetail,
              result,
              persistence: {
                ...persistence,
                error: error.causeDetail ?? error.message,
              },
            },
            { status: 502 },
          );
        }

        throw error;
      }
    }

    return NextResponse.json(
      {
        ok: completed,
        error: completed
          ? null
          : "Incident swarm did not complete. Inspect agent_runs for failed agents.",
        result,
        persistence,
      },
      {
        status: completed ? 200 : 502,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (isZodLikeError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid incident evidence payload.",
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    if (isEnvConfigError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          missing: error.missing,
        },
        { status: 503 },
      );
    }

    if (error instanceof ImageValidationError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 400 },
      );
    }

    if (error instanceof DatabaseQueryError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          detail: error.causeDetail,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Incident swarm failed.",
        detail: errorMessage(error),
      },
      { status: 502 },
    );
  }
}
