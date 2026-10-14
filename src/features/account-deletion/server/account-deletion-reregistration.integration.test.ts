import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import {
  createDatabaseClient,
  type ApplicationDatabase,
  type ApplicationTransaction,
} from "@/db/client";
import {
  applyVerifiedAuditContext,
  createAuditedTransactionRunner,
} from "@/features/audit/server";
import {
  createRegistrationIdentityRepository,
  createVerifiedAccountTransactionRunner,
  VerifiedAccountTransactionError,
} from "@/features/identity/server";
import { createDrizzleRoleSelectionRepository } from "@/features/identity/server/repositories/drizzle-role-selection.repository";

import { createDrizzleAccountDeletionRepository } from "./repositories/drizzle-account-deletion.repository";
import { createAccountDeletionService } from "./services/account-deletion.service";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const drizzleClient = createDatabaseClient(databaseUrl);

const admin = {
  accountId: "a0000000-0000-4000-8000-000000000001",
  authUserId: "10000000-0000-4000-8000-000000000001",
};
const creator = {
  accountId: "b0000000-0000-4000-8000-000000000007",
  authUserId: "20000000-0000-4000-8000-000000000007",
};
const company = {
  accountId: "c0000000-0000-4000-8000-000000000004",
  authUserId: "30000000-0000-4000-8000-000000000004",
};

class Rollback extends Error {}

/**
 * Runs the whole lifecycle through the real repositories and resolvers inside
 * one transaction that is always rolled back (nested transactions become
 * savepoints), so the shared local database is left untouched.
 */
async function rolledBack(
  work: (outer: ApplicationTransaction) => Promise<void>,
) {
  try {
    await drizzleClient.database.transaction(async (outer) => {
      await work(outer);
      throw new Rollback("rollback");
    });
  } catch (error) {
    if (!(error instanceof Rollback)) {
      throw error;
    }
  }
}

function asDatabase(outer: ApplicationTransaction) {
  return outer as unknown as ApplicationDatabase;
}

function verifiedRunner(outer: ApplicationTransaction, authUserId: string) {
  return createVerifiedAccountTransactionRunner({
    database: asDatabase(outer),
    resolveVerifiedAuthUserId: async () => authUserId,
  });
}

async function resetSession(outer: ApplicationTransaction) {
  // `set local` inside a released savepoint lasts until the outer commit.
  await outer.execute(sql`reset role`);
  await outer.execute(sql`
    select
      set_config('app.jwt.auth_user_id', '', true),
      set_config('app.jwt.account_id', '', true),
      set_config('app.jwt.account_role', '', true),
      set_config('app.jwt.account_status', '', true)
  `);
}

async function deleteThroughService(
  outer: ApplicationTransaction,
  authUserId: string,
) {
  const signOutEverywhere = async () => true;
  const service = createAccountDeletionService({
    applyAuditContext: applyVerifiedAuditContext,
    identity: {
      getReauthenticationContext: async () => ({
        authUserId,
        email: "owner@contentecreators.test",
        hasPassword: true,
        lastSignInAt: null,
      }),
      signOutEverywhere,
    },
    repository: createDrizzleAccountDeletionRepository(asDatabase(outer)),
    runVerifiedTransaction: verifiedRunner(outer, authUserId),
    storage: {
      remove: async (objects) => ({ failed: 0, removed: objects.length }),
    },
  });

  const result = await service.deleteAccount({
    requestId: "deletion-reregistration-test",
  });
  await resetSession(outer);

  return result;
}

function roleSelection(outer: ApplicationTransaction) {
  return createDrizzleRoleSelectionRepository({
    database: asDatabase(outer),
    runAuditedTransaction: createAuditedTransactionRunner(asDatabase(outer)),
  });
}

async function currentAccountOf(
  outer: ApplicationTransaction,
  authUserId: string,
) {
  try {
    const context = await verifiedRunner(outer, authUserId)(
      { preferredRole: "NON_ADMIN", requestId: "deletion-reregistration-test" },
      async (_transaction, accountContext) => accountContext,
    );

    return context;
  } catch (error) {
    if (error instanceof VerifiedAccountTransactionError) {
      return error.code;
    }

    throw error;
  } finally {
    await resetSession(outer);
  }
}

describeLocalStack("deletion and re-registration with the same login", () => {
  afterAll(async () => {
    await drizzleClient.client.end({ timeout: 2 });
  });

  it("lands on role selection and registers the same role from scratch, up to approval", async () => {
    await rolledBack(async (outer) => {
      const [{ email } = { email: "" }] = (await outer.execute(sql`
        select operational_email as email from public.accounts where id = ${creator.accountId}
      `)) as unknown as { email: string }[];

      expect(await deleteThroughService(outer, creator.authUserId)).toEqual({
        kind: "deleted",
      });

      // Signing in again: no account for this login, so the app shows role selection.
      expect(await currentAccountOf(outer, creator.authUserId)).toBe(
        "ACCOUNT_NOT_READY",
      );
      expect(
        await roleSelection(outer).findByIdentityId(creator.authUserId),
      ).toBeNull();

      const blank = await createRegistrationIdentityRepository(
        asDatabase(outer),
      ).ensure(creator.authUserId, email);

      expect(blank.id).not.toBe(creator.accountId);
      expect(blank.role).toBeNull();

      const selected = await roleSelection(outer).selectInitialRole({
        email,
        identityId: creator.authUserId,
        requestId: "deletion-reregistration-role",
        role: "INFLUENCER",
      });

      expect(selected).toMatchObject({
        account: { id: blank.id, role: "INFLUENCER", status: "ONBOARDING" },
        kind: "selected",
      });

      const context = await currentAccountOf(outer, creator.authUserId);

      expect(context).toMatchObject({
        accountId: blank.id,
        role: "INFLUENCER",
        status: "ONBOARDING",
      });

      // The new registration starts empty: nothing of the deleted account shows up.
      const [leftovers] = (await outer.execute(sql`
        select
          (select count(*)::integer from public.creator_profiles where account_id = ${blank.id}) as profiles,
          (select count(*)::integer from public.onboarding_drafts where account_id = ${blank.id}) as drafts,
          (select count(*)::integer from public.accounts where auth_user_id = ${creator.authUserId}) as linked_accounts
      `)) as unknown as {
        drafts: number;
        linked_accounts: number;
        profiles: number;
      }[];

      expect(leftovers).toEqual({ drafts: 0, linked_accounts: 1, profiles: 0 });

      // Owner-scoped definer functions resolve the new account by its login.
      await verifiedRunner(outer, creator.authUserId)(
        {
          preferredRole: "NON_ADMIN",
          requestId: "deletion-reregistration-step",
        },
        async (transaction) => {
          await transaction.execute(
            sql`select public.app_set_registration_step('PROFILE')`,
          );
        },
      );
      await resetSession(outer);

      // Submission (as the onboarding flow does) and approval by an admin.
      await applyVerifiedAuditContext(outer, {
        actorAccountId: null,
        actorRole: null,
        actorType: "SYSTEM",
        reason: "Synthetic rollback-only submission",
        requestId: "deletion-reregistration-submit",
        source: "SCRIPT",
      });
      await outer.execute(sql`
        insert into public.creator_profiles (account_id, legal_name, display_name, creator_type)
        values (${blank.id}, 'Creator Recadastrado', 'Creator Recadastrado', 'INFLUENCER')
      `);
      await outer.execute(sql`
        with created_case as (
          insert into public.moderation_cases (account_id, current_submission_sequence, submitted_at)
          values (${blank.id}, 1, now())
          returning id
        )
        insert into public.moderation_events (
          moderation_case_id, submission_sequence, from_status, to_status, action, actor_account_id, idempotency_key
        )
        select id, 1, 'ONBOARDING', 'PENDING_REVIEW', 'SUBMIT', ${blank.id}, ${`onboarding:${blank.id}:1`}
        from created_case
      `);
      await outer.execute(sql`
        update public.accounts
        set status = 'PENDING_REVIEW', submitted_at = now()
        where id = ${blank.id}
      `);

      const [versions] = (await outer.execute(sql`
        select
          account.version as account_version,
          profile.version as profile_version
        from public.accounts account
        join public.creator_profiles profile on profile.account_id = account.id
        where account.id = ${blank.id}
      `)) as unknown as { account_version: number; profile_version: number }[];

      const [approval] = (await verifiedRunner(outer, admin.authUserId)(
        {
          preferredRole: "ADMIN",
          requestId: "deletion-reregistration-approve",
        },
        async (transaction, context) => {
          await applyVerifiedAuditContext(transaction, {
            actorAccountId: context.accountId,
            actorRole: "ADMIN",
            actorType: "ADMIN",
            reason: "Aprovação de recadastro",
            requestId: "deletion-reregistration-approve",
            source: "BACKOFFICE",
          });

          return transaction.execute(sql`
            select result_kind, status::text
            from public.app_apply_admin_moderation(
              ${blank.id}::uuid,
              'APPROVE'::public.moderation_action,
              'Cadastro conferido',
              ${versions!.account_version},
              ${versions!.profile_version},
              ${`reregistration-approve:${blank.id}`},
              '[]'::jsonb
            )
          `);
        },
      )) as unknown as { result_kind: string; status: string }[];
      await resetSession(outer);

      expect(approval).toEqual({ result_kind: "APPLIED", status: "APPROVED" });
    });
  });

  it("lets a former company register as a creator without a role conflict", async () => {
    await rolledBack(async (outer) => {
      expect(await deleteThroughService(outer, company.authUserId)).toEqual({
        kind: "deleted",
      });
      expect(
        await roleSelection(outer).findByIdentityId(company.authUserId),
      ).toBeNull();

      const selected = await roleSelection(outer).selectInitialRole({
        email: "company-approved@contentecreators.test",
        identityId: company.authUserId,
        requestId: "deletion-reregistration-other-role",
        role: "INFLUENCER",
      });

      expect(selected).toMatchObject({
        account: { role: "INFLUENCER", status: "ONBOARDING" },
        kind: "selected",
      });
      expect(selected.account.id).not.toBe(company.accountId);
    });
  });

  it("keeps an administrator's ADMIN row when the linked profile is deleted", async () => {
    await rolledBack(async (outer) => {
      await applyVerifiedAuditContext(outer, {
        actorAccountId: null,
        actorRole: null,
        actorType: "SYSTEM",
        reason: "Synthetic rollback-only linked profile",
        requestId: "deletion-admin-linked",
        source: "SCRIPT",
      });
      await outer.execute(sql`
        insert into public.accounts (auth_user_id, role, status, operational_email, approved_at, submitted_at)
        values (${admin.authUserId}, 'INFLUENCER', 'APPROVED', 'admin-linked@contentecreators.test', now(), now())
      `);

      expect(await deleteThroughService(outer, admin.authUserId)).toEqual({
        kind: "deleted",
      });

      const adminContext = await verifiedRunner(outer, admin.authUserId)(
        { preferredRole: "ADMIN", requestId: "deletion-admin-linked-check" },
        async (_transaction, context) => context,
      );
      await resetSession(outer);

      expect(adminContext).toMatchObject({
        accountId: admin.accountId,
        role: "ADMIN",
        status: "APPROVED",
      });
      expect(
        await roleSelection(outer).findByIdentityId(admin.authUserId),
      ).toBeNull();
    });
  });
});
