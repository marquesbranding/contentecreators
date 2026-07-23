import "server-only";

import { createClient } from "@supabase/supabase-js";

import { parseServerEnv } from "@/shared/lib/env/server-env-schema";

export function createSupabaseAdminClient() {
  const environment = parseServerEnv(process.env);

  return createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
