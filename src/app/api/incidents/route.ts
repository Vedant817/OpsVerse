import { NextResponse } from "next/server";
import { incidentEvidenceSchema } from "@/lib/cerebras/schemas";
import { isEnvConfigError } from "@/lib/env";
import { dashboardRecordToFinalPackage } from "@/lib/dashboard/package";
import {
  createIncidentWithEvidence,
  DatabaseQueryError,
  loadFullIncidentDashboard,
} from "@/lib/db/queries";
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const incidentId = url.searchParams.get("id")?.trim();

  if (!incidentId) {
    return NextResponse.json(
      {
        ok: false,
        error: "Incident id is required.",
      },
      { status: 400 },
    );
  }

  try {
    const record = await loadFullIncidentDashboard(incidentId);
    const result = dashboardRecordToFinalPackage(record);
    const latestBenchmark = record.speedBenchmarks[0] ?? null;

    return NextResponse.json(
      {
        ok: true,
        incident: {
          id: record.incident.id,
          title: record.incident.title,
          module: record.incident.module,
          status: record.incident.status,
          severity: record.incident.severity,
          created_at: record.incident.created_at,
        },
        evidence_count: record.evidence.length,
        saved_agent_run_count: record.agentRuns.length,
        speed_benchmark_count: record.speedBenchmarks.length,
        latest_speed_benchmark: latestBenchmark
          ? {
              provider: latestBenchmark.provider,
              model: latestBenchmark.model,
              total_latency_ms: latestBenchmark.total_latency_ms,
              total_tokens: latestBenchmark.total_tokens,
              average_tokens_per_second:
                latestBenchmark.average_tokens_per_second,
              agent_count: latestBenchmark.agent_count,
              created_at: latestBenchmark.created_at,
            }
          : null,
        result,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
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
        error: "Incident load failed.",
      },
      { status: 502 },
    );
  }
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
