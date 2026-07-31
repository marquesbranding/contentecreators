import "server-only";

import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

import { parseServerEnv } from "../src/shared/lib/env/server-env-schema";

const COMPANY_LOGO_PATH =
  "c0000000-0000-4000-8000-000000000004/logo/72000000-0000-4000-8000-000000000004.png";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

async function main() {
  const environment = parseServerEnv(process.env);
  const supabaseUrl = new URL(environment.NEXT_PUBLIC_SUPABASE_URL);

  if (
    environment.APP_ENV !== "local" ||
    !LOCAL_HOSTS.has(supabaseUrl.hostname)
  ) {
    throw new Error(
      "Local Storage fixtures can only be synchronized with a local Supabase instance.",
    );
  }

  const logo = await readFile(
    new URL(
      "../public/brand/official/contente-creators-blue.png",
      import.meta.url,
    ),
  );
  const client = createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
  const { error } = await client.storage
    .from("profile-media")
    .upload(COMPANY_LOGO_PATH, logo, {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    throw error;
  }

  process.stdout.write("Local Storage fixtures synchronized.\n");
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Local Storage fixture synchronization failed.";

  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
