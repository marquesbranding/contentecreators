import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { parseServerEnv } from "@/shared/lib/env/server-env-schema";

import * as schema from "./schema";

export function createDatabaseClient(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    prepare: false,
    max: 10,
    connect_timeout: 5,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    transform: {
      undefined: null,
    },
  });

  return {
    client,
    database: drizzle(client, { schema }),
  };
}

export type ApplicationDatabase = ReturnType<
  typeof createDatabaseClient
>["database"];
export type ApplicationTransaction = Parameters<
  Parameters<ApplicationDatabase["transaction"]>[0]
>[0];

let databaseClient: ReturnType<typeof createDatabaseClient> | undefined;

export function getDatabaseClient() {
  if (!databaseClient) {
    const environment = parseServerEnv(process.env);
    databaseClient = createDatabaseClient(environment.DATABASE_URL);
  }

  return databaseClient;
}
