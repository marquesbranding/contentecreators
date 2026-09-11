import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import type { ApplicationTransaction } from "@/db/client";
import {
  accounts,
  companyLocations,
  companyProfiles,
  creatorProfiles,
} from "@/db/schema";

import type {
  LandingShowcaseCandidateDto,
  LandingShowcaseCommand,
  LandingShowcaseKind,
  LandingShowcaseManagementResponseDto,
} from "../../api/landing-showcase-management.contract";
import {
  LandingShowcaseRepositoryError,
  type LandingShowcaseRepository,
} from "./landing-showcase.repository";

/*
 * "Shown on the landing" reuses `is_featured` / `feature_order`, which both
 * profile tables already carry (with a feature index, audit trigger and admin
 * RLS) and nothing else in the product reads. `feature_order` is the carousel
 * position among enabled profiles of the same kind, kept dense from 0.
 */

type TargetRow = {
  feature_order: number | null;
  id: string;
  is_featured: boolean;
  version: number;
};

type NeighborRow = {
  feature_order: number;
  id: string;
};

type NextPositionRow = {
  next_position: number;
};

function profileTable(kind: LandingShowcaseKind) {
  return kind === "COMPANY" ? companyProfiles : creatorProfiles;
}

/**
 * Same bar the catalog applies: approved, not archived, and — for companies —
 * a complete profile. A profile that stops meeting it can no longer be managed
 * here and drops out of the public carousel on its own.
 */
function accountEligibility(kind: LandingShowcaseKind) {
  return kind === "COMPANY"
    ? sql`account.role = 'COMPANY'
        and account.status = 'APPROVED'
        and account.archived_at is null
        and account.completion_percentage = 100`
    : sql`account.role = 'INFLUENCER'
        and account.status = 'APPROVED'
        and account.archived_at is null`;
}

async function listCreators(
  transaction: ApplicationTransaction,
): Promise<LandingShowcaseCandidateDto[]> {
  const rows = await transaction
    .select({
      city: creatorProfiles.city,
      creatorType: creatorProfiles.creatorType,
      displayName: creatorProfiles.displayName,
      enabled: creatorProfiles.isFeatured,
      position: creatorProfiles.featureOrder,
      profileId: creatorProfiles.id,
      state: creatorProfiles.state,
      version: creatorProfiles.version,
    })
    .from(creatorProfiles)
    .innerJoin(accounts, eq(accounts.id, creatorProfiles.accountId))
    .where(
      and(
        eq(accounts.role, "INFLUENCER"),
        eq(accounts.status, "APPROVED"),
        isNull(accounts.archivedAt),
        isNull(creatorProfiles.archivedAt),
      ),
    )
    .orderBy(
      desc(creatorProfiles.isFeatured),
      asc(creatorProfiles.featureOrder),
      asc(creatorProfiles.displayName),
      asc(creatorProfiles.id),
    );

  return rows.map((row) => ({
    ...row,
    kind: "CREATOR" as const,
    segment: null,
  }));
}

async function listCompanies(
  transaction: ApplicationTransaction,
): Promise<LandingShowcaseCandidateDto[]> {
  const primaryLocation = (column: "city" | "state") => sql<string | null>`
    (
      select ${column === "city" ? companyLocations.city : companyLocations.state}
      from ${companyLocations}
      where ${companyLocations.companyProfileId} = ${companyProfiles.id}
        and ${companyLocations.archivedAt} is null
      order by ${companyLocations.isPrimary} desc, ${companyLocations.id}
      limit 1
    )
  `;
  const rows = await transaction
    .select({
      city: primaryLocation("city"),
      displayName: companyProfiles.tradeName,
      enabled: companyProfiles.isFeatured,
      position: companyProfiles.featureOrder,
      profileId: companyProfiles.id,
      segment: companyProfiles.segment,
      state: primaryLocation("state"),
      version: companyProfiles.version,
    })
    .from(companyProfiles)
    .innerJoin(accounts, eq(accounts.id, companyProfiles.accountId))
    .where(
      and(
        eq(accounts.role, "COMPANY"),
        eq(accounts.status, "APPROVED"),
        eq(accounts.completionPercentage, 100),
        isNull(accounts.archivedAt),
        isNull(companyProfiles.archivedAt),
      ),
    )
    .orderBy(
      desc(companyProfiles.isFeatured),
      asc(companyProfiles.featureOrder),
      asc(companyProfiles.tradeName),
      asc(companyProfiles.id),
    );

  return rows.map((row) => ({
    ...row,
    creatorType: null,
    kind: "COMPANY" as const,
  }));
}

async function lockTarget(
  transaction: ApplicationTransaction,
  command: LandingShowcaseCommand,
) {
  const [target] = await transaction.execute<TargetRow>(sql`
    select profile.id, profile.is_featured, profile.feature_order, profile.version
    from ${profileTable(command.kind)} profile
    inner join public.accounts account on account.id = profile.account_id
    where profile.id = ${command.profileId}::uuid
      and profile.archived_at is null
      and ${accountEligibility(command.kind)}
    for update of profile
  `);

  if (!target) {
    throw new LandingShowcaseRepositoryError("NOT_FOUND");
  }

  if (target.version !== command.expectedVersion) {
    throw new LandingShowcaseRepositoryError("VERSION_CONFLICT");
  }

  return target;
}

async function enable(
  transaction: ApplicationTransaction,
  command: LandingShowcaseCommand,
  target: TargetRow,
) {
  if (target.is_featured) {
    return;
  }

  const table = profileTable(command.kind);
  const [{ next_position: nextPosition }] =
    await transaction.execute<NextPositionRow>(sql`
      select coalesce(max(feature_order), -1) + 1 as next_position
      from ${table}
      where is_featured and archived_at is null
    `);

  await transaction.execute(sql`
    update ${table}
    set is_featured = true, feature_order = ${nextPosition}
    where id = ${target.id}::uuid
  `);
}

async function disable(
  transaction: ApplicationTransaction,
  command: LandingShowcaseCommand,
  target: TargetRow,
) {
  if (!target.is_featured) {
    return;
  }

  const table = profileTable(command.kind);

  await transaction.execute(sql`
    update ${table}
    set is_featured = false, feature_order = null
    where id = ${target.id}::uuid
  `);
  // Close the gap so positions stay dense and "move" always has a neighbor.
  await transaction.execute(sql`
    with ranked as (
      select id, row_number() over (order by feature_order, id) - 1 as position
      from ${table}
      where is_featured and archived_at is null
    )
    update ${table} profile
    set feature_order = ranked.position
    from ranked
    where profile.id = ranked.id
      and profile.feature_order is distinct from ranked.position
  `);
}

async function move(
  transaction: ApplicationTransaction,
  command: LandingShowcaseCommand,
  target: TargetRow,
) {
  if (!target.is_featured || target.feature_order === null) {
    throw new LandingShowcaseRepositoryError("NOT_ENABLED");
  }

  const table = profileTable(command.kind);
  const earlier = command.action === "MOVE_UP";
  const [neighbor] = await transaction.execute<NeighborRow>(sql`
    select profile.id, profile.feature_order
    from ${table} profile
    inner join public.accounts account on account.id = profile.account_id
    where profile.is_featured
      and profile.archived_at is null
      and ${accountEligibility(command.kind)}
      and ${
        earlier
          ? sql`(profile.feature_order, profile.id) < (${target.feature_order}, ${target.id}::uuid)`
          : sql`(profile.feature_order, profile.id) > (${target.feature_order}, ${target.id}::uuid)`
      }
    order by ${
      earlier
        ? sql`profile.feature_order desc, profile.id desc`
        : sql`profile.feature_order asc, profile.id asc`
    }
    limit 1
    for update of profile
  `);

  // Already first (or last): nothing to swap with.
  if (!neighbor) {
    return;
  }

  await transaction.execute(sql`
    update ${table}
    set feature_order = ${neighbor.feature_order}
    where id = ${target.id}::uuid
  `);
  await transaction.execute(sql`
    update ${table}
    set feature_order = ${target.feature_order}
    where id = ${neighbor.id}::uuid
  `);
}

export const drizzleLandingShowcaseRepository: LandingShowcaseRepository = {
  async applyCommand(transaction, command) {
    const target = await lockTarget(transaction, command);

    switch (command.action) {
      case "ENABLE":
        return enable(transaction, command, target);
      case "DISABLE":
        return disable(transaction, command, target);
      case "MOVE_UP":
      case "MOVE_DOWN":
        return move(transaction, command, target);
    }
  },

  async listCandidates(
    transaction,
  ): Promise<LandingShowcaseManagementResponseDto> {
    // Sequential on purpose: both reads share the transaction's connection.
    const creators = await listCreators(transaction);
    const companies = await listCompanies(transaction);

    return { companies, creators };
  },
};
