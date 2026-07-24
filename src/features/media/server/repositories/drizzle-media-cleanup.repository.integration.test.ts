import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";

import { createDrizzleMediaCleanupRepository } from "./drizzle-media-cleanup.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const drizzleClient = createDatabaseClient(databaseUrl);
const ownerAccountId = "b0000000-0000-4000-8000-000000000004";
const ownerAuthUserId = "20000000-0000-4000-8000-000000000004";
const rollback = new Error("rollback media cleanup repository");

describeLocalStack("Drizzle media cleanup repository", () => {
  afterAll(async () => {
    await drizzleClient.client.end({ timeout: 2 });
  });

  it("reports only old orphan and unreferenced archived Storage objects", async () => {
    let candidates:
      | Awaited<
          ReturnType<
            ReturnType<
              typeof createDrizzleMediaCleanupRepository
            >["findCandidates"]
          >
        >
      | undefined;

    try {
      await drizzleClient.database.transaction(async (transaction) => {
        await transaction.execute(sql`
          select
            set_config('app.audit.actor_account_id', '', true),
            set_config('app.audit.actor_type', 'SYSTEM', true),
            set_config('app.audit.actor_role', '', true),
            set_config('app.audit.source', 'SCRIPT', true),
            set_config('app.audit.request_id', 'media-cleanup-repository-test', true),
            set_config('app.audit.reason', 'Synthetic rollback-only cleanup fixture', true)
        `);
        await transaction.execute(sql`
          insert into storage.objects (
            id,
            bucket_id,
            name,
            owner,
            owner_id,
            metadata,
            created_at,
            updated_at
          )
          values
            (
              '78000000-0000-4000-8000-000000000001',
              'profile-media',
              ${`${ownerAccountId}/avatar/orphan-old.png`},
              ${ownerAuthUserId},
              ${ownerAuthUserId},
              '{"mimetype":"image/png","size":1024}'::jsonb,
              '2026-01-01T00:00:00.000Z',
              '2026-01-01T00:00:00.000Z'
            ),
            (
              '78000000-0000-4000-8000-000000000002',
              'profile-media',
              ${`${ownerAccountId}/avatar/orphan-recent.png`},
              ${ownerAuthUserId},
              ${ownerAuthUserId},
              '{"mimetype":"image/png","size":1024}'::jsonb,
              '2026-07-20T00:00:00.000Z',
              '2026-07-20T00:00:00.000Z'
            ),
            (
              '78000000-0000-4000-8000-000000000003',
              'profile-media',
              ${`${ownerAccountId}/avatar/archived-old.png`},
              ${ownerAuthUserId},
              ${ownerAuthUserId},
              '{"mimetype":"image/png","size":1024}'::jsonb,
              '2025-01-01T00:00:00.000Z',
              '2025-01-01T00:00:00.000Z'
            ),
            (
              '78000000-0000-4000-8000-000000000004',
              'profile-media',
              ${`${ownerAccountId}/avatar/archived-referenced.png`},
              ${ownerAuthUserId},
              ${ownerAuthUserId},
              '{"mimetype":"image/png","size":1024}'::jsonb,
              '2025-01-01T00:00:00.000Z',
              '2025-01-01T00:00:00.000Z'
            ),
            (
              '78000000-0000-4000-8000-000000000005',
              'profile-media',
              ${`${ownerAccountId}/avatar/active.png`},
              ${ownerAuthUserId},
              ${ownerAuthUserId},
              '{"mimetype":"image/png","size":1024}'::jsonb,
              '2025-01-01T00:00:00.000Z',
              '2025-01-01T00:00:00.000Z'
            ),
            (
              '78000000-0000-4000-8000-000000000006',
              'profile-media',
              ${`${ownerAccountId}/avatar/archived-recent.png`},
              ${ownerAuthUserId},
              ${ownerAuthUserId},
              '{"mimetype":"image/png","size":1024}'::jsonb,
              '2026-07-20T00:00:00.000Z',
              '2026-07-20T00:00:00.000Z'
            )
        `);
        await transaction.execute(sql`
          insert into public.media_assets (
            id,
            owner_account_id,
            bucket_name,
            object_path,
            kind,
            mime_type,
            size_bytes,
            status,
            archived_at
          )
          values
            (
              '79000000-0000-4000-8000-000000000003',
              ${ownerAccountId},
              'profile-media',
              ${`${ownerAccountId}/avatar/archived-old.png`},
              'AVATAR',
              'image/png',
              1024,
              'ARCHIVED',
              '2026-01-01T00:00:00.000Z'
            ),
            (
              '79000000-0000-4000-8000-000000000004',
              ${ownerAccountId},
              'profile-media',
              ${`${ownerAccountId}/avatar/archived-referenced.png`},
              'AVATAR',
              'image/png',
              1024,
              'ARCHIVED',
              '2026-01-01T00:00:00.000Z'
            ),
            (
              '79000000-0000-4000-8000-000000000005',
              ${ownerAccountId},
              'profile-media',
              ${`${ownerAccountId}/avatar/active.png`},
              'AVATAR',
              'image/png',
              1024,
              'ACTIVE',
              null
            ),
            (
              '79000000-0000-4000-8000-000000000006',
              ${ownerAccountId},
              'profile-media',
              ${`${ownerAccountId}/avatar/archived-recent.png`},
              'AVATAR',
              'image/png',
              1024,
              'ARCHIVED',
              '2026-07-20T00:00:00.000Z'
            )
        `);
        await transaction.execute(sql`
          update public.creator_profiles
          set avatar_asset_id = '79000000-0000-4000-8000-000000000004'
          where account_id = ${ownerAccountId}
        `);

        const repository = createDrizzleMediaCleanupRepository({
          database: transaction,
        });
        candidates = await repository.findCandidates({
          archivedBefore: new Date("2026-04-25T00:00:00.000Z"),
          limit: 100,
          orphanBefore: new Date("2026-07-10T00:00:00.000Z"),
        });

        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(candidates).toEqual([
      {
        assetId: "79000000-0000-4000-8000-000000000003",
        bucketName: "profile-media",
        category: "ARCHIVED",
        objectPath: `${ownerAccountId}/avatar/archived-old.png`,
        observedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        bucketName: "profile-media",
        category: "ORPHAN",
        objectPath: `${ownerAccountId}/avatar/orphan-old.png`,
        observedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
  });
});
