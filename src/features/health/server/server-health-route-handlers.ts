import "server-only";

import { sql } from "drizzle-orm";

import { getDatabaseClient } from "@/db/client";
import { operationalLogger } from "@/shared/server/observability/operational-logger";

import { createHealthRouteHandlers } from "./health-route-handlers";

export function createServerHealthRouteHandlers() {
  return createHealthRouteHandlers({
    async checkReadiness() {
      const { database } = getDatabaseClient();
      await database.execute(sql`select 1`);
    },
    log(event) {
      if (event.outcome === "unavailable") {
        operationalLogger.warn(event);
        return;
      }

      operationalLogger.info(event);
    },
  });
}
