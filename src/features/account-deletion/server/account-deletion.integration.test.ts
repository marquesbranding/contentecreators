import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const database = postgres(
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  { connect_timeout: 5, idle_timeout: 1, max: 1 },
);

interface Actor {
  accountId: string;
  authUserId: string;
  role: "ADMIN" | "COMPANY" | "INFLUENCER";
  status?: string;
}

const admin: Actor = {
  accountId: "a0000000-0000-4000-8000-000000000001",
  authUserId: "10000000-0000-4000-8000-000000000001",
  role: "ADMIN",
};
// Approved creator with no sponsorship placement.
const creator: Actor = {
  accountId: "b0000000-0000-4000-8000-000000000007",
  authUserId: "20000000-0000-4000-8000-000000000007",
  role: "INFLUENCER",
};
const creatorProfileId = "d0000000-0000-4000-8000-000000000007";
// Approved creator featured in the seeded "Criador em destaque" placement.
const featuredCreator: Actor = {
  accountId: "b0000000-0000-4000-8000-000000000004",
  authUserId: "20000000-0000-4000-8000-000000000004",
  role: "INFLUENCER",
};
// Approved company, advertiser of that same placement, with a logo.
const company: Actor = {
  accountId: "c0000000-0000-4000-8000-000000000004",
  authUserId: "30000000-0000-4000-8000-000000000004",
  role: "COMPANY",
};
const bannedCreator: Actor = {
  accountId: "b0000000-0000-4000-8000-000000000006",
  authUserId: "20000000-0000-4000-8000-000000000006",
  role: "INFLUENCER",
  status: "BANNED",
};
const featuredPlacementId = "f6000000-0000-4000-8000-000000000001";
const creatorMediaId = "71000000-0000-4000-8000-0000000000d7";
const creatorMediaPath = `${creator.accountId}/avatar/${creatorMediaId}.png`;
const orphanObjectPath = `${creator.accountId}/cover/orphan-upload.png`;

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

async function actAs(transaction: Transaction, actor: Actor) {
  await transaction`
    select
      set_config('app.jwt.auth_user_id', ${actor.authUserId}, true),
      set_config('app.jwt.account_id', ${actor.accountId}, true),
      set_config('app.jwt.account_role', ${actor.role}, true),
      set_config('app.jwt.account_status', ${actor.status ?? "APPROVED"}, true),
      set_config('app.audit.actor_account_id', ${actor.accountId}, true),
      set_config('app.audit.actor_type', ${actor.role === "ADMIN" ? "ADMIN" : "USER"}, true),
      set_config('app.audit.actor_role', ${actor.role}, true),
      set_config('app.audit.source', 'APPLICATION', true),
      set_config('app.audit.request_id', 'account-deletion-test', true),
      set_config('app.audit.reason', 'integration test', true)
  `;
}

async function actAsSystem(transaction: Transaction) {
  await transaction`
    select
      set_config('app.audit.actor_account_id', '', true),
      set_config('app.audit.actor_type', 'SYSTEM', true),
      set_config('app.audit.actor_role', '', true),
      set_config('app.audit.source', 'SCRIPT', true),
      set_config('app.audit.request_id', 'account-deletion-test-setup', true),
      set_config('app.audit.reason', 'integration test setup', true)
  `;
}

interface Deleted {
  account_id: string;
  outbox_id: string;
  storage_objects: { bucket: string; path: string }[];
}

async function deleteOwnAccount(transaction: Transaction, actor: Actor) {
  await actAs(transaction, actor);
  await transaction`set local role contente_app_user`;
  const [row] = await transaction<Deleted[]>`
    select account_id, outbox_id, storage_objects
    from public.app_delete_own_account()
  `;
  await transaction`reset role`;

  return row!;
}

/** Extra personal data so every DELETE/ANONYMIZE line of the matrix has rows. */
async function seedCreatorExtras(transaction: Transaction) {
  await actAsSystem(transaction);
  await transaction`
    insert into public.onboarding_drafts (account_id, role, payload)
    values (${creator.accountId}, 'INFLUENCER', '{"displayName": "Rascunho"}'::jsonb)
    on conflict (account_id) do update set payload = excluded.payload
  `;
  await transaction`
    insert into public.media_assets (
      id, owner_account_id, bucket_name, object_path, kind, mime_type, size_bytes, status
    )
    values (
      ${creatorMediaId}, ${creator.accountId}, 'profile-media', ${creatorMediaPath},
      'AVATAR', 'image/png', 1024, 'ACTIVE'
    )
  `;
  await transaction`
    update public.creator_profiles
    set avatar_asset_id = ${creatorMediaId}
    where id = ${creatorProfileId}
  `;
  await transaction`
    insert into storage.objects (bucket_id, name)
    values ('profile-media', ${orphanObjectPath})
  `;
  await transaction`
    insert into public.whatsapp_contact_confirmations (company_account_id, creator_profile_id)
    values (${company.accountId}, ${creatorProfileId})
  `;
  await transaction`
    insert into public.email_outbox (account_id, template, recipient_email, payload, idempotency_key)
    values (
      ${creator.accountId}, 'APPROVED', 'creator-approved@contentecreators.test',
      '{}'::jsonb, ${`deletion-test-pending:${creator.accountId}`}
    )
  `;
}

describeLocalStack("immediate account deletion", () => {
  afterAll(async () => {
    await database.end({ timeout: 2 });
  });

  it("removes everything of the account at once and leaves an unlinked tombstone", async () => {
    await inRolledBackTransaction(async (transaction) => {
      await seedCreatorExtras(transaction);

      const deleted = await deleteOwnAccount(transaction, creator);

      expect(deleted.account_id).toBe(creator.accountId);
      expect(deleted.storage_objects).toEqual(
        expect.arrayContaining([
          { bucket: "profile-media", path: creatorMediaPath },
          { bucket: "profile-media", path: orphanObjectPath },
        ]),
      );

      const [account] = await transaction<
        {
          archived: boolean;
          auth_user_id: string | null;
          email: string;
          eliminated: boolean;
          full_name: string | null;
          state: string;
        }[]
      >`
        select
          auth_user_id,
          full_name,
          operational_email as email,
          deletion_state as state,
          archived_at is not null as archived,
          eliminated_at is not null as eliminated
        from public.accounts where id = ${creator.accountId}
      `;

      expect(account).toEqual({
        archived: true,
        auth_user_id: null,
        eliminated: true,
        email: `eliminated-${creator.accountId}@eliminated.invalid`,
        full_name: null,
        state: "ELIMINATED",
      });

      const [remaining] = await transaction<Record<string, number>[]>`
        select
          (select count(*)::integer from public.creator_profiles where account_id = ${creator.accountId}) as profiles,
          (select count(*)::integer from public.social_profiles where owner_account_id = ${creator.accountId}) as socials,
          (select count(*)::integer from public.creator_metric_snapshots where creator_profile_id = ${creatorProfileId}) as metrics,
          (select count(*)::integer from public.creator_niches where creator_profile_id = ${creatorProfileId}) as niches,
          (select count(*)::integer from public.media_assets where owner_account_id = ${creator.accountId}) as media,
          (select count(*)::integer from public.onboarding_drafts where account_id = ${creator.accountId}) as drafts,
          (select count(*)::integer from public.whatsapp_contact_confirmations where creator_profile_id = ${creatorProfileId}) as whatsapp,
          (select count(*)::integer from public.account_consents where account_id = ${creator.accountId}
            and (request_id is not null or network_key_hash is not null or user_agent_hash is not null or context <> '{}'::jsonb)) as identifiable_consents,
          (select count(*)::integer from public.account_consents where account_id = ${creator.accountId}) as consents,
          (select count(*)::integer from public.moderation_events event
            join public.moderation_cases moderation_case on moderation_case.id = event.moderation_case_id
            where moderation_case.account_id = ${creator.accountId}
              and event.reason is not null and event.reason <> '[removido]') as moderation_reasons
      `;

      expect(remaining).toEqual({
        consents: expect.any(Number),
        drafts: 0,
        identifiable_consents: 0,
        media: 0,
        metrics: 0,
        moderation_reasons: 0,
        niches: 0,
        profiles: 0,
        socials: 0,
        whatsapp: 0,
      });
      expect(remaining?.consents).toBeGreaterThan(0);

      const [audit] = await transaction<
        { leaked: number; total: number; unknown_actor: number }[]
      >`
        select
          count(*)::integer as total,
          count(*) filter (
            where before_state::text like '%contentecreators.test%'
              or after_state::text like '%contentecreators.test%'
              or before_state::text like '%Rascunho%'
              or after_state::text like '%Rascunho%'
          )::integer as leaked,
          count(*) filter (where actor_type = 'SYSTEM_UNKNOWN' and request_id = 'account-deletion-test')::integer as unknown_actor
        from public.audit_revisions
        where entity_id in (${creator.accountId}, ${creatorProfileId}, ${creatorMediaId})
          or entity_id like ${`${creatorProfileId}:%`}
      `;

      expect(audit?.total).toBeGreaterThan(0);
      expect(audit?.leaked).toBe(0);
      expect(audit?.unknown_actor).toBe(0);

      const [lastRevision] = await transaction<
        { actor_account_id: string; actor_type: string; source: string }[]
      >`
        select actor_account_id, actor_type::text, source::text
        from public.audit_revisions
        where entity_table = 'accounts' and entity_id = ${creator.accountId}
        order by revision desc
        limit 1
      `;

      expect(lastRevision).toEqual({
        actor_account_id: creator.accountId,
        actor_type: "USER",
        source: "APPLICATION",
      });

      const queued = await transaction<{ object_path: string }[]>`
        select object_path from public.storage_cleanup_queue
        where object_path like ${`${creator.accountId}/%`}
        order by object_path
      `;

      expect(queued.map((row) => row.object_path).sort()).toEqual(
        [creatorMediaPath, orphanObjectPath].sort(),
      );

      const [approved] = await transaction<{ approved: boolean }[]>`
        select public.app_account_is_approved(${creator.accountId}::uuid) as approved
      `;

      expect(approved?.approved).toBe(false);

      await expect(
        transaction`update public.audit_revisions set reason = 'edited' where revision = (select min(revision) from public.audit_revisions)`,
      ).rejects.toThrow(/append-only/u);
    });
  });

  it("cancels pending e-mails and keeps only the confirmation until it is sent", async () => {
    await inRolledBackTransaction(async (transaction) => {
      await seedCreatorExtras(transaction);
      const [owner] = await transaction<{ email: string }[]>`
        select operational_email as email from public.accounts where id = ${creator.accountId}
      `;
      const ownerEmail = owner!.email;
      const deleted = await deleteOwnAccount(transaction, creator);

      const rows = await transaction<
        {
          id: string;
          payload: Record<string, unknown>;
          recipient_email: string;
          retain_until_sent: boolean;
          status: string;
          template: string;
        }[]
      >`
        select id, template::text, recipient_email, payload, retain_until_sent, status::text
        from public.email_outbox
        where account_id = ${creator.accountId}
      `;
      const confirmation = rows.find((row) => row.id === deleted.outbox_id);
      const others = rows.filter((row) => row.id !== deleted.outbox_id);

      expect(confirmation).toMatchObject({
        payload: {},
        recipient_email: ownerEmail,
        retain_until_sent: true,
        status: "PENDING",
        template: "ACCOUNT_DELETION_REQUESTED",
      });
      expect(others.length).toBeGreaterThan(0);
      for (const row of others) {
        expect(row.recipient_email).toBe("eliminated@eliminated.invalid");
        expect(row.payload).toEqual({});
        expect(["SENT", "DEAD_LETTER"]).toContain(row.status);
      }

      await actAsSystem(transaction);
      // A transient failure keeps the recipient for the retry.
      await transaction`
        update public.email_outbox set status = 'FAILED', attempt_count = 1
        where id = ${deleted.outbox_id}
      `;
      const [afterFailure] = await transaction<{ recipient_email: string }[]>`
        select recipient_email from public.email_outbox where id = ${deleted.outbox_id}
      `;

      expect(afterFailure?.recipient_email).toBe(ownerEmail);

      await transaction`
        update public.email_outbox set status = 'SENT', sent_at = now()
        where id = ${deleted.outbox_id}
      `;
      const [afterSend] = await transaction<
        {
          payload: Record<string, unknown>;
          recipient_email: string;
          retain_until_sent: boolean;
        }[]
      >`
        select recipient_email, payload, retain_until_sent
        from public.email_outbox where id = ${deleted.outbox_id}
      `;

      expect(afterSend).toEqual({
        payload: {},
        recipient_email: "eliminated@eliminated.invalid",
        retain_until_sent: false,
      });

      const [audit] = await transaction<{ leaked: number }[]>`
        select count(*)::integer as leaked
        from public.audit_revisions
        where entity_id = ${deleted.outbox_id}
          and (before_state::text like '%contentecreators.test%'
            or after_state::text like '%contentecreators.test%')
      `;

      expect(audit?.leaked).toBe(0);
    });
  });

  it("scrubs the confirmation after a definitive delivery failure", async () => {
    await inRolledBackTransaction(async (transaction) => {
      const deleted = await deleteOwnAccount(transaction, creator);

      await actAsSystem(transaction);
      await transaction`
        update public.email_outbox set status = 'DEAD_LETTER', attempt_count = 5
        where id = ${deleted.outbox_id}
      `;
      const [row] = await transaction<{ recipient_email: string }[]>`
        select recipient_email from public.email_outbox where id = ${deleted.outbox_id}
      `;

      expect(row?.recipient_email).toBe("eliminated@eliminated.invalid");
    });
  });

  it("frees the login: the same identity can register again in the same or another role", async () => {
    await inRolledBackTransaction(async (transaction) => {
      await deleteOwnAccount(transaction, creator);
      await actAsSystem(transaction);

      const before = await transaction<{ id: string }[]>`
        select id from public.accounts where auth_user_id = ${creator.authUserId}
      `;

      expect(before).toEqual([]);

      const [sameRole] = await transaction<{ id: string }[]>`
        insert into public.accounts (auth_user_id, role, operational_email)
        values (${creator.authUserId}, 'INFLUENCER', 'creator-approved@contentecreators.test')
        returning id
      `;

      expect(sameRole?.id).not.toBe(creator.accountId);

      await transaction`delete from public.accounts where id = ${sameRole!.id}`;

      const [otherRole] = await transaction<{ id: string }[]>`
        insert into public.accounts (auth_user_id, role, operational_email)
        values (${creator.authUserId}, 'COMPANY', 'creator-approved@contentecreators.test')
        returning id
      `;

      expect(otherRole?.id).toBeTruthy();
    });
  });

  it("archives the featured placement and detaches the creator instead of failing", async () => {
    await inRolledBackTransaction(async (transaction) => {
      await deleteOwnAccount(transaction, featuredCreator);

      const [placement] = await transaction<
        {
          active: boolean;
          advertiser: string | null;
          archived: boolean;
          featured: string | null;
        }[]
      >`
        select
          is_active as active,
          archived_at is not null as archived,
          featured_creator_profile_id as featured,
          advertiser_account_id as advertiser
        from public.sponsorship_placements where id = ${featuredPlacementId}
      `;

      expect(placement).toEqual({
        active: false,
        advertiser: company.accountId,
        archived: true,
        featured: null,
      });

      const [account] = await transaction<{ state: string }[]>`
        select deletion_state as state from public.accounts where id = ${featuredCreator.accountId}
      `;

      expect(account?.state).toBe("ELIMINATED");
    });
  });

  it("archives the placements of an advertiser, which keep pointing at the tombstone", async () => {
    await inRolledBackTransaction(async (transaction) => {
      const deleted = await deleteOwnAccount(transaction, company);

      const [placement] = await transaction<
        { advertiser: string | null; archived: boolean }[]
      >`
        select archived_at is not null as archived, advertiser_account_id as advertiser
        from public.sponsorship_placements where id = ${featuredPlacementId}
      `;

      expect(placement).toEqual({
        advertiser: company.accountId,
        archived: true,
      });
      expect(deleted.storage_objects.length).toBeGreaterThan(0);

      const [remaining] = await transaction<
        { locations: number; profiles: number }[]
      >`
        select
          (select count(*)::integer from public.company_profiles where account_id = ${company.accountId}) as profiles,
          (select count(*)::integer from public.company_locations location
            where not exists (select 1 from public.company_profiles profile where profile.id = location.company_profile_id)) as locations
      `;

      expect(remaining).toEqual({ locations: 0, profiles: 0 });
    });
  });

  it("refuses banned accounts, administrators and a second deletion", async () => {
    await inRolledBackTransaction(async (transaction) => {
      await actAs(transaction, bannedCreator);
      await transaction`set local role contente_app_user`;
      await transaction`savepoint banned`;
      await expect(
        transaction`select * from public.app_delete_own_account()`,
      ).rejects.toThrow(/account_deletion_banned/u);
      await transaction`rollback to savepoint banned`;

      await actAs(transaction, admin);
      await transaction`savepoint as_admin`;
      await expect(
        transaction`select * from public.app_delete_own_account()`,
      ).rejects.toThrow(/account_deletion_role_forbidden/u);
      await transaction`rollback to savepoint as_admin`;

      // Context claiming another login for the account is not verified.
      await actAs(transaction, {
        ...creator,
        authUserId: featuredCreator.authUserId,
      });
      await transaction`savepoint forged`;
      await expect(
        transaction`select * from public.app_delete_own_account()`,
      ).rejects.toThrow(/account_deletion_context_required/u);
      await transaction`rollback to savepoint forged`;
      await transaction`reset role`;

      await deleteOwnAccount(transaction, creator);
      await actAs(transaction, creator);
      await transaction`set local role contente_app_user`;
      await expect(
        transaction`select * from public.app_delete_own_account()`,
      ).rejects.toThrow(/account_deletion_context_required/u);
    });

    const [banned] = await database<
      { auth_user_id: string | null; state: string | null }[]
    >`
      select auth_user_id, deletion_state as state
      from public.accounts where id = ${bannedCreator.accountId}
    `;

    expect(banned).toEqual({
      auth_user_id: bannedCreator.authUserId,
      state: null,
    });
  });

  it("deletes only the linked profile of an administrator, never the ADMIN row", async () => {
    await inRolledBackTransaction(async (transaction) => {
      await actAsSystem(transaction);
      const [linked] = await transaction<{ id: string }[]>`
        insert into public.accounts (auth_user_id, role, status, operational_email, approved_at, submitted_at)
        values (${admin.authUserId}, 'INFLUENCER', 'APPROVED', 'admin-linked@contentecreators.test', now(), now())
        returning id
      `;
      await transaction`
        insert into public.creator_profiles (account_id, legal_name, display_name, creator_type)
        values (${linked!.id}, 'Admin Vinculado', 'Admin Vinculado', 'INFLUENCER')
      `;

      await deleteOwnAccount(transaction, {
        accountId: linked!.id,
        authUserId: admin.authUserId,
        role: "INFLUENCER",
      });

      const rows = await transaction<
        {
          archived: boolean;
          auth_user_id: string | null;
          role: string;
          state: string | null;
        }[]
      >`
        select role::text, auth_user_id, deletion_state as state, archived_at is not null as archived
        from public.accounts
        where id in (${admin.accountId}, ${linked!.id})
        order by role
      `;

      expect(rows).toEqual([
        {
          archived: false,
          auth_user_id: admin.authUserId,
          role: "ADMIN",
          state: null,
        },
        {
          archived: true,
          auth_user_id: null,
          role: "INFLUENCER",
          state: "ELIMINATED",
        },
      ]);

      await actAs(transaction, admin);
      const [context] = await transaction<{ is_admin: boolean }[]>`
        select public.app_is_admin() as is_admin
      `;

      expect(context?.is_admin).toBe(true);
    });
  });

  it("keeps the internal routines out of reach of application roles", async () => {
    const grants = await database<{ function_name: string; grantee: string }[]>`
      select p.proname as function_name, grantee.rolname as grantee
      from pg_proc p
      cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
      join pg_roles grantee on grantee.oid = acl.grantee
      where p.pronamespace = 'public'::regnamespace
        and p.proname in ('app_delete_own_account', 'app_erase_account_data', 'app_eliminate_account_data')
        and acl.privilege_type = 'EXECUTE'
        and grantee.rolname <> 'postgres'
      order by 1, 2
    `;

    expect(grants).toEqual([
      { function_name: "app_delete_own_account", grantee: "contente_app_user" },
      { function_name: "app_eliminate_account_data", grantee: "service_role" },
    ]);

    const [retired] = await database<{ total: number }[]>`
      select count(*)::integer as total
      from pg_proc
      where pronamespace = 'public'::regnamespace
        and proname in ('app_request_account_deletion', 'app_admin_recover_account')
    `;

    expect(retired?.total).toBe(0);

    const [queue] = await database<
      { anon: boolean; app: boolean; authenticated: boolean; forced: boolean }[]
    >`
      select
        has_table_privilege('contente_app_user', 'public.storage_cleanup_queue', 'select') as app,
        has_table_privilege('anon', 'public.storage_cleanup_queue', 'select') as anon,
        has_table_privilege('authenticated', 'public.storage_cleanup_queue', 'select') as authenticated,
        (select relforcerowsecurity from pg_class where oid = 'public.storage_cleanup_queue'::regclass) as forced
    `;

    expect(queue).toEqual({
      anon: false,
      app: false,
      authenticated: false,
      forced: true,
    });

    await inRolledBackTransaction(async (transaction) => {
      await actAs(transaction, creator);
      await transaction`set local role contente_app_user`;
      await transaction`savepoint erase`;
      await expect(
        transaction`select public.app_erase_account_data(${creator.accountId}::uuid)`,
      ).rejects.toThrow(/permission denied/u);
      await transaction`rollback to savepoint erase`;
      await expect(
        transaction`select public.app_eliminate_account_data(${creator.accountId}::uuid)`,
      ).rejects.toThrow(/permission denied/u);
    });
  });

  it("only lets an eliminated tombstone lose the login link", async () => {
    await inRolledBackTransaction(async (transaction) => {
      await actAsSystem(transaction);
      await expect(
        transaction`update public.accounts set auth_user_id = null where id = ${creator.accountId}`,
      ).rejects.toThrow(/accounts_auth_user_link_check/u);
    });

    await inRolledBackTransaction(async (transaction) => {
      await actAsSystem(transaction);
      await expect(
        transaction`update public.sponsorship_placements set featured_creator_profile_id = null where id = ${featuredPlacementId}`,
      ).rejects.toThrow(/sponsorship_placements_featured_creator_check/u);
    });
  });

  it("eliminates legacy REQUESTED accounts and unlinks old tombstones without a window", async () => {
    await inRolledBackTransaction(async (transaction) => {
      await actAsSystem(transaction);
      // Shape left by the retired 30-day flow.
      await transaction`
        update public.accounts
        set deletion_requested_at = now(),
            elimination_eligible_at = now() + interval '30 days',
            deletion_due_at = now() + interval '120 days',
            deletion_state = 'REQUESTED',
            archived_at = now()
        where id = ${creator.accountId}
      `;
      await transaction`
        update public.accounts
        set deletion_requested_at = now() - interval '40 days',
            elimination_eligible_at = now() - interval '10 days',
            deletion_due_at = now() + interval '80 days',
            deletion_state = 'ELIMINATED',
            eliminated_at = now() - interval '9 days',
            archived_at = now() - interval '40 days'
        where id = ${featuredCreator.accountId}
      `;

      await transaction`savepoint active_account`;
      await expect(
        transaction`select public.app_eliminate_account_data(${company.accountId}::uuid)`,
      ).rejects.toThrow(/account_elimination_not_applicable/u);
      await transaction`rollback to savepoint active_account`;

      await transaction`select public.app_eliminate_account_data(${creator.accountId}::uuid)`;
      await transaction`select public.app_eliminate_account_data(${featuredCreator.accountId}::uuid)`;

      const rows = await transaction<
        {
          auth_user_id: string | null;
          id: string;
          kept_original_date: boolean;
          state: string;
        }[]
      >`
        select id, auth_user_id, deletion_state as state,
          eliminated_at < now() - interval '1 day' as kept_original_date
        from public.accounts
        where id in (${creator.accountId}, ${featuredCreator.accountId})
        order by id
      `;

      expect(rows).toEqual([
        {
          auth_user_id: null,
          id: featuredCreator.accountId,
          kept_original_date: true,
          state: "ELIMINATED",
        },
        {
          auth_user_id: null,
          id: creator.accountId,
          kept_original_date: false,
          state: "ELIMINATED",
        },
      ]);

      await expect(
        transaction`select public.app_eliminate_account_data(${creator.accountId}::uuid)`,
      ).rejects.toThrow(/account_elimination_not_applicable/u);
    });
  });

  it("erases moderation free text, Auth effects and their audit trail with the account", async () => {
    // Admin free text: the moderation reason and a requested_fields note.
    const marker = "marcador-remocao-moderacao-7f3a9c";
    await inRolledBackTransaction(async (transaction) => {
      await seedCreatorExtras(transaction);
      await actAsSystem(transaction);
      const [moderationCase] = await transaction<{ id: string }[]>`
        insert into public.moderation_cases (account_id, current_submission_sequence, submitted_at)
        values (${creator.accountId}, 1, now())
        on conflict (account_id) do update
        set current_submission_sequence = moderation_cases.current_submission_sequence
        returning id
      `;
      // The audit reason of the insert below carries the marker, as admin free text does.
      await transaction`select set_config('app.audit.reason', ${marker}, true)`;
      const [event] = await transaction<{ id: string }[]>`
        insert into public.moderation_events (
          moderation_case_id, submission_sequence, from_status, to_status, action,
          reason, actor_account_id, idempotency_key, requested_fields
        )
        values (
          ${moderationCase!.id}, 1, 'APPROVED', 'SUSPENDED', 'SUSPEND',
          ${`Motivo: ${marker}`}, ${admin.accountId}, ${`deletion-test-moderation:${creator.accountId}`},
          ${transaction.json([{ field: "displayName", note: `Nota: ${marker}` }])}
        )
        returning id
      `;
      const [effect] = await transaction<{ id: string }[]>`
        insert into public.identity_auth_effects (
          moderation_event_id, account_id, auth_user_id, action, idempotency_key
        )
        values (
          ${event!.id}, ${creator.accountId}, ${creator.authUserId}, 'BAN',
          ${`deletion-test-effect:${creator.accountId}`}
        )
        returning id
      `;

      const [seeded] = await transaction<{ count: number }[]>`
        select count(*)::integer as count
        from public.audit_revisions
        where strpos(coalesce(before_state::text, '') || coalesce(after_state::text, '') || coalesce(reason, ''), ${marker}) > 0
      `;
      expect(seeded?.count).toBeGreaterThan(0);

      await deleteOwnAccount(transaction, creator);

      const [leaks] = await transaction<Record<string, number>[]>`
        select
          (select count(*)::integer from public.audit_revisions
            where strpos(coalesce(before_state::text, ''), ${marker}) > 0
              or strpos(coalesce(after_state::text, ''), ${marker}) > 0
              or strpos(coalesce(reason, ''), ${marker}) > 0) as audit_marker,
          (select count(*)::integer from public.moderation_events
            where strpos(to_jsonb(moderation_events)::text, ${marker}) > 0) as moderation_marker,
          (select count(*)::integer from public.email_outbox
            where strpos(to_jsonb(email_outbox)::text, ${marker}) > 0) as outbox_marker,
          (select count(*)::integer from public.identity_auth_effects
            where account_id = ${creator.accountId}) as identity_effects,
          (select count(*)::integer from public.audit_revisions
            where entity_table = 'identity_auth_effects' and entity_id = ${effect!.id}
              and before_state is not null and before_state <> '{"redacted": true}'::jsonb) as identity_audit_unredacted
      `;

      expect(leaks).toEqual({
        audit_marker: 0,
        identity_audit_unredacted: 0,
        identity_effects: 0,
        moderation_marker: 0,
        outbox_marker: 0,
      });

      const [event_after] = await transaction<
        { reason: string | null; requested_fields: unknown }[]
      >`
        select reason, requested_fields
        from public.moderation_events
        where id = ${event!.id}
      `;

      expect(event_after).toEqual({
        reason: "[removido]",
        requested_fields: [{ field: "displayName", note: null }],
      });

      // The INSERT revision and the revision written by the erasure's own update.
      const [event_revisions] = await transaction<
        { total: number; unmasked: number }[]
      >`
        select
          count(*)::integer as total,
          count(*) filter (
            where (reason is not null and reason <> '[removido]')
              or (after_state is not null and after_state <> '{"redacted": true}'::jsonb)
          )::integer as unmasked
        from public.audit_revisions
        where entity_table = 'moderation_events' and entity_id = ${event!.id}
      `;

      expect(event_revisions?.total).toBeGreaterThanOrEqual(2);
      expect(event_revisions?.unmasked).toBe(0);
    });
  });

  it("has a disposition for every table that references accounts", async () => {
    // Adding a table with a foreign key to accounts must come with a decision in
    // app_erase_account_data() and docs/operations/account-deletion.md.
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
        // Auth effects tie the login to the moderation history: deleted with the account
        "identity_auth_effects",
        // ANONYMIZE
        "account_consents",
        "audit_revisions",
        "email_outbox",
        "moderation_events",
        // ARCHIVE (advertiser keeps pointing at the tombstone)
        "sponsorship_placements",
        // KEEP (no personal content, or retained by approved decision)
        "account_contact_preferences",
        "blocked_identities",
        "moderation_cases",
      ].sort(),
    );
  });
});
