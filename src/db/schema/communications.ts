import { sql } from "drizzle-orm";
import {
  char,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import {
  emailAttemptStatusEnum,
  emailOutboxStatusEnum,
  emailTemplateEnum,
} from "./enums";

export type EmailPayload = Record<string, string | number | boolean | null>;

export const emailOutbox = pgTable(
  "email_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    template: emailTemplateEnum("template").notNull(),
    recipientEmail: varchar("recipient_email", { length: 320 }).notNull(),
    payload: jsonb("payload")
      .$type<EmailPayload>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: emailOutboxStatusEnum("status").notNull().default("PENDING"),
    idempotencyKey: varchar("idempotency_key", { length: 200 }).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: varchar("locked_by", { length: 120 }),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    lastErrorCategory: varchar("last_error_category", { length: 80 }),
    lastErrorCode: varchar("last_error_code", { length: 80 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("email_outbox_idempotency_key_uidx").on(table.idempotencyKey),
    index("email_outbox_due_idx")
      .on(table.status, table.dueAt, table.id)
      .where(sql`${table.status} in ('PENDING', 'FAILED')`),
    index("email_outbox_due_claim_idx")
      .on(table.dueAt, table.id)
      .where(sql`${table.status} in ('PENDING', 'FAILED')`),
    index("email_outbox_lock_idx")
      .on(table.lockedAt, table.id)
      .where(sql`${table.lockedAt} is not null`),
    check(
      "email_outbox_payload_check",
      sql`jsonb_typeof(${table.payload}) = 'object'`,
    ),
    check("email_outbox_attempt_count_check", sql`${table.attemptCount} >= 0`),
    check(
      "email_outbox_max_attempts_check",
      sql`${table.maxAttempts} between 1 and 20`,
    ),
    check("email_outbox_version_check", sql`${table.version} > 0`),
  ],
);

export const emailAttempts = pgTable(
  "email_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    outboxId: uuid("outbox_id")
      .notNull()
      .references(() => emailOutbox.id, { onDelete: "restrict" }),
    attemptNumber: integer("attempt_number").notNull(),
    status: emailAttemptStatusEnum("status").notNull(),
    providerMessageIdHash: char("provider_message_id_hash", { length: 64 }),
    responseCode: varchar("response_code", { length: 40 }),
    errorCategory: varchar("error_category", { length: 80 }),
    errorCode: varchar("error_code", { length: 80 }),
    latencyMs: integer("latency_ms"),
    attemptedAt: timestamp("attempted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("email_attempts_outbox_number_uidx").on(
      table.outboxId,
      table.attemptNumber,
    ),
    index("email_attempts_outbox_timeline_idx").on(
      table.outboxId,
      table.attemptedAt.desc(),
      table.id,
    ),
    check(
      "email_attempts_attempt_number_check",
      sql`${table.attemptNumber} > 0`,
    ),
    check(
      "email_attempts_latency_check",
      sql`${table.latencyMs} is null or ${table.latencyMs} >= 0`,
    ),
  ],
);

export type EmailOutboxItem = typeof emailOutbox.$inferSelect;
export type NewEmailOutboxItem = typeof emailOutbox.$inferInsert;
