import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

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
const adminAccountId = "a0000000-0000-4000-8000-000000000001";
const adminAuthUserId = "10000000-0000-4000-8000-000000000001";

type AdminAction =
  | "APPROVE"
  | "REQUEST_CHANGES"
  | "SUSPEND"
  | "RESTORE"
  | "BAN"
  | "UNBAN"
  | "ARCHIVE";

interface TransitionFixture {
  accountId: string;
  action: AdminAction;
  expectedStatus:
    | "PENDING_REVIEW"
    | "CHANGES_REQUESTED"
    | "APPROVED"
    | "SUSPENDED"
    | "BANNED";
  expectedTemplate:
    | "APPROVED"
    | "CHANGES_REQUESTED"
    | "SUSPENDED"
    | "RESTORED"
    | "BANNED"
    | null;
  reason: string | null;
}

const transitionFixtures: TransitionFixture[] = [
  {
    accountId: "b0000000-0000-4000-8000-000000000002",
    action: "APPROVE",
    expectedStatus: "APPROVED",
    expectedTemplate: "APPROVED",
    reason: null,
  },
  {
    accountId: "c0000000-0000-4000-8000-000000000002",
    action: "REQUEST_CHANGES",
    expectedStatus: "CHANGES_REQUESTED",
    expectedTemplate: "CHANGES_REQUESTED",
    reason: "Corrija os dados destacados antes de reenviar.",
  },
  {
    accountId: "b0000000-0000-4000-8000-000000000004",
    action: "SUSPEND",
    expectedStatus: "SUSPENDED",
    expectedTemplate: "SUSPENDED",
    reason: "Acesso suspenso durante uma revisão operacional.",
  },
  {
    accountId: "b0000000-0000-4000-8000-000000000005",
    action: "RESTORE",
    expectedStatus: "APPROVED",
    expectedTemplate: "RESTORED",
    reason: "Revisão concluída e acesso restabelecido.",
  },
  {
    accountId: "c0000000-0000-4000-8000-000000000004",
    action: "BAN",
    expectedStatus: "BANNED",
    expectedTemplate: "BANNED",
    reason: "Violação confirmada dos termos da plataforma.",
  },
  {
    accountId: "b0000000-0000-4000-8000-000000000006",
    action: "UNBAN",
    expectedStatus: "PENDING_REVIEW",
    expectedTemplate: "RESTORED",
    reason: "Banimento aplicado à identidade incorreta.",
  },
  {
    accountId: "c0000000-0000-4000-8000-000000000004",
    action: "ARCHIVE",
    expectedStatus: "APPROVED",
    expectedTemplate: null,
    reason: "Cadastro removido da operação a pedido do cliente.",
  },
];

async function setAdminContext(
  transaction: postgres.TransactionSql,
  requestId: string,
  reason: string | null,
) {
  await transaction`
    select
      set_config('app.jwt.auth_user_id', ${adminAuthUserId}, true),
      set_config('app.jwt.account_id', ${adminAccountId}, true),
      set_config('app.jwt.account_role', 'ADMIN', true),
      set_config('app.jwt.account_status', 'APPROVED', true),
      set_config('app.jwt.request_id', ${requestId}, true),
      set_config('app.audit.actor_account_id', ${adminAccountId}, true),
      set_config('app.audit.actor_type', 'ADMIN', true),
      set_config('app.audit.actor_role', 'ADMIN', true),
      set_config('app.audit.source', 'BACKOFFICE', true),
      set_config('app.audit.request_id', ${requestId}, true),
      set_config('app.audit.reason', ${reason ?? ""}, true)
  `;
}

describeLocalStack("admin moderation transactions", () => {
  afterAll(async () => {
    await database.end({ timeout: 2 });
  });

  it.each(transitionFixtures)(
    "applies $action atomically with event, audit, outbox and idempotency",
    async (fixture) => {
      const rollback = new Error(`rollback ${fixture.action}`);
      let proof:
        | {
            archived: boolean;
            authEffectCount: number;
            auditTables: string[];
            blockedIdentityCount: number;
            catalogEligible: boolean;
            eventCount: number;
            firstResult: string;
            outboxCount: number;
            outboxTemplate: string | null;
            retryResult: string;
            status: string;
            unblockedIdentityCount: number;
          }
        | undefined;

      try {
        await database.begin(async (transaction) => {
          const requestId = `admin-moderation-${fixture.action.toLowerCase()}`;
          const idempotencyKey = `${requestId}:${fixture.accountId}`;
          await setAdminContext(transaction, requestId, fixture.reason);

          const [before] = await transaction<
            { account_version: number; profile_version: number }[]
          >`
            select
              account.version as account_version,
              coalesce(creator.version, company.version) as profile_version
            from public.accounts account
            left join public.creator_profiles creator
              on creator.account_id = account.id
              and creator.archived_at is null
            left join public.company_profiles company
              on company.account_id = account.id
              and company.archived_at is null
            where account.id = ${fixture.accountId}
          `;

          if (!before) {
            throw new Error("Moderation fixture was not found.");
          }

          await transaction`set local role contente_app_user`;
          const [first] = await transaction<{ result_kind: string }[]>`
            select result_kind
            from public.app_apply_admin_moderation(
              ${fixture.accountId}::uuid,
              ${fixture.action}::public.moderation_action,
              ${fixture.reason}::text,
              ${before.account_version},
              ${before.profile_version},
              ${idempotencyKey}
            )
          `;
          const [retry] = await transaction<{ result_kind: string }[]>`
            select result_kind
            from public.app_apply_admin_moderation(
              ${fixture.accountId}::uuid,
              ${fixture.action}::public.moderation_action,
              ${fixture.reason}::text,
              ${before.account_version},
              ${before.profile_version},
              ${idempotencyKey}
            )
          `;
          await transaction`reset role`;

          const [state] = await transaction<
            {
              archived: boolean;
              auth_effect_count: number;
              audit_tables: string[];
              blocked_identity_count: number;
              catalog_eligible: boolean;
              event_count: number;
              outbox_count: number;
              outbox_template: string | null;
              status: string;
              unblocked_identity_count: number;
            }[]
          >`
            select
              account.status::text as status,
              account.archived_at is not null as archived,
              (
                account.status = 'APPROVED'
                and account.archived_at is null
                and coalesce(creator.archived_at, company.archived_at) is null
              ) as catalog_eligible,
              (
                select count(*)::integer
                from public.moderation_events event
                join public.moderation_cases moderation_case
                  on moderation_case.id = event.moderation_case_id
                where moderation_case.account_id = account.id
                  and event.idempotency_key = ${idempotencyKey}
              ) as event_count,
              (
                select count(*)::integer
                from public.email_outbox outbox
                where outbox.idempotency_key =
                  ${`moderation-email:${idempotencyKey}`}
              ) as outbox_count,
              (
                select outbox.template::text
                from public.email_outbox outbox
                where outbox.idempotency_key =
                  ${`moderation-email:${idempotencyKey}`}
              ) as outbox_template,
              (
                select count(*)::integer
                from public.identity_auth_effects effect
                where effect.idempotency_key =
                  ${`moderation-auth:${idempotencyKey}`}
              ) as auth_effect_count,
              (
                select count(*)::integer
                from public.blocked_identities blocked
                where blocked.originating_account_id = account.id
                  and blocked.unblocked_at is null
                  and blocked.archived_at is null
              ) as blocked_identity_count,
              (
                select count(*)::integer
                from public.blocked_identities blocked
                where blocked.originating_account_id = account.id
                  and blocked.unblocked_at is not null
              ) as unblocked_identity_count,
              (
                select coalesce(
                  array_agg(distinct revision.entity_table order by revision.entity_table),
                  '{}'::text[]
                )
                from public.audit_revisions revision
                where revision.request_id = ${requestId}
              ) as audit_tables
            from public.accounts account
            left join public.creator_profiles creator
              on creator.account_id = account.id
            left join public.company_profiles company
              on company.account_id = account.id
            where account.id = ${fixture.accountId}
          `;

          if (!first || !retry || !state) {
            throw new Error("Admin moderation proof was not produced.");
          }

          proof = {
            archived: state.archived,
            authEffectCount: state.auth_effect_count,
            auditTables: state.audit_tables,
            blockedIdentityCount: state.blocked_identity_count,
            catalogEligible: state.catalog_eligible,
            eventCount: state.event_count,
            firstResult: first.result_kind,
            outboxCount: state.outbox_count,
            outboxTemplate: state.outbox_template,
            retryResult: retry.result_kind,
            status: state.status,
            unblockedIdentityCount: state.unblocked_identity_count,
          };
          throw rollback;
        });
      } catch (error) {
        if (error !== rollback) {
          throw error;
        }
      }

      expect(proof).toMatchObject({
        archived: fixture.action === "ARCHIVE",
        authEffectCount:
          fixture.action === "BAN" || fixture.action === "UNBAN" ? 1 : 0,
        auditTables: expect.arrayContaining(["accounts", "moderation_events"]),
        blockedIdentityCount: fixture.action === "BAN" ? 1 : 0,
        catalogEligible:
          fixture.action === "APPROVE" || fixture.action === "RESTORE",
        eventCount: 1,
        firstResult: "APPLIED",
        outboxCount: fixture.expectedTemplate ? 1 : 0,
        outboxTemplate: fixture.expectedTemplate,
        retryResult: "ALREADY_APPLIED",
        status: fixture.expectedStatus,
        unblockedIdentityCount: fixture.action === "UNBAN" ? 1 : 0,
      });
    },
  );

  it("rejects stale account and profile versions before changing business state", async () => {
    await expect(
      database.begin(async (transaction) => {
        await setAdminContext(
          transaction,
          "admin-moderation-stale",
          "Ação com revisão desatualizada.",
        );
        await transaction`set local role contente_app_user`;
        await transaction`
          select *
          from public.app_apply_admin_moderation(
            'b0000000-0000-4000-8000-000000000002'::uuid,
            'APPROVE'::public.moderation_action,
            null,
            999999,
            999999,
            'admin-moderation:stale:approve'
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "40001" });
  });

  it("removes a suspended profile from an approved viewer catalog immediately", async () => {
    const rollback = new Error("rollback catalog visibility");
    let visibleRows = -1;

    try {
      await database.begin(async (transaction) => {
        const accountId = "b0000000-0000-4000-8000-000000000004";
        const [before] = await transaction<
          { account_version: number; profile_version: number }[]
        >`
          select
            account.version as account_version,
            profile.version as profile_version
          from public.accounts account
          join public.creator_profiles profile on profile.account_id = account.id
          where account.id = ${accountId}
        `;

        if (!before) {
          throw new Error("Approved creator fixture was not found.");
        }

        await setAdminContext(
          transaction,
          "admin-moderation-catalog-visibility",
          "Suspensão para validar a remoção imediata do catálogo.",
        );
        await transaction`set local role contente_app_user`;
        await transaction`
          select *
          from public.app_apply_admin_moderation(
            ${accountId}::uuid,
            'SUSPEND'::public.moderation_action,
            'Suspensão para validar a remoção imediata do catálogo.',
            ${before.account_version},
            ${before.profile_version},
            'admin-moderation:catalog-visibility:suspend'
          )
        `;

        await transaction`
          select
            set_config('app.jwt.auth_user_id', '30000000-0000-4000-8000-000000000004', true),
            set_config('app.jwt.account_id', 'c0000000-0000-4000-8000-000000000004', true),
            set_config('app.jwt.account_role', 'COMPANY', true),
            set_config('app.jwt.account_status', 'APPROVED', true)
        `;
        const rows = await transaction<{ id: string }[]>`
          select profile.id
          from public.creator_profiles profile
          where profile.account_id = ${accountId}
        `;
        visibleRows = rows.length;
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(visibleRows).toBe(0);
  });

  it("keeps failed Auth effects retryable and completes them idempotently", async () => {
    const rollback = new Error("rollback auth effect retry");
    let proof:
      | {
          auditCount: number;
          failedAttempts: number;
          failedStatus: string;
          repeatedAttempts: number;
          repeatedStatus: string;
          syncedAttempts: number;
          syncedStatus: string;
        }
      | undefined;

    try {
      await database.begin(async (transaction) => {
        const requestId = "admin-moderation-auth-effect-retry";
        const effectId = "f9000000-0000-4000-8000-000000000001";
        await setAdminContext(
          transaction,
          requestId,
          "Validar o tratamento operacional de falha do Supabase Auth.",
        );
        await transaction`set local role contente_app_user`;

        const [failed] = await transaction<
          { attempt_count: number; effect_status: string }[]
        >`
          select effect_status, attempt_count
          from public.app_complete_identity_auth_effect(
            ${effectId}::uuid,
            false,
            'SUPABASE_AUTH'
          )
        `;
        const [synced] = await transaction<
          { attempt_count: number; effect_status: string }[]
        >`
          select effect_status, attempt_count
          from public.app_complete_identity_auth_effect(
            ${effectId}::uuid,
            true,
            null
          )
        `;
        const [repeated] = await transaction<
          { attempt_count: number; effect_status: string }[]
        >`
          select effect_status, attempt_count
          from public.app_complete_identity_auth_effect(
            ${effectId}::uuid,
            false,
            'SUPABASE_AUTH'
          )
        `;
        await transaction`reset role`;

        const [{ audit_count: auditCount }] = await transaction<
          { audit_count: number }[]
        >`
          select count(*)::integer as audit_count
          from public.audit_revisions revision
          where revision.request_id = ${requestId}
            and revision.entity_table = 'identity_auth_effects'
        `;

        if (!failed || !synced || !repeated) {
          throw new Error("Auth effect retry proof was not produced.");
        }

        proof = {
          auditCount,
          failedAttempts: failed.attempt_count,
          failedStatus: failed.effect_status,
          repeatedAttempts: repeated.attempt_count,
          repeatedStatus: repeated.effect_status,
          syncedAttempts: synced.attempt_count,
          syncedStatus: synced.effect_status,
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(proof).toEqual({
      auditCount: 2,
      failedAttempts: 1,
      failedStatus: "FAILED",
      repeatedAttempts: 2,
      repeatedStatus: "SYNCED",
      syncedAttempts: 2,
      syncedStatus: "SYNCED",
    });
  });
});
