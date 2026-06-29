import { NextResponse } from "next/server";
import { incidentEvidenceSchema } from "@/lib/cerebras/schemas";
import { isEnvConfigError } from "@/lib/env";
import { createIncidentWithEvidence, DatabaseQueryError } from "@/lib/db/queries";
import {
  ImageValidationError,
  validateIncidentImageEvidence,
} from "@/lib/cerebras/image";

export const runtime = "nodejs";

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
    validateIncidentImageEvidence(incident);
    const incidentId = await createIncidentWithEvidence(incident);

    return NextResponse.json(
      {
        ok: true,
        incident_id: incidentId,
        status: "created",
      },
      {
        status: 201,
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
        error: "Incident creation failed.",
      },
      { status: 502 },
    );
  }
}
