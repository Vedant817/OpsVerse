import { NextResponse } from "next/server";
import { checkCerebrasModelReadiness } from "@/lib/cerebras/client";
import {
  getCerebrasEnv,
  getLocalAgentModeEnv,
  isEnvConfigError,
  isSupabasePersistenceConfigured,
} from "@/lib/env";
import { buildRuntimePreflight } from "@/lib/runtime/preflight";

export const runtime = "nodejs";

export async function GET() {
  const localAgentMode = getLocalAgentModeEnv();
  let cerebrasState: {
    configured: boolean;
    model: string | null;
    missing: string[];
    error: string | null;
  };
  let modelReadiness:
    | Awaited<ReturnType<typeof checkCerebrasModelReadiness>>
    | undefined;

  try {
    const cerebras = getCerebrasEnv();
    cerebrasState = {
      configured: true,
      model: cerebras.CEREBRAS_MODEL,
      missing: [],
      error: null,
    };
    modelReadiness = await checkCerebrasModelReadiness();
  } catch (error) {
    if (isEnvConfigError(error)) {
      cerebrasState = {
        configured: false,
        model: process.env.CEREBRAS_MODEL?.trim() || null,
        missing: error.missing,
        error: error.message,
      };
    } else {
      cerebrasState = {
        configured: true,
        model: process.env.CEREBRAS_MODEL?.trim() || null,
        missing: [],
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify Cerebras readiness.",
      };
    }
  }

  const preflight = await buildRuntimePreflight({
    cerebrasState,
    localAgentMode: {
      enabled: localAgentMode.enabled,
      value: localAgentMode.OPSVERSE_LOCAL_AGENT_MODE,
    },
    modelReadiness,
    persistenceConfigured: isSupabasePersistenceConfigured(),
  });

  return NextResponse.json(preflight, {
    status: preflight.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
