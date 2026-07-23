import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { mediaKindEnum, mediaStatusEnum } from "./enums";

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerAccountId: uuid("owner_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    bucketName: text("bucket_name").notNull(),
    objectPath: text("object_path").notNull(),
    kind: mediaKindEnum("kind").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    width: integer("width"),
    height: integer("height"),
    status: mediaStatusEnum("status").notNull().default("PENDING"),
    replacedByAssetId: uuid("replaced_by_asset_id").references(
      (): AnyPgColumn => mediaAssets.id,
      { onDelete: "restrict" },
    ),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("media_assets_bucket_path_uidx").on(
      table.bucketName,
      table.objectPath,
    ),
    index("media_assets_owner_status_idx")
      .on(table.ownerAccountId, table.status, table.kind)
      .where(sql`${table.archivedAt} is null`),
    check(
      "media_assets_bucket_check",
      sql`${table.bucketName} in ('profile-media', 'sponsorship-media')`,
    ),
    check(
      "media_assets_mime_type_check",
      sql`${table.mimeType} in ('image/jpeg', 'image/png', 'image/webp')`,
    ),
    check(
      "media_assets_size_bytes_check",
      sql`${table.sizeBytes} > 0 and ${table.sizeBytes} <= 8388608`,
    ),
    check(
      "media_assets_replacement_check",
      sql`${table.replacedByAssetId} is distinct from ${table.id}`,
    ),
    check(
      "media_assets_kind_bucket_check",
      sql`(${table.kind} = 'SPONSORSHIP_CREATIVE' and ${table.bucketName} = 'sponsorship-media')
          or (${table.kind} <> 'SPONSORSHIP_CREATIVE' and ${table.bucketName} = 'profile-media')`,
    ),
    check("media_assets_version_check", sql`${table.version} > 0`),
  ],
);

export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;
