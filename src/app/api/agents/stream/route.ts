import { NextResponse } from "next/server";
import { z } from "zod";
import { runIncidentSwarmWithEvents } from "@/lib/agents/orchestrator";
import {
  ImageValidationError,
  validateIncidentImageEvidence,
} from "@/lib/cerebras/image";
import {
  finalIncidentPackageSchema,
  incidentEvidenceSchema,
  type FinalIncidentPackage,
} from "@/lib/cerebras/schemas";
import {
  DatabaseQueryError,
  createIncidentWithEvidence,
  loadIncidentEvidence,
  saveAgentRun,
  saveSpeedBenchmarkData,
  updateIncidentStatus,
} from "@/lib/db/queries";
import {
  getCerebrasEnv,
  isEnvConfigError,
  isSupabasePersistenceConfigured,
} from "@/lib/env";
import {
  heartbeatStreamEvent,
  metricsUpdatedStreamEvent,
  serializeSse,
} from "@/lib/stream/sse";

export const runtime = "nodejs";

const existingIncidentRequestSchema = z.object({
  incident_id: z.string().trim().min(1).optional(),
  incidentId: z.string().trim().min(1).optional(),
});

type PersistenceState = {
  enabled: boolean;
  incident_id: string | null;
  saved_agent_runs: boolean;
  saved_agent_run_count: number;
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

async function persistFinalResult(
  result: FinalIncidentPackage,
  persistence: PersistenceState,
) {
  const completed = result.agent_runs.every((run) => run.status === "complete");

  if (!persistence.enabled || !persistence.incident_id) {
    return {
      ok: completed,
      error: completed
        ? null
        : "Incident swarm did not complete. Inspect agent_runs for failed agents.",
      persistence,
    };
  }

  try {
    if (persistence.error) {
      throw new DatabaseQueryError("Save agent runs failed.", persistence.error);
    }

    persistence.saved_agent_runs =
      persistence.saved_agent_run_count === result.agent_runs.length &&
      result.agent_runs.length > 0;

    if (completed && result.runtime?.mode === "live_cerebras") {
      await saveSpeedBenchmarkData(
        persistence.incident_id,
        result,
        getCerebrasEnv().CEREBRAS_MODEL,
      );
      persistence.saved_speed_benchmark = true;
    }

    await updateIncidentStatus(
      persistence.incident_id,
      completed ? "completed" : "failed",
    );
  } catch (error) {
    if (error instanceof DatabaseQueryError) {
      persistence.error = error.causeDetail ?? error.message;
      return {
        ok: false,
        error: "Incident swarm completed but persistence failed.",
        detail: error.causeDetail,
        persistence,
      };
    }

    throw error;
  }

  return {
    ok: completed,
    error: completed
      ? null
      : "Incident swarm did not complete. Inspect agent_runs for failed agents.",
    persistence,
  };
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

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) {
          return;
        }
        controller.enqueue(encoder.encode(serializeSse(event, data)));
      };
      const heartbeatTimer = setInterval(() => {
        if (!closed) {
          controller.enqueue(
            encoder.encode(
              serializeSse("heartbeat", heartbeatStreamEvent()),
            ),
          );
        }
      }, 10_000);

      try {
        const existingIncidentRequest = existingIncidentRequestSchema.parse(body);
        const requestedIncidentId =
          existingIncidentRequest.incident_id ??
          existingIncidentRequest.incidentId ??
          null;
        const persistence: PersistenceState = {
          enabled: isSupabasePersistenceConfigured(),
          incident_id: requestedIncidentId,
          saved_agent_runs: false,
          saved_agent_run_count: 0,
          saved_speed_benchmark: false,
          error: null,
        };
        const incident = requestedIncidentId
          ? await loadIncidentEvidence(requestedIncidentId)
          : incidentEvidenceSchema.parse(body);

        validateIncidentImageEvidence(incident);

        if (!requestedIncidentId && persistence.enabled) {
          persistence.incident_id = await createIncidentWithEvidence(incident);
        }

        if (persistence.enabled && persistence.incident_id) {
          await updateIncidentStatus(persistence.incident_id, "running");
        }

        const result = await runIncidentSwarmWithEvents(incident, {
          incidentId: persistence.incident_id,
          async onEvent(event) {
            send(event.type, event);
            if (event.type === "agent_completed") {
              const metricsEvent = metricsUpdatedStreamEvent(event.run);
              if (metricsEvent) {
                send("metrics_updated", metricsEvent);
              }

              if (
                persistence.enabled &&
                persistence.incident_id &&
                !persistence.error
              ) {
                try {
                  await saveAgentRun(persistence.incident_id, event.run);
                  persistence.saved_agent_run_count += 1;
                } catch (error) {
                  if (error instanceof DatabaseQueryError) {
                    persistence.error = error.causeDetail ?? error.message;
                    send("persistence_error", {
                      type: "persistence_error",
                      error: "Agent run persistence failed.",
                      detail: persistence.error,
                      persistence,
                    });
                    return;
                  }

                  throw error;
                }
              }
            }
          },
        });
        const parsedResult = finalIncidentPackageSchema.parse(result);
        const finalState = await persistFinalResult(parsedResult, persistence);

        send("swarm_completed", {
          type: "swarm_completed",
          ...finalState,
          result: parsedResult,
        });
      } catch (error) {
        if (isZodLikeError(error)) {
          send("swarm_error", {
            type: "swarm_error",
            error: "Invalid incident evidence payload.",
            issues: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          });
        } else if (isEnvConfigError(error)) {
          send("swarm_error", {
            type: "swarm_error",
            error: error.message,
            missing: error.missing,
          });
        } else if (error instanceof ImageValidationError) {
          send("swarm_error", {
            type: "swarm_error",
            error: error.message,
          });
        } else if (error instanceof DatabaseQueryError) {
          send("swarm_error", {
            type: "swarm_error",
            error: error.message,
            detail: error.causeDetail,
          });
        } else {
          send("swarm_error", {
            type: "swarm_error",
            error: "Incident swarm failed.",
            detail: errorMessage(error),
          });
        }
      } finally {
        closed = true;
        clearInterval(heartbeatTimer);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
