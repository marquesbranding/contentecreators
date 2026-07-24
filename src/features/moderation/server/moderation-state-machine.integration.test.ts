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

async function assertDatabaseTransition(input: {
  action:
    | "SUBMIT"
    | "REQUEST_CHANGES"
    | "RESUBMIT"
    | "APPROVE"
    | "SUSPEND"
    | "RESTORE"
    | "BAN"
    | "UNBAN"
    | "ARCHIVE";
  actorIsOwner: boolean;
  actorRole: "ADMIN" | "INFLUENCER" | "COMPANY";
  fromStatus:
    | "ONBOARDING"
    | "PENDING_REVIEW"
    | "CHANGES_REQUESTED"
    | "APPROVED"
    | "SUSPENDED"
    | "BANNED";
  lastStatusBeforeBan?:
    "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "SUSPENDED";
  reason?: string;
  toStatus:
    | "ONBOARDING"
    | "PENDING_REVIEW"
    | "CHANGES_REQUESTED"
    | "APPROVED"
    | "SUSPENDED"
    | "BANNED";
}) {
  return database`
    select public.app_assert_moderation_transition(
      ${input.fromStatus}::public.account_status,
      ${input.toStatus}::public.account_status,
      ${input.action}::public.moderation_action,
      ${input.actorRole}::public.account_role,
      ${input.actorIsOwner},
      ${input.reason ?? null}::text,
      ${input.lastStatusBeforeBan ?? null}::public.account_status
    )
  `;
}

describeLocalStack("database moderation state machine", () => {
  afterAll(async () => {
    await database.end({ timeout: 2 });
  });

  it("installs the transition assertion and trusted event validator", async () => {
    const [shape] = await database<
      {
        actor_required: boolean;
        assertion_exists: boolean;
        insert_trigger_exists: boolean;
      }[]
    >`
      select
        exists (
          select 1
          from pg_proc procedure
          join pg_namespace namespace on namespace.oid = procedure.pronamespace
          where namespace.nspname = 'public'
            and procedure.proname = 'app_assert_moderation_transition'
        ) as assertion_exists,
        exists (
          select 1
          from information_schema.triggers
          where event_object_schema = 'public'
            and event_object_table = 'moderation_events'
            and trigger_name = 'moderation_events_validate_insert_trigger'
            and action_timing = 'BEFORE'
            and event_manipulation = 'INSERT'
        ) as insert_trigger_exists,
        (
          select is_nullable = 'NO'
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'moderation_events'
            and column_name = 'actor_account_id'
        ) as actor_required
    `;

    expect(shape).toEqual({
      actor_required: true,
      assertion_exists: true,
      insert_trigger_exists: true,
    });
  });

  it("accepts owner submission, admin moderation, exact unban restoration and archive", async () => {
    await expect(
      assertDatabaseTransition({
        action: "SUBMIT",
        actorIsOwner: true,
        actorRole: "INFLUENCER",
        fromStatus: "ONBOARDING",
        toStatus: "PENDING_REVIEW",
      }),
    ).resolves.toBeDefined();
    await expect(
      assertDatabaseTransition({
        action: "REQUEST_CHANGES",
        actorIsOwner: false,
        actorRole: "ADMIN",
        fromStatus: "PENDING_REVIEW",
        reason: "Atualize os dados indicados.",
        toStatus: "CHANGES_REQUESTED",
      }),
    ).resolves.toBeDefined();
    await expect(
      assertDatabaseTransition({
        action: "UNBAN",
        actorIsOwner: false,
        actorRole: "ADMIN",
        fromStatus: "BANNED",
        lastStatusBeforeBan: "CHANGES_REQUESTED",
        reason: "Banimento aplicado à conta incorreta.",
        toStatus: "CHANGES_REQUESTED",
      }),
    ).resolves.toBeDefined();
    await expect(
      assertDatabaseTransition({
        action: "ARCHIVE",
        actorIsOwner: false,
        actorRole: "ADMIN",
        fromStatus: "APPROVED",
        reason: "Cadastro removido da operação.",
        toStatus: "APPROVED",
      }),
    ).resolves.toBeDefined();
  });

  it("rejects an undefined transition, the wrong actor, a missing reason and unban escalation", async () => {
    await expect(
      assertDatabaseTransition({
        action: "APPROVE",
        actorIsOwner: false,
        actorRole: "ADMIN",
        fromStatus: "ONBOARDING",
        toStatus: "APPROVED",
      }),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      assertDatabaseTransition({
        action: "SUBMIT",
        actorIsOwner: false,
        actorRole: "ADMIN",
        fromStatus: "ONBOARDING",
        toStatus: "PENDING_REVIEW",
      }),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      assertDatabaseTransition({
        action: "SUSPEND",
        actorIsOwner: false,
        actorRole: "ADMIN",
        fromStatus: "APPROVED",
        toStatus: "SUSPENDED",
      }),
    ).rejects.toMatchObject({ code: "22023" });
    await expect(
      assertDatabaseTransition({
        action: "UNBAN",
        actorIsOwner: false,
        actorRole: "ADMIN",
        fromStatus: "BANNED",
        lastStatusBeforeBan: "CHANGES_REQUESTED",
        reason: "Tentativa de elevar o acesso.",
        toStatus: "APPROVED",
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
