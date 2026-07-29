import "server-only";

import { randomUUID } from "node:crypto";

import postgres, { type TransactionSql } from "postgres";

import { parseServerEnv } from "../src/shared/lib/env/server-env-schema";
import { assertLocalAdminProvisioningTarget } from "../src/shared/server/local-development/local-admin-target";

const LOCAL_ADMIN_DEFAULT_PASSWORD = "ContenteCreators@01";

interface AuthUserRow extends Record<string, unknown> {
  id: string;
}

interface AccountRow extends Record<string, unknown> {
  role: "ADMIN" | "COMPANY" | "INFLUENCER" | null;
}

interface ProvisioningSummary {
  identitiesCreated: number;
  identitiesUpdated: number;
  accountsCreated: number;
  accountsUpdated: number;
}

async function ensureLocalAdminIdentity(
  transaction: TransactionSql,
  email: string,
  summary: ProvisioningSummary,
) {
  const [existingIdentity] = await transaction<AuthUserRow[]>`
    select auth_user.id
    from auth.users auth_user
    where lower(auth_user.email) = ${email}
    limit 1
  `;
  const authUserId = existingIdentity?.id ?? randomUUID();

  if (existingIdentity) {
    await transaction`
      update auth.users
      set
        encrypted_password = extensions.crypt(
          ${LOCAL_ADMIN_DEFAULT_PASSWORD},
          extensions.gen_salt('bf')
        ),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        banned_until = null,
        raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
          || '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
          || '{"display_name":"Administrador local","local_admin":true}'::jsonb,
        updated_at = now()
      where id = ${authUserId}::uuid
    `;
    summary.identitiesUpdated += 1;
  } else {
    await transaction`
      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
      )
      values (
        '00000000-0000-0000-0000-000000000000'::uuid,
        ${authUserId}::uuid,
        'authenticated',
        'authenticated',
        ${email},
        extensions.crypt(
          ${LOCAL_ADMIN_DEFAULT_PASSWORD},
          extensions.gen_salt('bf')
        ),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"display_name":"Administrador local","local_admin":true}'::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        ''
      )
    `;
    summary.identitiesCreated += 1;
  }

  await transaction`
    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    select
      ${authUserId},
      ${authUserId}::uuid,
      jsonb_build_object(
        'sub', ${authUserId}::text,
        'email', ${email}::text,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      now(),
      now(),
      now()
    where not exists (
      select 1
      from auth.identities identity
      where identity.user_id = ${authUserId}::uuid
        and identity.provider = 'email'
    )
  `;

  return authUserId;
}

async function ensureLocalAdminAccount(
  transaction: TransactionSql,
  authUserId: string,
  email: string,
  summary: ProvisioningSummary,
) {
  const [account] = await transaction<AccountRow[]>`
    select role
    from public.accounts
    where auth_user_id = ${authUserId}::uuid
    for update
  `;

  if (account?.role && account.role !== "ADMIN") {
    throw new Error(
      "A configured local administrator email already belongs to a non-admin account.",
    );
  }

  if (!account) {
    await transaction`
      insert into public.accounts (
        auth_user_id,
        role,
        status,
        operational_email,
        submitted_at,
        approved_at,
        completion_percentage
      )
      values (
        ${authUserId}::uuid,
        'ADMIN',
        'APPROVED',
        ${email},
        now(),
        now(),
        100
      )
    `;
    summary.accountsCreated += 1;
    return;
  }

  const updatedAccounts = await transaction`
    update public.accounts
    set
      role = 'ADMIN',
      status = 'APPROVED',
      operational_email = ${email},
      submitted_at = coalesce(submitted_at, now()),
      approved_at = coalesce(approved_at, now()),
      suspended_at = null,
      banned_at = null,
      archived_at = null,
      completion_percentage = 100
    where auth_user_id = ${authUserId}::uuid
      and (
        role is distinct from 'ADMIN'::public.account_role
        or status is distinct from 'APPROVED'::public.account_status
        or operational_email is distinct from ${email}
        or submitted_at is null
        or approved_at is null
        or suspended_at is not null
        or banned_at is not null
        or archived_at is not null
        or completion_percentage is distinct from 100
      )
    returning id
  `;
  summary.accountsUpdated += updatedAccounts.length;
}

async function main() {
  const environment = parseServerEnv(process.env);

  if (environment.LOCAL_ADMIN_EMAILS.length === 0) {
    process.stdout.write(
      "Local administrator sync skipped: LOCAL_ADMIN_EMAILS is empty.\n",
    );
    return;
  }

  assertLocalAdminProvisioningTarget({
    appEnvironment: environment.APP_ENV,
    databaseUrl: environment.DIRECT_URL,
    supabaseUrl: environment.NEXT_PUBLIC_SUPABASE_URL,
  });

  const database = postgres(environment.DIRECT_URL, {
    connect_timeout: 5,
    max: 1,
    prepare: false,
  });
  const summary: ProvisioningSummary = {
    accountsCreated: 0,
    accountsUpdated: 0,
    identitiesCreated: 0,
    identitiesUpdated: 0,
  };

  try {
    await database.begin(async (transaction) => {
      await transaction`
        select
          set_config('app.audit.actor_type', 'SYSTEM', true),
          set_config('app.audit.source', 'SCRIPT', true),
          set_config(
            'app.audit.request_id',
            ${`local-admin-sync-${randomUUID()}`},
            true
          ),
          set_config(
            'app.audit.reason',
            'Synchronize configured local administrators',
            true
          )
      `;

      for (const email of environment.LOCAL_ADMIN_EMAILS) {
        const authUserId = await ensureLocalAdminIdentity(
          transaction,
          email,
          summary,
        );
        await ensureLocalAdminAccount(transaction, authUserId, email, summary);
      }
    });

    process.stdout.write(
      `Local administrators synchronized: ${JSON.stringify({
        configured: environment.LOCAL_ADMIN_EMAILS.length,
        ...summary,
      })}\n`,
    );
  } finally {
    await database.end({ timeout: 2 });
  }
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Local administrator synchronization failed.";

  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
