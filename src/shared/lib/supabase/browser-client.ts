"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnv } from "@/shared/lib/env/public-env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function getBrowserSupabaseClient() {
  if (!browserClient) {
    const environment = getPublicEnv();
    browserClient = createBrowserClient(
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  }

  return browserClient;
}
