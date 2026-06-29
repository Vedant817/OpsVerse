import { NextResponse } from "next/server";
import { checkCerebrasModelReadiness } from "@/lib/cerebras/client";
import {
  getCerebrasEnv,
  getSupabaseEnv,
  isEnvConfigError,
} from "@/lib/env";

export const runtime = "nodejs";

function safeOrigin(value: string | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected provider probe error";
}

async function cerebrasStatus() {
  try {
    const env = getCerebrasEnv();
    const readiness = await checkCerebrasModelReadiness();

    return {
      configured: true,
      model: env.CEREBRAS_MODEL,
      model_available: readiness.available,
      available_models: readiness.availableModels,
      checked_at: readiness.checkedAt,
      base_url_origin: safeOrigin(env.CEREBRAS_BASE_URL),
      missing: [] as string[],
      note: readiness.available
        ? "Configuration is present and the configured model is available. Use /api/benchmark for a live generation probe before claiming full model success."
        : `Configuration is present, but the configured model is not available for this API key. Available models: ${
            readiness.availableModels.length > 0
              ? readiness.availableModels.join(", ")
              : "none returned"
          }.`,
    };
  } catch (error) {
    if (isEnvConfigError(error)) {
      return {
        configured: false,
        model: process.env.CEREBRAS_MODEL?.trim() || null,
        model_available: false,
        available_models: [] as string[],
        checked_at: null,
        base_url_origin: safeOrigin(process.env.CEREBRAS_BASE_URL),
        missing: error.missing,
        note: error.message,
      };
    }

    return {
      configured: true,
      model: process.env.CEREBRAS_MODEL?.trim() || null,
      model_available: false,
      available_models: [] as string[],
      checked_at: null,
      base_url_origin: safeOrigin(process.env.CEREBRAS_BASE_URL),
      missing: [] as string[],
      note: safeErrorMessage(error),
    };
  }
}

function supabaseStatus() {
  try {
    const env = getSupabaseEnv();

    return {
      configured: true,
      url_origin: safeOrigin(env.NEXT_PUBLIC_SUPABASE_URL),
      missing: [] as string[],
      note:
        "Persistence configuration is present. Verify live insert/select before claiming persisted dashboard refresh.",
    };
  } catch (error) {
    if (isEnvConfigError(error)) {
      return {
        configured: false,
        url_origin: safeOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL),
        missing: error.missing,
        note: error.message,
      };
    }

    throw error;
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      generated_at: new Date().toISOString(),
      app: {
        public_url: process.env.NEXT_PUBLIC_APP_URL?.trim() || null,
        node_env: process.env.NODE_ENV ?? null,
      },
      cerebras: await cerebrasStatus(),
      supabase: supabaseStatus(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
