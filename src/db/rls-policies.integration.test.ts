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

type AppContext = {
  accountId: string;
  authUserId: string;
  role: "ADMIN" | "INFLUENCER" | "COMPANY";
  status:
    | "ONBOARDING"
    | "PENDING_REVIEW"
    | "CHANGES_REQUESTED"
    | "APPROVED"
    | "SUSPENDED"
    | "BANNED";
};

const adminContext: AppContext = {
  accountId: "a0000000-0000-4000-8000-000000000001",
  authUserId: "10000000-0000-4000-8000-000000000001",
  role: "ADMIN",
  status: "APPROVED",
};
const approvedCreatorContext: AppContext = {
  accountId: "b0000000-0000-4000-8000-000000000004",
  authUserId: "20000000-0000-4000-8000-000000000004",
  role: "INFLUENCER",
  status: "APPROVED",
};
const approvedCompanyContext: AppContext = {
  accountId: "c0000000-0000-4000-8000-000000000004",
  authUserId: "30000000-0000-4000-8000-000000000004",
  role: "COMPANY",
  status: "APPROVED",
};
const editableCreatorContext: AppContext = {
  accountId: "b0000000-0000-4000-8000-000000000003",
  authUserId: "20000000-0000-4000-8000-000000000003",
  role: "INFLUENCER",
  status: "CHANGES_REQUESTED",
};
const approvedCreatorProfileId = "d0000000-0000-4000-8000-000000000004";
const contactHiddenCreatorAccountId = "b0000000-0000-4000-8000-000000000007";
const contactHiddenCreatorProfileId = "d0000000-0000-4000-8000-000000000007";

const nonApprovedContexts: AppContext[] = [
  {
    accountId: "b0000000-0000-4000-8000-000000000001",
    authUserId: "20000000-0000-4000-8000-000000000001",
    role: "INFLUENCER",
    status: "ONBOARDING",
  },
  {
    accountId: "b0000000-0000-4000-8000-000000000002",
    authUserId: "20000000-0000-4000-8000-000000000002",
    role: "INFLUENCER",
    status: "PENDING_REVIEW",
  },
  editableCreatorContext,
  {
    accountId: "b0000000-0000-4000-8000-000000000005",
    authUserId: "20000000-0000-4000-8000-000000000005",
    role: "INFLUENCER",
    status: "SUSPENDED",
  },
  {
    accountId: "b0000000-0000-4000-8000-000000000006",
    authUserId: "20000000-0000-4000-8000-000000000006",
    role: "INFLUENCER",
    status: "BANNED",
  },
];

async function assumeAppContext(
  transaction: postgres.TransactionSql,
  context: AppContext,
) {
  await transaction.unsafe("set local role contente_app_user");
  await transaction`
    select
      set_config('app.jwt.auth_user_id', ${context.authUserId}, true),
      set_config('app.jwt.account_id', ${context.accountId}, true),
      set_config('app.jwt.account_role', ${context.role}, true),
      set_config('app.jwt.account_status', ${context.status}, true),
      set_config('app.jwt.request_id', 'rls-integration-test', true)
  `;
}

async function expectPermissionDenied(role: "anon" | "authenticated") {
  await expect(
    database.begin(async (transaction) => {
      await transaction.unsafe(`set local role ${role}`);
      await transaction`select id from public.accounts limit 1`;
    }),
  ).rejects.toMatchObject({
    code: "42501",
  });
}

describeLocalStack("business table row-level security", () => {
  afterAll(async () => {
    await database.end({ timeout: 2 });
  });

  it("denies direct business-table access to Supabase API roles", async () => {
    await expectPermissionDenied("anon");
    await expectPermissionDenied("authenticated");
  });

  it("allows an editable owner and denies cross-account reads and writes", async () => {
    const rollback = new Error("rollback RLS owner mutations");

    try {
      await database.begin(async (transaction) => {
        await assumeAppContext(transaction, editableCreatorContext);

        const ownProfile = await transaction<{ id: string }[]>`
          select id
          from public.creator_profiles
          where account_id = ${editableCreatorContext.accountId}
        `;
        const crossAccountProfile = await transaction<{ id: string }[]>`
          select id
          from public.creator_profiles
          where account_id = ${approvedCreatorContext.accountId}
        `;
        const updatedOwnProfile = await transaction<{ id: string }[]>`
          update public.creator_profiles
          set bio = 'Correção sintética permitida ao proprietário.',
              version = version + 1
          where account_id = ${editableCreatorContext.accountId}
          returning id
        `;
        const updatedCrossAccountProfile = await transaction<{ id: string }[]>`
          update public.creator_profiles
          set bio = 'Esta alteração cruzada deve ser bloqueada.',
              version = version + 1
          where account_id = ${approvedCreatorContext.accountId}
          returning id
        `;

        expect(ownProfile).toHaveLength(1);
        expect(crossAccountProfile).toHaveLength(0);
        expect(updatedOwnProfile).toHaveLength(1);
        expect(updatedCrossAccountProfile).toHaveLength(0);

        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }
  });

  it("allows approved companies to read only approved creator catalog rows", async () => {
    await database.begin(async (transaction) => {
      await assumeAppContext(transaction, approvedCompanyContext);

      const creators = await transaction<{ id: string; account_id: string }[]>`
        select creator.id, creator.account_id
        from public.creator_profiles creator
        order by creator.id
      `;
      const otherCompanies = await transaction<{ id: string }[]>`
        select company.id
        from public.company_profiles company
        where company.account_id <> ${approvedCompanyContext.accountId}
      `;

      expect(creators).toEqual([
        {
          id: approvedCreatorProfileId,
          account_id: approvedCreatorContext.accountId,
        },
        {
          id: contactHiddenCreatorProfileId,
          account_id: contactHiddenCreatorAccountId,
        },
      ]);
      expect(otherCompanies).toHaveLength(0);
    });
  });

  it("allows approved influencers to read approved creator and company presentation rows", async () => {
    await database.begin(async (transaction) => {
      await assumeAppContext(transaction, approvedCreatorContext);

      const creators = await transaction<{ id: string }[]>`
        select id
        from public.creator_profiles
        order by id
      `;
      const companies = await transaction<{ account_id: string }[]>`
        select account_id
        from public.company_profiles
        order by account_id
      `;

      expect(creators.map(({ id }) => id)).toEqual([
        approvedCreatorProfileId,
        contactHiddenCreatorProfileId,
      ]);
      expect(companies).toEqual([
        {
          account_id: approvedCompanyContext.accountId,
        },
      ]);
    });
  });

  it("makes creator contact consent visible only to an approved company", async () => {
    await database.begin(async (transaction) => {
      await assumeAppContext(transaction, approvedCompanyContext);

      const companyContactAccess = await transaction<{ account_id: string }[]>`
        select account_id
        from public.account_contact_preferences
        where account_id = ${approvedCreatorContext.accountId}
      `;

      expect(companyContactAccess).toEqual([
        {
          account_id: approvedCreatorContext.accountId,
        },
      ]);
    });

    await database.begin(async (transaction) => {
      await assumeAppContext(transaction, approvedCreatorContext);

      const influencerContactAccess = await transaction<
        { account_id: string }[]
      >`
        select account_id
        from public.account_contact_preferences
        where account_id <> ${approvedCreatorContext.accountId}
      `;

      expect(influencerContactAccess).toHaveLength(0);
    });
  });

  it("allows a current approved administrator to inspect restricted operations", async () => {
    await database.begin(async (transaction) => {
      await assumeAppContext(transaction, adminContext);

      const [visibility] = await transaction<
        {
          audit_count: number;
          blocked_identity_count: number;
          outbox_count: number;
        }[]
      >`
        select
          (select count(*)::integer from public.audit_revisions) as audit_count,
          (
            select count(*)::integer
            from public.blocked_identities
          ) as blocked_identity_count,
          (select count(*)::integer from public.email_outbox) as outbox_count
      `;

      expect(visibility.audit_count).toBeGreaterThan(0);
      expect(visibility.blocked_identity_count).toBeGreaterThan(0);
      expect(visibility.outbox_count).toBeGreaterThan(0);
    });
  });

  it.each([approvedCreatorContext, approvedCompanyContext])(
    "keeps audit, blocked identities, and outbox invisible to a normal $role",
    async (context) => {
      await database.begin(async (transaction) => {
        await assumeAppContext(transaction, context);

        const [visibility] = await transaction<
          {
            audit_count: number;
            blocked_identity_count: number;
            outbox_count: number;
          }[]
        >`
          select
            (select count(*)::integer from public.audit_revisions) as audit_count,
            (
              select count(*)::integer
              from public.blocked_identities
            ) as blocked_identity_count,
            (select count(*)::integer from public.email_outbox) as outbox_count
        `;

        expect(visibility).toEqual({
          audit_count: 0,
          blocked_identity_count: 0,
          outbox_count: 0,
        });
      });
    },
  );

  it.each(nonApprovedContexts)(
    "returns no catalog data to $status accounts",
    async (context) => {
      await database.begin(async (transaction) => {
        await assumeAppContext(transaction, context);

        const catalogRows = await transaction<{ id: string }[]>`
          select id
          from public.creator_profiles
          where id = ${approvedCreatorProfileId}
            and account_id <> ${context.accountId}
        `;

        expect(catalogRows).toHaveLength(0);
      });
    },
  );

  it("rejects missing or forged verified context", async () => {
    await expect(
      database.begin(async (transaction) => {
        await transaction.unsafe("set local role contente_app_user");
        return transaction`select id from public.accounts limit 1`;
      }),
    ).resolves.toHaveLength(0);

    await expect(
      database.begin(async (transaction) => {
        await assumeAppContext(transaction, {
          ...approvedCreatorContext,
          role: "ADMIN",
        });
        return transaction`select id from public.accounts limit 1`;
      }),
    ).resolves.toHaveLength(0);
  });
});
