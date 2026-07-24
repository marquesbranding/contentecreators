import "server-only";

import { sql } from "drizzle-orm";

import { getDatabaseClient, type ApplicationDatabase } from "@/db/client";

import type {
  MediaCleanupCandidate,
  MediaCleanupCategory,
} from "../services/media-cleanup.service";

interface MediaCleanupQueryExecutor {
  execute: ApplicationDatabase["execute"];
}

interface DrizzleMediaCleanupRepositoryDependencies {
  database: MediaCleanupQueryExecutor;
}

interface MediaCleanupCandidateRow {
  [key: string]: unknown;
  asset_id: string | null;
  bucket_name: "profile-media" | "sponsorship-media";
  category: MediaCleanupCategory;
  object_path: string;
  observed_at: Date | string;
}

export function createDrizzleMediaCleanupRepository({
  database,
}: DrizzleMediaCleanupRepositoryDependencies) {
  return {
    async findCandidates(input: {
      archivedBefore: Date;
      limit: number;
      orphanBefore: Date;
    }): Promise<MediaCleanupCandidate[]> {
      const rows = await database.execute<MediaCleanupCandidateRow>(sql`
        with cleanup_candidates as (
          select
            null::uuid as asset_id,
            storage_object.bucket_id::text as bucket_name,
            'ORPHAN'::text as category,
            storage_object.name as object_path,
            storage_object.created_at as observed_at
          from storage.objects storage_object
          left join public.media_assets media
            on media.bucket_name = storage_object.bucket_id
            and media.object_path = storage_object.name
          where storage_object.bucket_id in (
            'profile-media',
            'sponsorship-media'
          )
            and media.id is null
            and storage_object.created_at <= ${input.orphanBefore.toISOString()}::timestamptz
            and storage_object.name not like '%.emptyFolderPlaceholder'

          union all

          select
            media.id as asset_id,
            media.bucket_name,
            'ARCHIVED'::text as category,
            media.object_path,
            media.archived_at as observed_at
          from public.media_assets media
          inner join storage.objects storage_object
            on storage_object.bucket_id = media.bucket_name
            and storage_object.name = media.object_path
          where media.status = 'ARCHIVED'
            and media.archived_at is not null
            and media.archived_at <= ${input.archivedBefore.toISOString()}::timestamptz
            and not exists (
              select 1
              from public.creator_profiles creator
              where creator.avatar_asset_id = media.id
                or creator.cover_asset_id = media.id
            )
            and not exists (
              select 1
              from public.company_profiles company
              where company.logo_asset_id = media.id
                or company.cover_asset_id = media.id
            )
            and not exists (
              select 1
              from public.sponsorship_placements placement
              where placement.creative_asset_id = media.id
            )
        )
        select
          asset_id,
          bucket_name,
          category,
          object_path,
          observed_at
        from cleanup_candidates
        order by category, bucket_name, object_path
        limit ${input.limit}
      `);

      return rows.map((row) => ({
        ...(row.asset_id ? { assetId: row.asset_id } : {}),
        bucketName: row.bucket_name,
        category: row.category,
        objectPath: row.object_path,
        observedAt:
          row.observed_at instanceof Date
            ? row.observed_at
            : new Date(row.observed_at),
      }));
    },
  };
}

export function createServerMediaCleanupRepository() {
  return createDrizzleMediaCleanupRepository({
    database: getDatabaseClient().database,
  });
}
