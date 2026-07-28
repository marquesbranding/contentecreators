import { sql } from "drizzle-orm";
import {
  check,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    expiresAt: timestamp("expires_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    requestCount: integer("request_count").notNull(),
    scope: varchar("scope", { length: 64 }).notNull(),
    windowStartedAt: timestamp("window_started_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.keyHash] }),
    check(
      "rate_limit_buckets_request_count_positive",
      sql`${table.requestCount} > 0`,
    ),
  ],
);
