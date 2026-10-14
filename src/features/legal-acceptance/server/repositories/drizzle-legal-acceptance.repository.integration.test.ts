import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

/*
 * Exercises the re-acceptance SQL contract (migration 20261014180000) against the
 * local Supabase database. Every scenario runs in a transaction that is rolled
 * back, so the seeded official documents and real rows stay untouched.
 */
const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sqlClient = postgres(databaseUrl, { connect_timeout: 5, max: 1 });

const TERMS_1_0 = "f5000000-0000-4000-8000-000000000001";
const PRIVACY_1_0 = "f5000000-0000-4000-8000-000000000002";
const ROLLBACK = Symbol("rollback");

type Tx = postgres.TransactionSql;

async function withRolledBackTransaction(
  run: (tx: Tx) => Promise<void>,
): Promise<void> {
  try {
    await sqlClient.begin(async (tx) => {
      await run(tx);
      throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) {
      throw error;
    }
  }
}

async function actAs(
  tx: Tx,
  account: { id: string; role: string; status: string },
) {
  const authUserId = crypto.randomUUID();
  await tx`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-4000-8000-000000000000', ${authUserId}, 'authenticated',
      'authenticated', ${`${account.id}@legal.test`}, 'x', '{}', '{}', now(), now()
    )
  `;
  await tx`
    insert into public.accounts (id, auth_user_id, role, status, operational_email)
    values (${account.id}, ${authUserId}, ${account.role}::public.account_role,
      ${account.status}::public.account_status, ${`${account.id}@legal.test`})
  `;
  await tx`select set_config('app.jwt.account_id', ${account.id}, true)`;
  await tx`select set_config('app.jwt.auth_user_id', ${authUserId}, true)`;
  await tx`select set_config('app.jwt.account_role', ${account.role}, true)`;
  await tx`select set_config('app.jwt.account_status', ${account.status}, true)`;
}

async function pendingIds(tx: Tx): Promise<string[]> {
  const rows = await tx<{ id: string }[]>`
    select id from public.app_list_pending_legal_documents() order by id
  `;
  return rows.map((row) => row.id);
}

afterAll(async () => {
  await sqlClient.end();
});

describeLocalStack("legal re-acceptance SQL contract", () => {
  it("lists both official 1.0 documents as pending for an approved creator without consent", async () => {
    await withRolledBackTransaction(async (tx) => {
      await actAs(tx, {
        id: crypto.randomUUID(),
        role: "INFLUENCER",
        status: "APPROVED",
      });

      expect(await pendingIds(tx)).toEqual([PRIVACY_1_0, TERMS_1_0].sort());
    });
  });

  it("lets a PENDING_REVIEW company accept, then becomes not pending, and is idempotent", async () => {
    await withRolledBackTransaction(async (tx) => {
      await actAs(tx, {
        id: crypto.randomUUID(),
        role: "COMPANY",
        status: "PENDING_REVIEW",
      });
      const ids = [TERMS_1_0, PRIVACY_1_0];

      const [first] = await tx<{ n: number }[]>`
        select public.app_accept_legal_documents(${ids}::uuid[], 'req-1') as n
      `;
      const [second] = await tx<{ n: number }[]>`
        select public.app_accept_legal_documents(${ids}::uuid[], 'req-2') as n
      `;

      expect(first?.n).toBe(2);
      expect(second?.n).toBe(0);
      expect(await pendingIds(tx)).toEqual([]);
    });
  });

  it("rejects a stale or partial set without writing anything", async () => {
    await withRolledBackTransaction(async (tx) => {
      const accountId = crypto.randomUUID();
      await actAs(tx, {
        id: accountId,
        role: "INFLUENCER",
        status: "APPROVED",
      });

      await expect(
        tx.savepoint(
          (point) =>
            point`select public.app_accept_legal_documents(${[TERMS_1_0]}::uuid[], 'partial')`,
        ),
      ).rejects.toThrow("legal_documents_not_current");

      const [count] = await tx<{ n: number }[]>`
        select count(*)::int as n from public.account_consents
        where account_id = ${accountId}
      `;
      expect(count?.n).toBe(0);
    });
  });

  it("never lists documents for ADMIN, ONBOARDING, or SUSPENDED accounts", async () => {
    for (const account of [
      { role: "ADMIN", status: "APPROVED" },
      { role: "INFLUENCER", status: "ONBOARDING" },
      { role: "COMPANY", status: "SUSPENDED" },
    ]) {
      await withRolledBackTransaction(async (tx) => {
        await actAs(tx, { id: crypto.randomUUID(), ...account });

        expect(await pendingIds(tx)).toEqual([]);
      });
    }
  });

  it("makes only a newly published TERMS version pending for an account that accepted 1.0", async () => {
    await withRolledBackTransaction(async (tx) => {
      await actAs(tx, {
        id: crypto.randomUUID(),
        role: "INFLUENCER",
        status: "APPROVED",
      });
      await tx`
        select public.app_accept_legal_documents(${[TERMS_1_0, PRIVACY_1_0]}::uuid[], 'req-1')
      `;

      const newVersionId = crypto.randomUUID();
      await tx`
        insert into public.legal_documents (
          id, document_type, version_label, content_hash, published_at, active_from
        ) values (
          ${newVersionId}, 'TERMS', ${`9.9-${newVersionId.slice(0, 8)}`},
          ${"a".repeat(64)}, now(), now() - interval '1 minute'
        )
      `;

      expect(await pendingIds(tx)).toEqual([newVersionId]);
    });
  });

  it("writes consent rows tagged with the reacceptance flow and request id", async () => {
    await withRolledBackTransaction(async (tx) => {
      const accountId = crypto.randomUUID();
      await actAs(tx, {
        id: accountId,
        role: "INFLUENCER",
        status: "APPROVED",
      });
      await tx`
        select public.app_accept_legal_documents(${[TERMS_1_0, PRIVACY_1_0]}::uuid[], 'req-audit')
      `;

      const rows = await tx<
        { context: { flow: string }; request_id: string }[]
      >`
        select context, request_id from public.account_consents
        where account_id = ${accountId}
      `;

      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.context).toMatchObject({
          flow: "reacceptance",
          legalCopyApproved: true,
        });
        expect(row.request_id).toBe("req-audit");
      }
    });
  });
});
