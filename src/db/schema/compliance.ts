import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import {
  accountRoleEnum,
  auditActorTypeEnum,
  auditOperationEnum,
  auditSourceEnum,
  identityProviderEnum,
  legalDocumentTypeEnum,
} from "./enums";

export type ConsentContext = Record<string, string | boolean | null>;
export type AuditSnapshot = Record<string, unknown>;

export const legalDocuments = pgTable(
  "legal_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentType: legalDocumentTypeEnum("document_type").notNull(),
    versionLabel: varchar("version_label", { length: 40 }).notNull(),
    contentHash: char("content_hash", { length: 64 }).notNull(),
    documentUrl: text("document_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    activeFrom: timestamp("active_from", { withTimezone: true }).notNull(),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("legal_documents_type_version_uidx").on(
      table.documentType,
      table.versionLabel,
    ),
    index("legal_documents_active_idx")
      .on(table.documentType, table.activeFrom.desc(), table.id)
      .where(sql`${table.retiredAt} is null`),
    check(
      "legal_documents_content_hash_check",
      sql`${table.contentHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "legal_documents_url_check",
      sql`${table.documentUrl} is null or ${table.documentUrl} ~* '^https?://'`,
    ),
    check(
      "legal_documents_period_check",
      sql`${table.retiredAt} is null or ${table.retiredAt} > ${table.activeFrom}`,
    ),
  ],
);

export const accountConsents = pgTable(
  "account_consents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    legalDocumentId: uuid("legal_document_id")
      .notNull()
      .references(() => legalDocuments.id, { onDelete: "restrict" }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    requestId: varchar("request_id", { length: 128 }),
    networkKeyHash: char("network_key_hash", { length: 64 }),
    userAgentHash: char("user_agent_hash", { length: 64 }),
    context: jsonb("context")
      .$type<ConsentContext>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("account_consents_account_document_uidx").on(
      table.accountId,
      table.legalDocumentId,
    ),
    index("account_consents_account_timeline_idx").on(
      table.accountId,
      table.acceptedAt.desc(),
      table.id,
    ),
    check(
      "account_consents_context_check",
      sql`jsonb_typeof(${table.context}) = 'object'`,
    ),
  ],
);

export const accountContactPreferences = pgTable(
  "account_contact_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    consentDocumentId: uuid("consent_document_id")
      .notNull()
      .references(() => legalDocuments.id, { onDelete: "restrict" }),
    emailVisibleToApprovedCompanies: boolean(
      "email_visible_to_approved_companies",
    )
      .notNull()
      .default(false),
    whatsappVisibleToApprovedCompanies: boolean(
      "whatsapp_visible_to_approved_companies",
    )
      .notNull()
      .default(false),
    socialVisibleToApprovedCompanies: boolean(
      "social_visible_to_approved_companies",
    )
      .notNull()
      .default(false),
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
    uniqueIndex("account_contact_preferences_account_active_uidx")
      .on(table.accountId)
      .where(sql`${table.archivedAt} is null`),
    check(
      "account_contact_preferences_version_check",
      sql`${table.version} > 0`,
    ),
  ],
);

export const blockedIdentities = pgTable(
  "blocked_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: identityProviderEnum("provider").notNull(),
    identityKeyHash: char("identity_key_hash", { length: 64 }).notNull(),
    providerSubjectHash: char("provider_subject_hash", { length: 64 }),
    originatingAccountId: uuid("originating_account_id").references(
      () => accounts.id,
      { onDelete: "restrict" },
    ),
    reason: text("reason").notNull(),
    blockedByAccountId: uuid("blocked_by_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    blockedAt: timestamp("blocked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    unblockedByAccountId: uuid("unblocked_by_account_id").references(
      () => accounts.id,
      { onDelete: "restrict" },
    ),
    unblockedAt: timestamp("unblocked_at", { withTimezone: true }),
    unblockReason: text("unblock_reason"),
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
    uniqueIndex("blocked_identities_active_identity_uidx")
      .on(table.provider, table.identityKeyHash)
      .where(sql`${table.unblockedAt} is null and ${table.archivedAt} is null`),
    index("blocked_identities_originating_account_idx").on(
      table.originatingAccountId,
      table.blockedAt.desc(),
      table.id,
    ),
    check(
      "blocked_identities_identity_hash_check",
      sql`${table.identityKeyHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "blocked_identities_reason_check",
      sql`length(trim(${table.reason})) >= 3`,
    ),
    check("blocked_identities_version_check", sql`${table.version} > 0`),
  ],
);

export const auditRevisions = pgTable(
  "audit_revisions",
  {
    revision: bigint("revision", { mode: "number" })
      .generatedAlwaysAsIdentity()
      .primaryKey(),
    entityTable: varchar("entity_table", { length: 100 }).notNull(),
    entityId: text("entity_id").notNull(),
    operation: auditOperationEnum("operation").notNull(),
    actorAccountId: uuid("actor_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    actorType: auditActorTypeEnum("actor_type").notNull(),
    actorRole: accountRoleEnum("actor_role"),
    source: auditSourceEnum("source").notNull(),
    requestId: varchar("request_id", { length: 128 }),
    reason: text("reason"),
    changedFields: text("changed_fields")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    beforeState: jsonb("before_state").$type<AuditSnapshot>(),
    afterState: jsonb("after_state").$type<AuditSnapshot>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_revisions_entity_timeline_idx").on(
      table.entityTable,
      table.entityId,
      table.occurredAt.desc(),
      table.revision.desc(),
    ),
    index("audit_revisions_entity_period_idx").on(
      table.entityTable,
      table.occurredAt.desc(),
      table.revision.desc(),
    ),
    index("audit_revisions_actor_timeline_idx")
      .on(table.actorAccountId, table.occurredAt.desc(), table.revision.desc())
      .where(sql`${table.actorAccountId} is not null`),
    index("audit_revisions_operation_timeline_idx").on(
      table.operation,
      table.occurredAt.desc(),
      table.revision.desc(),
    ),
    index("audit_revisions_source_timeline_idx").on(
      table.source,
      table.occurredAt.desc(),
      table.revision.desc(),
    ),
    index("audit_revisions_request_idx")
      .on(table.requestId)
      .where(sql`${table.requestId} is not null`),
    check(
      "audit_revisions_entity_table_check",
      sql`${table.entityTable} ~ '^[a-z][a-z0-9_]{0,99}$'`,
    ),
    check(
      "audit_revisions_before_state_check",
      sql`${table.beforeState} is null or jsonb_typeof(${table.beforeState}) = 'object'`,
    ),
    check(
      "audit_revisions_after_state_check",
      sql`${table.afterState} is null or jsonb_typeof(${table.afterState}) = 'object'`,
    ),
  ],
);

export type AuditRevision = typeof auditRevisions.$inferSelect;
export type BlockedIdentity = typeof blockedIdentities.$inferSelect;
