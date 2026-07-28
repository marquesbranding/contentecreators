import { eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { creatorProfiles } from "@/db/schema";

import { createAuditedTransactionRunner } from "./services/audited-transaction";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const database = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 5,
  idle_timeout: 1,
});
const drizzleClient = createDatabaseClient(databaseUrl);
const runAuditedTransaction = createAuditedTransactionRunner(
  drizzleClient.database,
);

const auditedTables = [
  "account_consents",
  "account_contact_preferences",
  "accounts",
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
  "social_profiles",
  "sponsorship_placements",
] as const;

async function setAuditContext(
  transaction: postgres.TransactionSql,
  requestId: string,
) {
  await transaction`
    select
      set_config('app.audit.actor_account_id', 'a0000000-0000-4000-8000-000000000001', true),
      set_config('app.audit.actor_type', 'ADMIN', true),
      set_config('app.audit.actor_role', 'ADMIN', true),
      set_config('app.audit.source', 'BACKOFFICE', true),
      set_config('app.audit.request_id', ${requestId}, true),
      set_config('app.audit.reason', 'Teste integrado de auditoria', true)
  `;
}

describeLocalStack("Envers-style audit triggers", () => {
  afterAll(async () => {
    await database`
      update creator_profiles
      set bio = case id
        when 'd0000000-0000-4000-8000-000000000004'
          then 'Perfil sintético aprovado para testes do catálogo.'
        when 'd0000000-0000-4000-8000-000000000005'
          then 'Perfil sintético suspenso.'
        else bio
      end
      where id in (
        'd0000000-0000-4000-8000-000000000004',
        'd0000000-0000-4000-8000-000000000005'
      )
    `;
    await database.end({ timeout: 2 });
    await drizzleClient.client.end({ timeout: 2 });
  });

  it("attaches one generic revision trigger to every audited aggregate", async () => {
    const tables = await database<{ table_name: string }[]>`
      select distinct event_object_table as table_name
      from information_schema.triggers
      where event_object_schema = 'public'
        and trigger_name like '%_audit_revision_trigger'
      order by event_object_table
    `;

    expect(tables.map(({ table_name }) => table_name)).toEqual(auditedTables);
  });

  it("records insert, update, and archive with verified context and redaction", async () => {
    await database.begin(async (transaction) => {
      await setAuditContext(transaction, "audit-insert-update-archive");

      await transaction`
        insert into media_assets (
          id,
          owner_account_id,
          bucket_name,
          object_path,
          kind,
          mime_type,
          size_bytes,
          status
        )
        values (
          'f8000000-0000-4000-8000-000000000001',
          'a0000000-0000-4000-8000-000000000001',
          'sponsorship-media',
          'local-fixture/audit/asset.webp',
          'SPONSORSHIP_CREATIVE',
          'image/webp',
          2048,
          'ACTIVE'
        )
      `;

      await transaction`
        update media_assets
        set status = 'ARCHIVED',
            archived_at = now()
        where id = 'f8000000-0000-4000-8000-000000000001'
      `;
    });

    const revisions = await database<
      {
        operation: string;
        actor_type: string;
        actor_role: string | null;
        source: string;
        request_id: string | null;
        changed_fields: string[];
        before_state: Record<string, unknown> | null;
        after_state: Record<string, unknown> | null;
      }[]
    >`
      select
        operation,
        actor_type,
        actor_role,
        source,
        request_id,
        changed_fields,
        before_state,
        after_state
      from audit_revisions
      where entity_table = 'media_assets'
        and entity_id = 'f8000000-0000-4000-8000-000000000001'
      order by revision
    `;

    expect(revisions.map(({ operation }) => operation)).toEqual([
      "INSERT",
      "ARCHIVE",
    ]);
    expect(revisions[1]).toMatchObject({
      actor_type: "ADMIN",
      actor_role: "ADMIN",
      source: "BACKOFFICE",
      request_id: "audit-insert-update-archive",
    });
    expect(revisions[1]?.changed_fields).toEqual(
      expect.arrayContaining(["archived_at", "status", "version"]),
    );
    expect(revisions[0]?.after_state).toMatchObject({
      object_path: "[REDACTED]",
    });
  });

  it("does not leak transaction-local actor context through a reused connection", async () => {
    await database.begin(async (transaction) => {
      await setAuditContext(transaction, "known-audit-context");
      await transaction`
        update creator_profiles
        set bio = 'Alteração feita com contexto conhecido.'
        where id = 'd0000000-0000-4000-8000-000000000004'
      `;
    });

    await database.begin(async (transaction) => {
      await transaction`
        update creator_profiles
        set bio = 'Alteração sem contexto para validar isolamento.'
        where id = 'd0000000-0000-4000-8000-000000000005'
      `;
    });

    const [revision] = await database<
      {
        actor_account_id: string | null;
        actor_type: string;
        source: string;
        request_id: string | null;
      }[]
    >`
      select actor_account_id, actor_type, source, request_id
      from audit_revisions
      where entity_table = 'creator_profiles'
        and entity_id = 'd0000000-0000-4000-8000-000000000005'
      order by revision desc
      limit 1
    `;

    expect(revision).toEqual({
      actor_account_id: null,
      actor_type: "SYSTEM_UNKNOWN",
      source: "DATABASE",
      request_id: null,
    });
  });

  it("sets verified context through the server-only Drizzle write wrapper", async () => {
    await runAuditedTransaction(
      {
        actorAccountId: "a0000000-0000-4000-8000-000000000001",
        actorType: "ADMIN",
        actorRole: "ADMIN",
        source: "BACKOFFICE",
        requestId: "drizzle-audit-wrapper",
        reason: "Teste integrado do wrapper",
      },
      async (transaction) => {
        await transaction
          .update(creatorProfiles)
          .set({ bio: "Alteração pelo wrapper Drizzle auditado." })
          .where(
            eq(creatorProfiles.id, "d0000000-0000-4000-8000-000000000004"),
          );
      },
    );

    const [revision] = await database<
      {
        actor_account_id: string | null;
        actor_type: string;
        actor_role: string | null;
        source: string;
        request_id: string | null;
      }[]
    >`
      select
        actor_account_id,
        actor_type,
        actor_role,
        source,
        request_id
      from audit_revisions
      where request_id = 'drizzle-audit-wrapper'
      order by revision desc
      limit 1
    `;

    expect(revision).toEqual({
      actor_account_id: "a0000000-0000-4000-8000-000000000001",
      actor_type: "ADMIN",
      actor_role: "ADMIN",
      source: "BACKOFFICE",
      request_id: "drizzle-audit-wrapper",
    });
  });

  it("emits structured metadata-only telemetry for unknown write context", async () => {
    const listener = postgres(databaseUrl, {
      max: 1,
      connect_timeout: 5,
      idle_timeout: 1,
    });
    let resolvePayload: (value: string) => void = () => undefined;
    const payloadPromise = new Promise<string>((resolve) => {
      resolvePayload = resolve;
    });
    const subscription = await listener.listen(
      "audit_system_unknown",
      resolvePayload,
    );

    try {
      await database.begin(async (transaction) => {
        await transaction`
          update company_profiles
          set description = 'Alteração para telemetria sem contexto.'
          where id = 'e0000000-0000-4000-8000-000000000004'
        `;
      });

      const payload = JSON.parse(
        await Promise.race([
          payloadPromise,
          new Promise<string>((_, reject) => {
            setTimeout(
              () => reject(new Error("Audit telemetry was not emitted")),
              5_000,
            );
          }),
        ]),
      ) as Record<string, unknown>;

      expect(payload).toEqual({
        code: "audit_context_missing",
        entity_table: "company_profiles",
        operation: "UPDATE",
        request_id: null,
        source: "DATABASE",
      });
      expect(Object.keys(payload).sort()).toEqual([
        "code",
        "entity_table",
        "operation",
        "request_id",
        "source",
      ]);
    } finally {
      await subscription.unlisten();
      await listener.end({ timeout: 2 });
    }
  });

  it("produces at least one immutable revision for every audited aggregate", async () => {
    const tables = await database<{ entity_table: string }[]>`
      select distinct entity_table
      from audit_revisions
      where entity_table = any(${database.array([...auditedTables])})
      order by entity_table
    `;

    expect(tables.map(({ entity_table }) => entity_table)).toEqual(
      auditedTables,
    );
  });

  it("prevents audit revisions from being changed or deleted", async () => {
    const [{ revision }] = await database<{ revision: string }[]>`
      select revision::text
      from audit_revisions
      order by revision
      limit 1
    `;

    await expect(
      database`
        update audit_revisions
        set reason = 'Tentativa de adulteração'
        where revision = ${revision}
      `,
    ).rejects.toThrow(/append-only/);

    await expect(
      database`
        delete from audit_revisions
        where revision = ${revision}
      `,
    ).rejects.toThrow(/append-only/);
  });
});
