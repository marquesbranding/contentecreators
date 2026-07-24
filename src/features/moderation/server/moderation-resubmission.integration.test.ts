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
const accountId = "b0000000-0000-4000-8000-000000000003";
const commandKey = "resubmit:b0000000-0000-4000-8000-000000000003:test";
const rollback = new Error("rollback moderation resubmission");

describeLocalStack("moderation correction resubmission", () => {
  afterAll(async () => {
    await database.end({ timeout: 2 });
  });

  it("atomically increments the sequence, preserves history, queues one notification and deduplicates retries", async () => {
    let proof:
      | {
          accountStatus: string;
          accountVersion: number;
          eventCount: number;
          firstResult: string;
          outboxCount: number;
          retryResult: string;
          sequence: number;
        }
      | undefined;

    try {
      await database.begin(async (transaction) => {
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
          throw new Error("Synthetic changed-requested account was not found.");
        }

        await transaction`
          select
            set_config('app.jwt.auth_user_id', '20000000-0000-4000-8000-000000000003', true),
            set_config('app.jwt.account_id', ${accountId}, true),
            set_config('app.jwt.account_role', 'INFLUENCER', true),
            set_config('app.jwt.account_status', 'CHANGES_REQUESTED', true),
            set_config('app.jwt.request_id', 'resubmission-integration', true),
            set_config('app.audit.actor_account_id', ${accountId}, true),
            set_config('app.audit.actor_type', 'USER', true),
            set_config('app.audit.actor_role', 'INFLUENCER', true),
            set_config('app.audit.source', 'APPLICATION', true),
            set_config('app.audit.request_id', 'resubmission-integration', true),
            set_config('app.audit.reason', 'Resubmit corrected profile', true)
        `;

        await transaction`
          update public.creator_profiles
          set bio = 'Perfil sintético corrigido e pronto para uma nova análise.'
          where account_id = ${accountId}
            and version = ${before.profile_version}
        `;
        await transaction`
          update public.accounts
          set completion_percentage = completion_percentage
          where id = ${accountId}
            and version = ${before.account_version}
        `;
        await transaction`set local role contente_app_user`;

        const [first] = await transaction<{ result_kind: string }[]>`
          select result_kind
          from public.app_resubmit_moderation(
            ${accountId}::uuid,
            ${before.account_version},
            ${before.profile_version},
            ${commandKey}
          )
        `;
        const [retry] = await transaction<{ result_kind: string }[]>`
          select result_kind
          from public.app_resubmit_moderation(
            ${accountId}::uuid,
            ${before.account_version},
            ${before.profile_version},
            ${commandKey}
          )
        `;

        await transaction`reset role`;

        const [state] = await transaction<
          {
            account_status: string;
            account_version: number;
            event_count: number;
            outbox_count: number;
            sequence: number;
          }[]
        >`
          select
            account.status::text as account_status,
            account.version as account_version,
            moderation_case.current_submission_sequence as sequence,
            (
              select count(*)::integer
              from public.moderation_events event
              where event.moderation_case_id = moderation_case.id
                and event.action = 'RESUBMIT'
                and event.idempotency_key = ${commandKey}
            ) as event_count,
            (
              select count(*)::integer
              from public.email_outbox outbox
              where outbox.account_id = account.id
                and outbox.idempotency_key = ${`onboarding-received:${commandKey}`}
            ) as outbox_count
          from public.accounts account
          join public.moderation_cases moderation_case
            on moderation_case.account_id = account.id
          where account.id = ${accountId}
        `;

        if (!first || !retry || !state) {
          throw new Error("Resubmission proof was not produced.");
        }

        proof = {
          accountStatus: state.account_status,
          accountVersion: state.account_version,
          eventCount: state.event_count,
          firstResult: first.result_kind,
          outboxCount: state.outbox_count,
          retryResult: retry.result_kind,
          sequence: state.sequence,
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(proof).toEqual({
      accountStatus: "PENDING_REVIEW",
      accountVersion: expect.any(Number),
      eventCount: 1,
      firstResult: "APPLIED",
      outboxCount: 1,
      retryResult: "ALREADY_APPLIED",
      sequence: 2,
    });
  });

  it("rejects a stale account or profile version without creating another event", async () => {
    await expect(
      database.begin(async (transaction) => {
        await transaction`
          select
            set_config('app.jwt.auth_user_id', '20000000-0000-4000-8000-000000000003', true),
            set_config('app.jwt.account_id', ${accountId}, true),
            set_config('app.jwt.account_role', 'INFLUENCER', true),
            set_config('app.jwt.account_status', 'CHANGES_REQUESTED', true),
            set_config('app.jwt.request_id', 'stale-resubmission-integration', true)
        `;
        await transaction`set local role contente_app_user`;
        await transaction`
          select *
          from public.app_resubmit_moderation(
            ${accountId}::uuid,
            999999,
            999999,
            'resubmit:stale-version:test'
          )
        `;
      }),
    ).rejects.toMatchObject({ code: "40001" });
  });
});
