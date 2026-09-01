import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { placementAudienceEnum, placementTypeEnum } from "./enums";
import { mediaAssets } from "./media";
import { creatorProfiles } from "./profiles";

export const sponsorshipPlacements = pgTable(
  "sponsorship_placements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placementType: placementTypeEnum("placement_type").notNull(),
    audience: placementAudienceEnum("audience").notNull().default("ALL"),
    slotKey: varchar("slot_key", { length: 100 }).notNull(),
    advertiserAccountId: uuid("advertiser_account_id").references(
      () => accounts.id,
      { onDelete: "restrict" },
    ),
    advertiserLabel: varchar("advertiser_label", { length: 160 }),
    featuredCreatorProfileId: uuid("featured_creator_profile_id").references(
      () => creatorProfiles.id,
      { onDelete: "restrict" },
    ),
    creativeAssetId: uuid("creative_asset_id").references(
      () => mediaAssets.id,
      { onDelete: "restrict" },
    ),
    creativeAssetTabletId: uuid("creative_asset_tablet_id").references(
      () => mediaAssets.id,
      { onDelete: "restrict" },
    ),
    creativeAssetMobileId: uuid("creative_asset_mobile_id").references(
      () => mediaAssets.id,
      { onDelete: "restrict" },
    ),
    title: varchar("title", { length: 160 }),
    body: varchar("body", { length: 500 }),
    linkUrl: text("link_url"),
    linkLabel: varchar("link_label", { length: 80 }),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
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
    index("sponsorship_placements_schedule_idx")
      .on(
        table.audience,
        table.slotKey,
        table.startsAt,
        table.endsAt,
        table.sortOrder,
        table.id,
      )
      .where(sql`${table.isActive} and ${table.archivedAt} is null`),
    index("sponsorship_placements_advertiser_idx")
      .on(table.advertiserAccountId, table.id)
      .where(sql`${table.archivedAt} is null`),
    index("sponsorship_placements_delivery_idx")
      .on(
        table.slotKey,
        table.audience,
        table.sortOrder,
        table.id,
        table.startsAt,
        table.endsAt,
      )
      .where(sql`${table.isActive} and ${table.archivedAt} is null`),
    check(
      "sponsorship_placements_slot_key_check",
      sql`${table.slotKey} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check(
      "sponsorship_placements_link_url_check",
      sql`${table.linkUrl} is null or ${table.linkUrl} ~* '^https?://'`,
    ),
    check(
      "sponsorship_placements_schedule_check",
      sql`${table.startsAt} is null or ${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
    check(
      "sponsorship_placements_featured_creator_check",
      sql`${table.placementType} <> 'FEATURED_CREATOR' or ${table.featuredCreatorProfileId} is not null`,
    ),
    check("sponsorship_placements_version_check", sql`${table.version} > 0`),
  ],
);

export type SponsorshipPlacement = typeof sponsorshipPlacements.$inferSelect;
export type NewSponsorshipPlacement = typeof sponsorshipPlacements.$inferInsert;
