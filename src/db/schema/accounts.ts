import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { authUsers } from "./auth";
import { accountRoleEnum, accountStatusEnum } from "./enums";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authUserId: uuid("auth_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    role: accountRoleEnum("role"),
    status: accountStatusEnum("status").notNull().default("ONBOARDING"),
    operationalEmail: varchar("operational_email", { length: 320 }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    bannedAt: timestamp("banned_at", { withTimezone: true }),
    completionPercentage: smallint("completion_percentage")
      .notNull()
      .default(0),
    completionVersion: integer("completion_version").notNull().default(1),
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
    uniqueIndex("accounts_auth_user_id_uidx").on(table.authUserId),
    index("accounts_role_status_idx")
      .on(table.role, table.status)
      .where(sql`${table.archivedAt} is null`),
    index("accounts_moderation_queue_idx")
      .on(table.status, table.submittedAt, table.id)
      .where(
        sql`${table.archivedAt} is null and ${table.status} in ('PENDING_REVIEW', 'CHANGES_REQUESTED')`,
      ),
    index("accounts_moderation_role_queue_idx")
      .on(table.role, table.status, table.submittedAt, table.id)
      .where(
        sql`${table.archivedAt} is null and ${table.status} in ('PENDING_REVIEW', 'CHANGES_REQUESTED')`,
      ),
    check(
      "accounts_completion_percentage_check",
      sql`${table.completionPercentage} between 0 and 100`,
    ),
    check(
      "accounts_completion_version_check",
      sql`${table.completionVersion} > 0`,
    ),
    check("accounts_version_check", sql`${table.version} > 0`),
    check(
      "accounts_operational_email_check",
      sql`length(trim(${table.operationalEmail})) between 3 and 320`,
    ),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
