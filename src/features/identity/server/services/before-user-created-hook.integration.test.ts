import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const database = postgres(databaseUrl, {
  max: 1,
  prepare: false,
});
const blockingAdminId = "a0000000-0000-4000-8000-000000000001";
const rollback = new Error("rollback before-user-created hook");

function eventFor(input: {
  email: string;
  provider: "email" | "google";
  subject?: string;
}) {
  return {
    metadata: {
      name: "before-user-created",
      time: "2026-07-24T12:00:00.000Z",
      uuid: crypto.randomUUID(),
    },
    user: {
      app_metadata: {
        provider: input.provider,
        providers: [input.provider],
      },
      email: input.email,
      identities: input.subject
        ? [
            {
              identity_data: {
                sub: input.subject,
              },
              provider: input.provider,
              provider_id: input.subject,
            },
          ]
        : [],
      user_metadata: input.subject
        ? {
            sub: input.subject,
          }
        : {},
    },
  };
}

describeLocalStack("Before User Created blocked-identity hook", () => {
  afterAll(async () => {
    await database.end({ timeout: 2 });
  });

  it("denies normalized blocked email and Google identities with one generic error", async () => {
    let results:
      | {
          allowed: Record<string, unknown>;
          emailBlocked: Record<string, unknown>;
          googleEmailBlocked: Record<string, unknown>;
          googleSubjectBlocked: Record<string, unknown>;
        }
      | undefined;

    try {
      await database.begin(async (transaction) => {
        await transaction`
          select
            set_config('app.audit.actor_account_id', ${blockingAdminId}, true),
            set_config('app.audit.actor_type', 'ADMIN', true),
            set_config('app.audit.actor_role', 'ADMIN', true),
            set_config('app.audit.source', 'BACKOFFICE', true),
            set_config('app.audit.request_id', 'before-user-created-hook-test', true),
            set_config('app.audit.reason', 'Synthetic blocked identity fixture', true)
        `;
        await transaction`
          insert into public.blocked_identities (
            provider,
            identity_key_hash,
            provider_subject_hash,
            reason,
            blocked_by_account_id
          )
          values
            (
              'EMAIL',
              public.app_identity_key_hash('blocked@example.com'),
              null,
              'Synthetic email block',
              ${blockingAdminId}
            ),
            (
              'GOOGLE',
              public.app_identity_key_hash('google-blocked@example.com'),
              null,
              'Synthetic Google email block',
              ${blockingAdminId}
            ),
            (
              'GOOGLE',
              public.app_identity_key_hash('prior-email@example.com'),
              public.app_identity_subject_hash('google-subject-123'),
              'Synthetic Google subject block',
              ${blockingAdminId}
            )
        `;
        const [emailBlocked] = await transaction<
          [{ hook_result: Record<string, unknown> }]
        >`
          select public.before_user_created(
            ${transaction.json(
              eventFor({
                email: " BLOCKED@EXAMPLE.COM ",
                provider: "email",
              }),
            )}::jsonb
          ) as hook_result
        `;
        const [googleEmailBlocked] = await transaction<
          [{ hook_result: Record<string, unknown> }]
        >`
          select public.before_user_created(
            ${transaction.json(
              eventFor({
                email: "google-blocked@example.com",
                provider: "google",
                subject: "another-google-subject",
              }),
            )}::jsonb
          ) as hook_result
        `;
        const [googleSubjectBlocked] = await transaction<
          [{ hook_result: Record<string, unknown> }]
        >`
          select public.before_user_created(
            ${transaction.json(
              eventFor({
                email: "changed-email@example.com",
                provider: "google",
                subject: "google-subject-123",
              }),
            )}::jsonb
          ) as hook_result
        `;
        const [allowed] = await transaction<
          [{ hook_result: Record<string, unknown> }]
        >`
          select public.before_user_created(
            ${transaction.json(
              eventFor({
                email: "allowed@example.com",
                provider: "email",
              }),
            )}::jsonb
          ) as hook_result
        `;

        results = {
          allowed: allowed!.hook_result,
          emailBlocked: emailBlocked!.hook_result,
          googleEmailBlocked: googleEmailBlocked!.hook_result,
          googleSubjectBlocked: googleSubjectBlocked!.hook_result,
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    const deniedResult = {
      error: {
        http_code: 403,
        message: "Não foi possível criar esta conta.",
      },
    };

    expect(results).toEqual({
      allowed: {},
      emailBlocked: deniedResult,
      googleEmailBlocked: deniedResult,
      googleSubjectBlocked: deniedResult,
    });
  });

  it("is wired into local Supabase Auth and prevents the blocked email user row", async () => {
    const blockedEmail = "blocked-auth-hook@contentecreators.test";
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
      throw new Error("Local Supabase public test configuration is missing.");
    }

    await database.begin(async (transaction) => {
      await transaction`
        select
          set_config('app.audit.actor_account_id', ${blockingAdminId}, true),
          set_config('app.audit.actor_type', 'ADMIN', true),
          set_config('app.audit.actor_role', 'ADMIN', true),
          set_config('app.audit.source', 'BACKOFFICE', true),
          set_config('app.audit.request_id', 'before-user-created-auth-test', true),
          set_config('app.audit.reason', 'Synthetic committed Auth hook fixture', true)
      `;
      await transaction`
        insert into public.blocked_identities (
          provider,
          identity_key_hash,
          reason,
          blocked_by_account_id
        )
        values (
          'EMAIL',
          public.app_identity_key_hash(${blockedEmail}),
          'Synthetic Auth hook block',
          ${blockingAdminId}
        )
      `;
    });

    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { data, error } = await authClient.auth.signUp({
      email: blockedEmail,
      password: "LocalBlocked123!",
    });
    const [persistedIdentity] = await database<
      [{ exists: boolean }]
    >`
      select exists (
        select 1
        from auth.users
        where lower(email) = ${blockedEmail}
      ) as exists
    `;

    expect(error?.message).toContain("Não foi possível criar esta conta.");
    expect(data.user).toBeNull();
    expect(persistedIdentity?.exists).toBe(false);
  });

  it("documents the MVP limit by allowing a different unknown email and provider subject", async () => {
    const [result] = await database<
      [{ hook_result: Record<string, unknown> }]
    >`
      select public.before_user_created(
        ${database.json(
          eventFor({
            email: "unknown-new-identity@example.com",
            provider: "google",
            subject: "unknown-google-subject",
          }),
        )}::jsonb
      ) as hook_result
    `;

    expect(result?.hook_result).toEqual({});
  });
});
