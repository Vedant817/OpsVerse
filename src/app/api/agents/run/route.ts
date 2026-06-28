import { NextResponse } from "next/server";
import { incidentEvidenceSchema } from "@/lib/cerebras/schemas";
import { isEnvConfigError } from "@/lib/env";
import { runIncidentSwarm } from "@/lib/agents/orchestrator";

export const runtime = "nodejs";

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
    const incident = incidentEvidenceSchema.parse(body);
    const result = await runIncidentSwarm(incident);
    const completed = result.agent_runs.every((run) => run.status === "complete");

    return NextResponse.json(
      {
        ok: completed,
        error: completed
          ? null
          : "Incident swarm did not complete. Inspect agent_runs for failed agents.",
        result,
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
