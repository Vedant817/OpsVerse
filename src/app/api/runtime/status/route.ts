import { NextResponse } from "next/server";
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

function cerebrasStatus() {
  try {
    const env = getCerebrasEnv();

    return {
      configured: true,
      model: env.CEREBRAS_MODEL,
      base_url_origin: safeOrigin(env.CEREBRAS_BASE_URL),
      missing: [] as string[],
      note:
        "Configuration is present. Use /api/benchmark for a real provider probe before claiming live model success.",
    };
  } catch (error) {
    if (isEnvConfigError(error)) {
      return {
        configured: false,
        model: process.env.CEREBRAS_MODEL?.trim() || null,
        base_url_origin: safeOrigin(process.env.CEREBRAS_BASE_URL),
        missing: error.missing,
        note: error.message,
      };
    }

    throw error;
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

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      generated_at: new Date().toISOString(),
      app: {
        public_url: process.env.NEXT_PUBLIC_APP_URL?.trim() || null,
        node_env: process.env.NODE_ENV ?? null,
      },
      cerebras: cerebrasStatus(),
      supabase: supabaseStatus(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
