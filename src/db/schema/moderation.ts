import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { accountStatusEnum, moderationActionEnum } from "./enums";

export const moderationCases = pgTable(
  "moderation_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    currentSubmissionSequence: integer("current_submission_sequence")
      .notNull()
      .default(0),
    assignedAdminAccountId: uuid("assigned_admin_account_id").references(
      () => accounts.id,
      { onDelete: "restrict" },
    ),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("moderation_cases_account_id_uidx").on(table.accountId),
    index("moderation_cases_queue_idx")
      .on(table.submittedAt, table.id)
      .where(sql`${table.resolvedAt} is null and ${table.archivedAt} is null`),
    index("moderation_cases_assignee_idx")
      .on(table.assignedAdminAccountId, table.submittedAt, table.id)
      .where(sql`${table.resolvedAt} is null and ${table.archivedAt} is null`),
    check(
      "moderation_cases_submission_sequence_check",
      sql`${table.currentSubmissionSequence} >= 0`,
    ),
    check(
      "moderation_cases_assignment_check",
      sql`${table.assignedAdminAccountId} is distinct from ${table.accountId}`,
    ),
    check("moderation_cases_version_check", sql`${table.version} > 0`),
  ],
);

export const moderationEvents = pgTable(
  "moderation_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    moderationCaseId: uuid("moderation_case_id")
      .notNull()
      .references(() => moderationCases.id, { onDelete: "restrict" }),
    submissionSequence: integer("submission_sequence").notNull(),
    fromStatus: accountStatusEnum("from_status").notNull(),
    toStatus: accountStatusEnum("to_status").notNull(),
    action: moderationActionEnum("action").notNull(),
    reason: text("reason"),
    actorAccountId: uuid("actor_account_id")
      .notNull()
      .references(() => accounts.id, {
        onDelete: "restrict",
      }),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("moderation_events_idempotency_key_uidx").on(
      table.idempotencyKey,
    ),
    uniqueIndex("moderation_events_case_sequence_action_uidx").on(
      table.moderationCaseId,
      table.submissionSequence,
      table.action,
    ),
    index("moderation_events_case_timeline_idx").on(
      table.moderationCaseId,
      table.occurredAt.desc(),
      table.id,
    ),
    check(
      "moderation_events_transition_check",
      sql`(
        (${table.action} = 'ARCHIVE' and ${table.fromStatus} = ${table.toStatus})
        or
        (${table.action} <> 'ARCHIVE' and ${table.fromStatus} <> ${table.toStatus})
      )`,
    ),
    check(
      "moderation_events_reason_check",
      sql`${table.action} not in ('REQUEST_CHANGES', 'SUSPEND', 'RESTORE', 'BAN', 'UNBAN', 'ARCHIVE')
          or length(trim(${table.reason})) >= 3`,
    ),
  ],
);

export type ModerationCase = typeof moderationCases.$inferSelect;
export type ModerationEvent = typeof moderationEvents.$inferSelect;
