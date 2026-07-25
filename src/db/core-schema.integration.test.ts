import postgres from "postgres";
import { getTableColumns, getTableName } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { applicationTables } from "./schema/tables";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const database = postgres(
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  {
    max: 1,
    connect_timeout: 5,
    idle_timeout: 1,
  },
);

const requiredEnums = [
  "account_role",
  "account_status",
  "audit_actor_type",
  "audit_operation",
  "audit_source",
  "creator_metric_source",
  "creator_type",
  "email_attempt_status",
  "email_outbox_status",
  "email_template",
  "identity_auth_effect_status",
  "identity_provider",
  "legal_document_type",
  "media_kind",
  "media_status",
  "moderation_action",
  "placement_audience",
  "placement_type",
  "social_platform",
] as const;

const requiredTables = [
  "account_consents",
  "account_contact_preferences",
  "accounts",
  "audit_revisions",
  "blocked_identities",
  "company_locations",
  "company_profiles",
  "creator_metric_snapshots",
  "creator_niches",
  "creator_profiles",
  "email_attempts",
  "email_outbox",
  "identity_auth_effects",
  "legal_documents",
  "media_assets",
  "moderation_cases",
  "moderation_events",
  "niches",
  "onboarding_drafts",
  "social_profiles",
  "sponsorship_placements",
] as const;

describeLocalStack("core database schema", () => {
  afterAll(async () => {
    await database.end({ timeout: 2 });
  });

  it("installs the required search and UUID extensions", async () => {
    const extensions = await database<{ extension_name: string }[]>`
      select extname as extension_name
      from pg_extension
      where extname in ('pgcrypto', 'pg_trgm', 'unaccent')
      order by extname
    `;

    expect(extensions.map(({ extension_name }) => extension_name)).toEqual([
      "pg_trgm",
      "pgcrypto",
      "unaccent",
    ]);
  });

  it("defines the complete domain enum set", async () => {
    const enums = await database<{ enum_name: string }[]>`
      select distinct t.typname as enum_name
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and t.typtype = 'e'
      order by t.typname
    `;

    expect(enums.map(({ enum_name }) => enum_name)).toEqual(requiredEnums);
  });

  it("creates every core business and history table", async () => {
    const tables = await database<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
      order by table_name
    `;

    expect(tables.map(({ table_name }) => table_name)).toEqual(requiredTables);
  });

  it("keeps auth linkage, business identifiers, and idempotency keys unique", async () => {
    const uniqueIndexes = await database<{ index_name: string }[]>`
      select indexname as index_name
      from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'accounts_auth_user_id_uidx',
          'company_profiles_cnpj_uidx',
          'email_outbox_idempotency_key_uidx',
          'identity_auth_effects_idempotency_key_uidx',
          'legal_documents_type_version_uidx',
          'media_assets_bucket_path_uidx'
        )
      order by indexname
    `;

    expect(uniqueIndexes.map(({ index_name }) => index_name)).toEqual([
      "accounts_auth_user_id_uidx",
      "company_profiles_cnpj_uidx",
      "email_outbox_idempotency_key_uidx",
      "identity_auth_effects_idempotency_key_uidx",
      "legal_documents_type_version_uidx",
      "media_assets_bucket_path_uidx",
    ]);
  });

  it("adds optimistic version and soft-archive columns to mutable aggregates", async () => {
    const aggregateColumns = await database<
      { table_name: string; columns: string[] }[]
    >`
      select
        table_name,
        array_agg(column_name order by column_name) as columns
      from information_schema.columns
      where table_schema = 'public'
        and table_name in (
          'accounts',
          'company_locations',
          'company_profiles',
          'creator_profiles',
          'media_assets',
          'moderation_cases',
          'social_profiles',
          'sponsorship_placements'
        )
        and column_name in ('archived_at', 'version')
      group by table_name
      order by table_name
    `;

    expect(aggregateColumns).toHaveLength(8);
    for (const aggregate of aggregateColumns) {
      expect(aggregate.columns).toEqual(["archived_at", "version"]);
    }
  });

  it("enforces moderation events as append-only history", async () => {
    const triggers = await database<{ trigger_name: string }[]>`
      select trigger_name
      from information_schema.triggers
      where event_object_schema = 'public'
        and event_object_table = 'moderation_events'
        and action_timing = 'BEFORE'
        and event_manipulation in ('UPDATE', 'DELETE')
      order by trigger_name, event_manipulation
    `;

    expect(triggers.map(({ trigger_name }) => trigger_name)).toEqual([
      "moderation_events_immutable_trigger",
      "moderation_events_immutable_trigger",
    ]);
  });

  it("keeps every Drizzle application table and column aligned with SQL", async () => {
    for (const table of applicationTables) {
      const tableName = getTableName(table);
      const drizzleColumns = Object.values(getTableColumns(table))
        .map((column) => column.name)
        .sort();
      const databaseColumns = await database<{ column_name: string }[]>`
        select column_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name = ${tableName}
        order by column_name
      `;

      expect(
        databaseColumns.map(({ column_name }) => column_name),
        `${tableName} differs between SQL and Drizzle`,
      ).toEqual(drizzleColumns);
    }
  });

  it("loads deterministic synthetic coverage for local product workflows", async () => {
    const [coverage] = await database<
      {
        account_roles: string[];
        account_statuses: string[];
        creator_types: string[];
        niche_count: number;
        placement_count: number;
        audit_count: number;
        blocked_identity_count: number;
        outbox_count: number;
        non_fixture_email_count: number;
      }[]
    >`
      select
        (
          select array_agg(distinct role::text order by role::text)
          from accounts
        ) as account_roles,
        (
          select array_agg(distinct status::text order by status::text)
          from accounts
        ) as account_statuses,
        (
          select array_agg(distinct creator_type::text order by creator_type::text)
          from creator_profiles
        ) as creator_types,
        (select count(*)::integer from niches) as niche_count,
        (select count(*)::integer from sponsorship_placements) as placement_count,
        (select count(*)::integer from audit_revisions) as audit_count,
        (select count(*)::integer from blocked_identities) as blocked_identity_count,
        (select count(*)::integer from email_outbox) as outbox_count,
        (
          select count(*)::integer
          from accounts
          where operational_email not like '%@contentecreators.test'
        ) as non_fixture_email_count
    `;

    expect(coverage.account_roles).toEqual(["ADMIN", "COMPANY", "INFLUENCER"]);
    expect(coverage.account_statuses).toEqual([
      "APPROVED",
      "BANNED",
      "CHANGES_REQUESTED",
      "ONBOARDING",
      "PENDING_REVIEW",
      "SUSPENDED",
    ]);
    expect(coverage.creator_types).toEqual(["INFLUENCER", "UGC"]);
    expect(coverage.niche_count).toBeGreaterThanOrEqual(5);
    expect(coverage.placement_count).toBeGreaterThanOrEqual(2);
    expect(coverage.audit_count).toBeGreaterThan(0);
    expect(coverage.blocked_identity_count).toBeGreaterThan(0);
    expect(coverage.outbox_count).toBeGreaterThan(0);
    expect(coverage.non_fixture_email_count).toBe(0);
  });
});
