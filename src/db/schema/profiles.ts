import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import {
  accountRoleEnum,
  creatorMetricSourceEnum,
  creatorTypeEnum,
  socialPlatformEnum,
} from "./enums";
import { mediaAssets } from "./media";

export const creatorProfiles = pgTable(
  "creator_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    legalName: varchar("legal_name", { length: 160 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    whatsappE164: varchar("whatsapp_e164", { length: 20 }),
    bio: varchar("bio", { length: 2000 }),
    creatorType: creatorTypeEnum("creator_type").notNull(),
    city: varchar("city", { length: 120 }),
    state: char("state", { length: 2 }),
    avatarAssetId: uuid("avatar_asset_id").references(() => mediaAssets.id, {
      onDelete: "restrict",
    }),
    coverAssetId: uuid("cover_asset_id").references(() => mediaAssets.id, {
      onDelete: "restrict",
    }),
    isFeatured: boolean("is_featured").notNull().default(false),
    featureOrder: integer("feature_order"),
    whatsappContactCount: integer("whatsapp_contact_count")
      .notNull()
      .default(0),
    searchDocument: text("search_document").generatedAlwaysAs(
      sql`public.normalize_search_text(
        coalesce("display_name", '') || ' ' ||
        coalesce("legal_name", '') || ' ' ||
        coalesce("city", '') || ' ' ||
        coalesce("state", '') || ' ' ||
        coalesce("bio", '')
      )`,
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
    uniqueIndex("creator_profiles_account_id_uidx").on(table.accountId),
    index("creator_profiles_catalog_idx")
      .on(table.creatorType, table.state, table.city, table.id)
      .where(sql`${table.archivedAt} is null`),
    index("creator_profiles_feature_idx")
      .on(table.featureOrder, table.id)
      .where(sql`${table.archivedAt} is null and ${table.isFeatured}`),
    index("creator_profiles_search_trgm_idx").using(
      "gin",
      table.searchDocument.op("gin_trgm_ops"),
    ),
    index("creator_profiles_search_active_trgm_idx")
      .using("gin", table.searchDocument.op("gin_trgm_ops"))
      .where(sql`${table.archivedAt} is null`),
    index("creator_profiles_display_name_active_idx")
      .on(table.displayName, table.id)
      .where(sql`${table.archivedAt} is null`),
    index("creator_profiles_location_active_idx")
      .on(table.state, table.city, table.displayName, table.id)
      .where(sql`${table.archivedAt} is null`),
    index("creator_profiles_created_at_active_idx")
      .on(table.createdAt, table.id)
      .where(sql`${table.archivedAt} is null`),
    check(
      "creator_profiles_state_check",
      sql`${table.state} is null or ${table.state} ~ '^[A-Z]{2}$'`,
    ),
    check(
      "creator_profiles_feature_check",
      sql`not ${table.isFeatured} or ${table.featureOrder} is not null`,
    ),
    check("creator_profiles_version_check", sql`${table.version} > 0`),
    check(
      "creator_profiles_whatsapp_contact_count_check",
      sql`${table.whatsappContactCount} >= 0`,
    ),
  ],
);

export const onboardingDrafts = pgTable(
  "onboarding_drafts",
  {
    accountId: uuid("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "restrict" }),
    role: accountRoleEnum("role").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("onboarding_drafts_updated_at_idx").on(
      table.updatedAt,
      table.accountId,
    ),
    check(
      "onboarding_drafts_role_check",
      sql`${table.role} in ('INFLUENCER', 'COMPANY')`,
    ),
    check(
      "onboarding_drafts_payload_check",
      sql`jsonb_typeof(${table.payload}) = 'object' and octet_length(${table.payload}::text) <= 50000`,
    ),
    check("onboarding_drafts_version_check", sql`${table.version} > 0`),
  ],
);

export type OnboardingDraft = typeof onboardingDrafts.$inferSelect;
export type NewOnboardingDraft = typeof onboardingDrafts.$inferInsert;

export const companyProfiles = pgTable(
  "company_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    legalName: varchar("legal_name", { length: 200 }).notNull(),
    tradeName: varchar("trade_name", { length: 160 }).notNull(),
    cnpj: char("cnpj", { length: 14 }).notNull(),
    employeeRange: varchar("employee_range", { length: 40 }),
    segment: varchar("segment", { length: 120 }),
    whatsappE164: varchar("whatsapp_e164", { length: 20 }),
    description: varchar("description", { length: 3000 }),
    websiteUrl: text("website_url"),
    logoAssetId: uuid("logo_asset_id").references(() => mediaAssets.id, {
      onDelete: "restrict",
    }),
    coverAssetId: uuid("cover_asset_id").references(() => mediaAssets.id, {
      onDelete: "restrict",
    }),
    isFeatured: boolean("is_featured").notNull().default(false),
    featureOrder: integer("feature_order"),
    searchDocument: text("search_document").generatedAlwaysAs(
      sql`public.normalize_search_text(
        coalesce("trade_name", '') || ' ' ||
        coalesce("legal_name", '') || ' ' ||
        coalesce("segment", '') || ' ' ||
        coalesce("description", '')
      )`,
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
    uniqueIndex("company_profiles_account_id_uidx").on(table.accountId),
    uniqueIndex("company_profiles_cnpj_uidx").on(table.cnpj),
    index("company_profiles_feature_idx")
      .on(table.featureOrder, table.id)
      .where(sql`${table.archivedAt} is null and ${table.isFeatured}`),
    index("company_profiles_search_trgm_idx").using(
      "gin",
      table.searchDocument.op("gin_trgm_ops"),
    ),
    index("company_profiles_created_at_active_idx")
      .on(table.createdAt, table.id)
      .where(sql`${table.archivedAt} is null`),
    check("company_profiles_cnpj_check", sql`${table.cnpj} ~ '^[0-9]{14}$'`),
    check(
      "company_profiles_website_url_check",
      sql`${table.websiteUrl} is null or ${table.websiteUrl} ~* '^https?://'`,
    ),
    check(
      "company_profiles_feature_check",
      sql`not ${table.isFeatured} or ${table.featureOrder} is not null`,
    ),
    check("company_profiles_version_check", sql`${table.version} > 0`),
  ],
);

export const companyLocations = pgTable(
  "company_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    companyProfileId: uuid("company_profile_id")
      .notNull()
      .references(() => companyProfiles.id, { onDelete: "restrict" }),
    label: varchar("label", { length: 80 }).notNull(),
    postalCode: char("postal_code", { length: 8 }),
    street: varchar("street", { length: 180 }).notNull(),
    number: varchar("number", { length: 30 }).notNull(),
    complement: varchar("complement", { length: 120 }),
    neighborhood: varchar("neighborhood", { length: 120 }),
    city: varchar("city", { length: 120 }).notNull(),
    state: char("state", { length: 2 }).notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
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
    uniqueIndex("company_locations_one_primary_uidx")
      .on(table.companyProfileId)
      .where(sql`${table.isPrimary} and ${table.archivedAt} is null`),
    index("company_locations_company_idx")
      .on(table.companyProfileId, table.isPrimary, table.id)
      .where(sql`${table.archivedAt} is null`),
    index("company_locations_catalog_idx")
      .on(table.state, table.city, table.companyProfileId)
      .where(sql`${table.archivedAt} is null`),
    check("company_locations_state_check", sql`${table.state} ~ '^[A-Z]{2}$'`),
    check("company_locations_version_check", sql`${table.version} > 0`),
  ],
);

export const niches = pgTable(
  "niches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("niches_slug_uidx").on(table.slug),
    index("niches_active_order_idx")
      .on(table.sortOrder, table.name, table.id)
      .where(sql`${table.isActive}`),
    check(
      "niches_slug_check",
      sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
  ],
);

export const creatorNiches = pgTable(
  "creator_niches",
  {
    creatorProfileId: uuid("creator_profile_id")
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: "restrict" }),
    nicheId: uuid("niche_id")
      .notNull()
      .references(() => niches.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.creatorProfileId, table.nicheId] }),
    index("creator_niches_niche_creator_idx").on(
      table.nicheId,
      table.creatorProfileId,
    ),
  ],
);

export const socialProfiles = pgTable(
  "social_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerAccountId: uuid("owner_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    platform: socialPlatformEnum("platform").notNull(),
    handle: varchar("handle", { length: 160 }),
    normalizedUrl: text("normalized_url").notNull(),
    isVisibleInCatalog: boolean("is_visible_in_catalog")
      .notNull()
      .default(true),
    isPrimary: boolean("is_primary").notNull().default(false),
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
    uniqueIndex("social_profiles_owner_platform_url_uidx")
      .on(table.ownerAccountId, table.platform, table.normalizedUrl)
      .where(sql`${table.archivedAt} is null`),
    uniqueIndex("social_profiles_owner_primary_uidx")
      .on(table.ownerAccountId)
      .where(sql`${table.archivedAt} is null and ${table.isPrimary}`),
    index("social_profiles_owner_order_idx")
      .on(table.ownerAccountId, table.sortOrder, table.id)
      .where(sql`${table.archivedAt} is null`),
    index("social_profiles_platform_idx")
      .on(table.platform, table.ownerAccountId)
      .where(sql`${table.archivedAt} is null and ${table.isVisibleInCatalog}`),
    check(
      "social_profiles_url_check",
      sql`${table.normalizedUrl} ~* '^https?://'`,
    ),
    check("social_profiles_version_check", sql`${table.version} > 0`),
  ],
);

export const creatorMetricSnapshots = pgTable(
  "creator_metric_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorProfileId: uuid("creator_profile_id")
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: "restrict" }),
    socialProfileId: uuid("social_profile_id").references(
      () => socialProfiles.id,
      { onDelete: "restrict" },
    ),
    platform: socialPlatformEnum("platform").notNull(),
    followerCount: bigint("follower_count", { mode: "number" }),
    engagementRate: numeric("engagement_rate", {
      precision: 7,
      scale: 4,
    }),
    viewCount: bigint("view_count", { mode: "number" }),
    interactionCount: bigint("interaction_count", { mode: "number" }),
    newFollowerCount: bigint("new_follower_count", { mode: "number" }),
    sharedContentDescription: text("shared_content_description"),
    observedOn: date("observed_on", { mode: "date" }).notNull(),
    source: creatorMetricSourceEnum("source")
      .notNull()
      .default("SELF_REPORTED"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("creator_metric_snapshots_identity_uidx").on(
      table.creatorProfileId,
      table.platform,
      table.observedOn,
      sql`coalesce(${table.socialProfileId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
    ),
    index("creator_metric_snapshots_latest_idx").on(
      table.creatorProfileId,
      table.platform,
      table.observedOn.desc(),
      table.createdAt.desc(),
    ),
    check(
      "creator_metric_snapshots_follower_count_check",
      sql`${table.followerCount} is null or ${table.followerCount} >= 0`,
    ),
    check(
      "creator_metric_snapshots_engagement_rate_check",
      sql`${table.engagementRate} is null or ${table.engagementRate} between 0 and 100`,
    ),
    check(
      "creator_metric_snapshots_view_count_check",
      sql`${table.viewCount} is null or ${table.viewCount} >= 0`,
    ),
    check(
      "creator_metric_snapshots_interaction_count_check",
      sql`${table.interactionCount} is null or ${table.interactionCount} >= 0`,
    ),
    check(
      "creator_metric_snapshots_new_follower_count_check",
      sql`${table.newFollowerCount} is null or ${table.newFollowerCount} >= 0`,
    ),
  ],
);

export type CreatorProfile = typeof creatorProfiles.$inferSelect;
export type NewCreatorProfile = typeof creatorProfiles.$inferInsert;
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type NewCompanyProfile = typeof companyProfiles.$inferInsert;
