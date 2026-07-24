import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const database = postgres(
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  {
    connect_timeout: 5,
    idle_timeout: 1,
    max: 1,
  },
);

const approvedCreator = {
  accountId: "b0000000-0000-4000-8000-000000000004",
  authUserId: "20000000-0000-4000-8000-000000000004",
};
const approvedCompany = {
  accountId: "c0000000-0000-4000-8000-000000000004",
  authUserId: "30000000-0000-4000-8000-000000000004",
};
const onboardingCreator = {
  accountId: "b0000000-0000-4000-8000-000000000001",
  authUserId: "20000000-0000-4000-8000-000000000001",
};
const admin = {
  accountId: "a0000000-0000-4000-8000-000000000001",
  authUserId: "10000000-0000-4000-8000-000000000001",
};
const restrictedAccounts = [
  {
    accountId: "b0000000-0000-4000-8000-000000000005",
    authUserId: "20000000-0000-4000-8000-000000000005",
    status: "SUSPENDED",
  },
  {
    accountId: "b0000000-0000-4000-8000-000000000006",
    authUserId: "20000000-0000-4000-8000-000000000006",
    status: "BANNED",
  },
] as const;
const approvedProfileObjectPath = `${approvedCreator.accountId}/avatar/catalog.webp`;
const rollback = new Error("rollback storage policy test");

type StorageTransaction = postgres.TransactionSql;

async function seedApprovedProfileObject(transaction: StorageTransaction) {
  await transaction`
    select
      set_config('app.audit.actor_account_id', '', true),
      set_config('app.audit.actor_type', 'SYSTEM', true),
      set_config('app.audit.actor_role', '', true),
      set_config('app.audit.source', 'SCRIPT', true),
      set_config('app.audit.request_id', 'storage-policy-test', true),
      set_config('app.audit.reason', 'Synthetic rollback-only Storage fixture', true)
  `;
  await transaction`
    insert into storage.objects (
      id,
      bucket_id,
      name,
      owner,
      owner_id,
      metadata
    )
    values (
      '71000000-0000-4000-8000-000000000001',
      'profile-media',
      ${approvedProfileObjectPath},
      ${approvedCreator.authUserId},
      ${approvedCreator.authUserId},
      '{"mimetype":"image/webp","size":1024}'::jsonb
    )
  `;
  await transaction`
    insert into public.media_assets (
      id,
      owner_account_id,
      bucket_name,
      object_path,
      kind,
      mime_type,
      size_bytes,
      status
    )
    values (
      '72000000-0000-4000-8000-000000000001',
      ${approvedCreator.accountId},
      'profile-media',
      ${approvedProfileObjectPath},
      'AVATAR',
      'image/webp',
      1024,
      'ACTIVE'
    )
  `;
}

async function assumeStorageRole(
  transaction: StorageTransaction,
  role: "anon" | "authenticated",
  authUserId?: string,
) {
  await transaction`
    select set_config(
      'request.jwt.claims',
      ${JSON.stringify({
        role,
        sub: authUserId,
      })},
      true
    )
  `;
  await transaction.unsafe(`set local role ${role}`);
}

async function runWithFixture<T>(
  work: (transaction: StorageTransaction) => Promise<T>,
): Promise<T> {
  let result: T | undefined;

  try {
    await database.begin(async (transaction) => {
      await seedApprovedProfileObject(transaction);
      result = await work(transaction);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) {
      throw error;
    }
  }

  return result as T;
}

describeLocalStack("private Storage policies", () => {
  afterAll(async () => {
    await database.end({ timeout: 2 });
  });

  it("keeps both buckets private and invisible to anonymous requests", async () => {
    const result = await runWithFixture(async (transaction) => {
      const buckets = await transaction<{ id: string; public: boolean }[]>`
        select id, public
        from storage.buckets
        where id in ('profile-media', 'sponsorship-media')
        order by id
      `;
      await assumeStorageRole(transaction, "anon");
      const objects = await transaction<{ name: string }[]>`
        select name
        from storage.objects
        where bucket_id = 'profile-media'
      `;

      return { buckets, objects };
    });

    expect(result).toEqual({
      buckets: [
        { id: "profile-media", public: false },
        { id: "sponsorship-media", public: false },
      ],
      objects: [],
    });
  });

  it("allows an editable owner to upload to and read its account folder", async () => {
    const ownerObjectPath = `${onboardingCreator.accountId}/avatar/new.webp`;
    const objects = await runWithFixture(async (transaction) => {
      await assumeStorageRole(
        transaction,
        "authenticated",
        onboardingCreator.authUserId,
      );
      await transaction`
        insert into storage.objects (
          bucket_id,
          name,
          owner,
          owner_id,
          metadata
        )
        values (
          'profile-media',
          ${ownerObjectPath},
          ${onboardingCreator.authUserId},
          ${onboardingCreator.authUserId},
          '{"mimetype":"image/webp","size":2048}'::jsonb
        )
      `;

      return transaction<{ name: string }[]>`
        select name
        from storage.objects
        where bucket_id = 'profile-media'
        order by name
      `;
    });

    expect(objects).toEqual([{ name: ownerObjectPath }]);
  });

  it("denies cross-owner read, upload, replacement and deletion", async () => {
    const crossReadResult = await runWithFixture(async (transaction) => {
      await assumeStorageRole(
        transaction,
        "authenticated",
        onboardingCreator.authUserId,
      );
      const visible = await transaction<{ name: string }[]>`
          select name
          from storage.objects
          where bucket_id = 'profile-media'
            and name = ${approvedProfileObjectPath}
        `;
      const replaced = await transaction<{ name: string }[]>`
          update storage.objects
          set metadata = '{"mimetype":"image/png","size":4096}'::jsonb
          where bucket_id = 'profile-media'
            and name = ${approvedProfileObjectPath}
          returning name
        `;
      return { replaced, visible };
    });

    expect(crossReadResult).toEqual({
      replaced: [],
      visible: [],
    });

    await expect(
      runWithFixture(async (transaction) => {
        await assumeStorageRole(
          transaction,
          "authenticated",
          onboardingCreator.authUserId,
        );
        await transaction`
          insert into storage.objects (
            bucket_id,
            name,
            owner,
            owner_id
          )
          values (
            'profile-media',
            ${`${approvedCreator.accountId}/avatar/cross-owner.webp`},
            ${onboardingCreator.authUserId},
            ${onboardingCreator.authUserId}
          )
        `;
      }),
    ).rejects.toMatchObject({
      code: "42501",
    });

    await expect(
      runWithFixture(async (transaction) => {
        await assumeStorageRole(
          transaction,
          "authenticated",
          onboardingCreator.authUserId,
        );
        await transaction`
          delete from storage.objects
          where bucket_id = 'profile-media'
            and name = ${approvedProfileObjectPath}
        `;
      }),
    ).rejects.toThrow();
  });

  it("allows an approved company to read an active approved creator asset", async () => {
    const objects = await runWithFixture(async (transaction) => {
      await assumeStorageRole(
        transaction,
        "authenticated",
        approvedCompany.authUserId,
      );

      return transaction<{ name: string }[]>`
        select name
        from storage.objects
        where bucket_id = 'profile-media'
          and name = ${approvedProfileObjectPath}
      `;
    });

    expect(objects).toEqual([{ name: approvedProfileObjectPath }]);
  });

  it("allows only an approved admin to upload sponsorship media", async () => {
    const sponsorshipObjectPath = `${admin.accountId}/banner/home.webp`;
    const objects = await runWithFixture(async (transaction) => {
      await assumeStorageRole(transaction, "authenticated", admin.authUserId);
      await transaction`
        insert into storage.objects (
          bucket_id,
          name,
          owner,
          owner_id,
          metadata
        )
        values (
          'sponsorship-media',
          ${sponsorshipObjectPath},
          ${admin.authUserId},
          ${admin.authUserId},
          '{"mimetype":"image/webp","size":4096}'::jsonb
        )
      `;

      return transaction<{ name: string }[]>`
        select name
        from storage.objects
        where bucket_id = 'sponsorship-media'
          and name = ${sponsorshipObjectPath}
      `;
    });

    expect(objects).toEqual([{ name: sponsorshipObjectPath }]);

    await expect(
      runWithFixture(async (transaction) => {
        await assumeStorageRole(
          transaction,
          "authenticated",
          approvedCompany.authUserId,
        );
        await transaction`
          insert into storage.objects (
            bucket_id,
            name,
            owner,
            owner_id
          )
          values (
            'sponsorship-media',
            ${`${approvedCompany.accountId}/banner/forbidden.webp`},
            ${approvedCompany.authUserId},
            ${approvedCompany.authUserId}
          )
        `;
      }),
    ).rejects.toMatchObject({
      code: "42501",
    });
  });

  it.each(restrictedAccounts)(
    "denies profile reads and uploads to a $status account",
    async (account) => {
      const visibleObjects = await runWithFixture(async (transaction) => {
        await assumeStorageRole(
          transaction,
          "authenticated",
          account.authUserId,
        );

        return transaction<{ name: string }[]>`
            select name
            from storage.objects
            where bucket_id = 'profile-media'
              and name = ${approvedProfileObjectPath}
          `;
      });

      expect(visibleObjects).toEqual([]);

      await expect(
        runWithFixture(async (transaction) => {
          await assumeStorageRole(
            transaction,
            "authenticated",
            account.authUserId,
          );
          await transaction`
            insert into storage.objects (
              bucket_id,
              name,
              owner,
              owner_id
            )
            values (
              'profile-media',
              ${`${account.accountId}/avatar/restricted.webp`},
              ${account.authUserId},
              ${account.authUserId}
            )
          `;
        }),
      ).rejects.toMatchObject({
        code: "42501",
      });
    },
  );
});
