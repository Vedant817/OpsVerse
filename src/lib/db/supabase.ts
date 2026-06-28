import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/env";

let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient() {
  if (!supabaseAdminClient) {
    const env = getSupabaseEnv();

    supabaseAdminClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }

  return supabaseAdminClient;
}
