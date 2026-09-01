import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { whatsappContactStatusEnum } from "./enums";
import { creatorProfiles } from "./profiles";

export const whatsappContactConfirmations = pgTable(
  "whatsapp_contact_confirmations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyAccountId: uuid("company_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    creatorProfileId: uuid("creator_profile_id")
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: "restrict" }),
    status: whatsappContactStatusEnum("status").notNull().default("PENDING"),
    clickedAt: timestamp("clicked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("whatsapp_contact_confirmations_pending_uidx")
      .on(table.companyAccountId, table.creatorProfileId)
      .where(sql`${table.status} = 'PENDING'`),
    index("whatsapp_contact_confirmations_company_queue_idx").on(
      table.companyAccountId,
      table.status,
      table.clickedAt,
    ),
    check(
      "whatsapp_contact_confirmations_version_check",
      sql`${table.version} > 0`,
    ),
    check(
      "whatsapp_contact_confirmations_state_check",
      sql`
        (${table.status} = 'PENDING' and ${table.confirmedAt} is null)
        or
        (${table.status} = 'CONFIRMED' and ${table.confirmedAt} is not null)
      `,
    ),
  ],
);

export type WhatsappContactConfirmation =
  typeof whatsappContactConfirmations.$inferSelect;
export type NewWhatsappContactConfirmation =
  typeof whatsappContactConfirmations.$inferInsert;
