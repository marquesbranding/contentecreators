import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const database = postgres(
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  { connect_timeout: 5, idle_timeout: 1, max: 1 },
);

const adminAccountId = "a0000000-0000-4000-8000-000000000001";
const adminAuthUserId = "10000000-0000-4000-8000-000000000001";
// Approved creator with no sponsorship placement.
const creatorAccountId = "b0000000-0000-4000-8000-000000000007";
const creatorAuthUserId = "20000000-0000-4000-8000-000000000007";
// Approved creator featured in a seeded sponsorship placement.
const sponsoredCreatorAccountId = "b0000000-0000-4000-8000-000000000004";
const sponsoredCreatorAuthUserId = "20000000-0000-4000-8000-000000000004";

type Transaction = postgres.TransactionSql;

class Rollback extends Error {}

async function inRolledBackTransaction(
  work: (transaction: Transaction) => Promise<void>,
) {
  try {
    await database.begin(async (transaction) => {
      await work(transaction);
      throw new Rollback("rollback");
    });
  } catch (error) {
    if (!(error instanceof Rollback)) {
      throw error;
    }
  }
}

async function actAs(
  transaction: Transaction,
  actor: { accountId: string; authUserId: string; role: string },
) {
  await transaction`
    select
      set_config('app.jwt.auth_user_id', ${actor.authUserId}, true),
      set_config('app.jwt.account_id', ${actor.accountId}, true),
      set_config('app.jwt.account_role', ${actor.role}, true),
      set_config('app.jwt.account_status', 'APPROVED', true),
      set_config('app.audit.actor_account_id', ${actor.accountId}, true),
      set_config('app.audit.actor_type', ${actor.role === "ADMIN" ? "ADMIN" : "USER"}, true),
      set_config('app.audit.actor_role', ${actor.role}, true),
      set_config('app.audit.source', 'APPLICATION', true),
      set_config('app.audit.request_id', 'account-deletion-test', true),
      set_config('app.audit.reason', 'integration test', true)
  `;
}

const creator = {
  accountId: creatorAccountId,
  authUserId: creatorAuthUserId,
  role: "INFLUENCER",
};
const admin = {
  accountId: adminAccountId,
  authUserId: adminAuthUserId,
  role: "ADMIN",
};

async function requestDeletion(transaction: Transaction) {
  await actAs(transaction, creator);
  await transaction`set local role contente_app_user`;
  const [row] = await transaction<{ outbox_id: string }[]>`
    select outbox_id from public.app_request_account_deletion()
  `;
  await transaction`reset role`;

  return row;
}

async function closeRecoveryWindow(
  transaction: Transaction,
  accountId: string,
) {
  await transaction`alter table public.accounts disable trigger user`;
  await transaction`
    update public.accounts
    set deletion_requested_at = now() - interval '31 days',
        elimination_eligible_at = now() - interval '1 day',
        deletion_due_at = now() + interval '89 days'
    where id = ${accountId}
  `;
  await transaction`alter table public.accounts enable trigger user`;
}

describeLocalStack("self-service account deletion", () => {
  afterAll(async () => {
    await database.end({ timeout: 2 });
  });

  it("hides the account, revokes contact, sets the windows and queues the e-mail", async () => {
    await inRolledBackTransaction(async (transaction) => {
      const outbox = await requestDeletion(transaction);
      const [state] = await transaction<
        {
          archived: boolean;
          due_days: number;
          eligible_days: number;
          profile_archived: boolean;
          state: string;
          visible_contacts: number;
        }[]
      >`
        select
          account.deletion_state as state,
          account.archived_at is not null as archived,
          round(extract(epoch from (account.elimination_eligible_at - account.deletion_requested_at)) / 86400)::integer as eligible_days,
          round(extract(epoch from (account.deletion_due_at - account.deletion_requested_at)) / 86400)::integer as due_days,
          (select archived_at is not null from public.creator_profiles where account_id = account.id) as profile_archived,
          (
            select count(*)::integer
            from public.account_contact_preferences preference
            where preference.account_id = account.id
              and (preference.email_visible_to_approved_companies
                or preference.whatsapp_visible_to_approved_companies
                or preference.social_visible_to_approved_companies)
          ) as visible_contacts
        from public.accounts account
        where account.id = ${creatorAccountId}
      `;
      const [queued] = await transaction<{ template: string }[]>`
        select template::text from public.email_outbox where id = ${outbox?.outbox_id ?? ""}::uuid
      `;
      const [eligibleForCatalog] = await transaction<{ approved: boolean }[]>`
        select public.app_account_is_approved(${creatorAccountId}::uuid) as approved
      `;

      expect(state).toMatchObject({
        archived: true,
        due_days: 120,
        eligible_days: 30,
        profile_archived: true,
        state: "REQUESTED",
        visible_contacts: 0,
      });
      expect(queued?.template).toBe("ACCOUNT_DELETION_REQUESTED");
      expect(eligibleForCatalog?.approved).toBe(false);

      const [audit] = await transaction<
        { actor_type: string; source: string }[]
      >`
        select actor_type::text, source::text
        from public.audit_revisions
        where entity_table = 'accounts'
          and entity_id = ${creatorAccountId}
        order by revision desc
        limit 1
      `;

      expect(audit).toEqual({ actor_type: "USER", source: "APPLICATION" });
    });
  });

  it("refuses a second request and refuses administrators", async () => {
    await inRolledBackTransaction(async (transaction) => {
      await requestDeletion(transaction);
      await actAs(transaction, creator);
      await transaction`set local role contente_app_user`;
      await transaction`savepoint again`;
      await expect(
        transaction`select * from public.app_request_account_deletion()`,
      ).rejects.toThrow(/account_deletion_(context_required|not_available)/u);
      await transaction`rollback to savepoint again`;
      await actAs(transaction, admin);
      await expect(
        transaction`select * from public.app_request_account_deletion()`,
      ).rejects.toThrow(/account_deletion_role_forbidden/u);
    });
  });

  it("lets only an administrator recover within the window, keeping contact revoked", async () => {
    await inRolledBackTransaction(async (transaction) => {
      await requestDeletion(transaction);

      await actAs(transaction, creator);
      await transaction`set local role contente_app_user`;
      await transaction`savepoint non_admin`;
      await expect(
        transaction`select * from public.app_admin_recover_account(${creatorAccountId}::uuid, 'quero voltar')`,
      ).rejects.toThrow(/account_recovery_admin_required/u);
      await transaction`rollback to savepoint non_admin`;
      await transaction`reset role`;

      await actAs(transaction, admin);
      await transaction`set local role contente_app_user`;
      await transaction`savepoint no_reason`;
      await expect(
        transaction`select * from public.app_admin_recover_account(${creatorAccountId}::uuid, ' ')`,
      ).rejects.toThrow(/account_recovery_reason_required/u);
      await transaction`rollback to savepoint no_reason`;

      const [recovered] = await transaction<{ outbox_id: string }[]>`
        select outbox_id from public.app_admin_recover_account(${creatorAccountId}::uuid, 'Pedido do titular por e-mail')
      `;
      await transaction`reset role`;

      const [state] = await transaction<
        {
          archived: boolean;
          profile_archived: boolean;
          state: string | null;
          visible: boolean;
        }[]
      >`
        select
          account.deletion_state as state,
          account.archived_at is not null as archived,
          (select archived_at is not null from public.creator_profiles where account_id = account.id) as profile_archived,
          coalesce((
            select bool_or(email_visible_to_approved_companies or whatsapp_visible_to_approved_companies)
            from public.account_contact_preferences
            where account_id = account.id
          ), false) as visible
        from public.accounts account
        where account.id = ${creatorAccountId}
      `;
      const [queued] = await transaction<{ template: string }[]>`
        select template::text from public.email_outbox where id = ${recovered?.outbox_id ?? ""}::uuid
      `;

      expect(state).toEqual({
        archived: false,
        profile_archived: false,
        state: null,
        visible: false,
      });
      expect(queued?.template).toBe("ACCOUNT_RECOVERED");
    });
  });

  it("closes recovery once the 30-day window ends", async () => {
    await inRolledBackTransaction(async (transaction) => {
      await requestDeletion(transaction);
      await closeRecoveryWindow(transaction, creatorAccountId);

      await actAs(transaction, admin);
      await transaction`set local role contente_app_user`;
      await expect(
        transaction`select * from public.app_admin_recover_account(${creatorAccountId}::uuid, 'tarde demais')`,
      ).rejects.toThrow(/account_recovery_window_closed/u);
    });
  });

  it("refuses elimination while the recovery window is open", async () => {
    await inRolledBackTransaction(async (transaction) => {
      await requestDeletion(transaction);

      await expect(
        transaction`select public.app_eliminate_account_data(${creatorAccountId}::uuid)`,
      ).rejects.toThrow(/account_elimination_window_open/u);
    });
  });

  it("eliminates personal data, scrubs audit history and keeps immutability", async () => {
    await inRolledBackTransaction(async (transaction) => {
      await requestDeletion(transaction);
      await closeRecoveryWindow(transaction, creatorAccountId);
      await transaction`select public.app_eliminate_account_data(${creatorAccountId}::uuid)`;

      const [account] = await transaction<
        { email: string; full_name: string | null; state: string }[]
      >`
        select deletion_state as state, full_name, operational_email as email
        from public.accounts where id = ${creatorAccountId}
      `;
      const [remaining] = await transaction<
        { consents: number; media: number; profiles: number; socials: number }[]
      >`
        select
          (select count(*)::integer from public.creator_profiles where account_id = ${creatorAccountId}) as profiles,
          (select count(*)::integer from public.social_profiles where owner_account_id = ${creatorAccountId}) as socials,
          (select count(*)::integer from public.media_assets where owner_account_id = ${creatorAccountId}) as media,
          (select count(*)::integer from public.account_consents where account_id = ${creatorAccountId} and (request_id is not null or network_key_hash is not null or user_agent_hash is not null)) as consents
      `;
      const [audit] = await transaction<{ leaked: number; total: number }[]>`
        select
          count(*)::integer as total,
          count(*) filter (
            where before_state::text like '%@contentecreators.test%'
              or after_state::text like '%@contentecreators.test%'
          )::integer as leaked
        from public.audit_revisions
        where entity_id = ${creatorAccountId}
      `;

      expect(account?.state).toBe("ELIMINATED");
      expect(account?.full_name).toBeNull();
      expect(account?.email).toContain("@eliminated.invalid");
      expect(remaining).toEqual({
        consents: 0,
        media: 0,
        profiles: 0,
        socials: 0,
      });
      expect(audit?.total).toBeGreaterThan(0);
      expect(audit?.leaked).toBe(0);

      await expect(
        transaction`update public.audit_revisions set reason = 'edited' where revision = (select min(revision) from public.audit_revisions)`,
      ).rejects.toThrow(/append-only/u);
    });
  });

  it("keeps blocked-by-sponsorship accounts from being eliminated silently", async () => {
    await inRolledBackTransaction(async (transaction) => {
      await actAs(transaction, {
        accountId: sponsoredCreatorAccountId,
        authUserId: sponsoredCreatorAuthUserId,
        role: "INFLUENCER",
      });
      await transaction`set local role contente_app_user`;
      await transaction`select * from public.app_request_account_deletion()`;
      await transaction`reset role`;
      await closeRecoveryWindow(transaction, sponsoredCreatorAccountId);

      await expect(
        transaction`select public.app_eliminate_account_data(${sponsoredCreatorAccountId}::uuid)`,
      ).rejects.toThrow(/account_elimination_blocked_by_sponsorship/u);
    });
  });

  it("has a disposition for every table that references accounts", async () => {
    // Adding a table with a foreign key to accounts must come with a decision in
    // app_eliminate_account_data() and docs/operations/account-deletion.md.
    const rows = await database<{ table_name: string }[]>`
      select distinct constraint_row.conrelid::regclass::text as table_name
      from pg_constraint constraint_row
      where constraint_row.contype = 'f'
        and constraint_row.confrelid = 'public.accounts'::regclass
      order by 1
    `;

    expect(rows.map((row) => row.table_name)).toEqual(
      [
        // DELETE
        "company_profiles",
        "creator_profiles",
        "media_assets",
        "onboarding_drafts",
        "social_profiles",
        "whatsapp_contact_confirmations",
        // ANONYMIZE
        "account_consents",
        "audit_revisions",
        "email_outbox",
        "moderation_events",
        // KEEP (no personal content, or retained by approved decision)
        "account_contact_preferences",
        "blocked_identities",
        "identity_auth_effects",
        "moderation_cases",
        // BLOCKS elimination until handled
        "sponsorship_placements",
      ].sort(),
    );
  });
});
