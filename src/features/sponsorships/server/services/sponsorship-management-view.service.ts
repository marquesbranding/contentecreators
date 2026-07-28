import "server-only";

import type {
  SponsorshipAdminPlacementDto,
  SponsorshipManagementFilters,
  SponsorshipManagementResponseDto,
  SponsorshipPlacementCommand,
  SponsorshipPlacementWriteInput,
} from "../../api/sponsorship-management.contract";
import type {
  SponsorshipPlacementCreateData,
  SponsorshipPlacementListFilters,
  SponsorshipPlacementListResult,
  SponsorshipPlacementRecord,
  SponsorshipPlacementUpdateData,
} from "../repositories/sponsorship-placement.repository";

interface SignedAdminMedia {
  height: number | null;
  url: string;
  width: number | null;
}

interface AdminService {
  activate(command: MutationCommand): Promise<SponsorshipPlacementRecord>;
  archive(command: MutationCommand): Promise<SponsorshipPlacementRecord>;
  create(command: {
    placement: Omit<SponsorshipPlacementCreateData, "isActive">;
    reason: string;
    requestId: string;
  }): Promise<SponsorshipPlacementRecord>;
  deactivate(command: MutationCommand): Promise<SponsorshipPlacementRecord>;
  list(
    query: SponsorshipPlacementListFilters & { requestId: string },
  ): Promise<SponsorshipPlacementListResult>;
  reorder(command: {
    items: Array<{
      expectedVersion: number;
      placementId: string;
      sortOrder: number;
    }>;
    reason: string;
    requestId: string;
  }): Promise<SponsorshipPlacementRecord[]>;
  update(command: {
    expectedVersion: number;
    patch: SponsorshipPlacementUpdateData;
    placementId: string;
    reason: string;
    requestId: string;
  }): Promise<SponsorshipPlacementRecord>;
}

interface MutationCommand {
  expectedVersion: number;
  placementId: string;
  reason: string;
  requestId: string;
}

interface SponsorshipManagementViewDependencies {
  adminService: AdminService;
  getSignedMedia(assetId: string): Promise<SignedAdminMedia | null>;
  now(): Date;
}

function stateOf(
  placement: SponsorshipPlacementRecord,
  now: Date,
): SponsorshipAdminPlacementDto["state"] {
  if (placement.archivedAt) return "ARCHIVED";
  if (!placement.isActive) return "DRAFT";
  if (placement.startsAt && placement.startsAt > now) return "SCHEDULED";
  if (placement.endsAt && placement.endsAt < now) return "EXPIRED";
  return "ACTIVE";
}

function creativeAlt(placement: SponsorshipPlacementRecord) {
  return placement.advertiserLabel
    ? `${placement.title ?? "Criativo patrocinado"} — ${placement.advertiserLabel}`
    : (placement.title ?? "Criativo patrocinado");
}

async function toDto(
  placement: SponsorshipPlacementRecord,
  getSignedMedia: SponsorshipManagementViewDependencies["getSignedMedia"],
  now: Date,
): Promise<SponsorshipAdminPlacementDto> {
  const media = placement.creativeAssetId
    ? await getSignedMedia(placement.creativeAssetId)
    : null;

  return {
    activationIssues: [],
    advertiserLabel: placement.advertiserLabel,
    archivedAt: placement.archivedAt?.toISOString() ?? null,
    audience: placement.audience,
    body: placement.body,
    creative: media
      ? {
          alt: creativeAlt(placement),
          height: media.height,
          url: media.url,
          width: media.width,
        }
      : null,
    creativeAssetId: placement.creativeAssetId,
    endsAt: placement.endsAt?.toISOString() ?? null,
    featuredCreatorName: null,
    featuredCreatorProfileId: placement.featuredCreatorProfileId,
    id: placement.id,
    isActive: placement.isActive,
    linkLabel: placement.linkLabel,
    linkUrl: placement.linkUrl,
    placementType: placement.placementType,
    slotKey: placement.slotKey,
    sortOrder: placement.sortOrder,
    startsAt: placement.startsAt?.toISOString() ?? null,
    state: stateOf(placement, now),
    title: placement.title,
    updatedAt: placement.updatedAt.toISOString(),
    version: placement.version,
  };
}

function toPersistenceWrite(input: SponsorshipPlacementWriteInput) {
  return {
    advertiserAccountId: null,
    advertiserLabel: input.advertiserLabel,
    audience: input.audience,
    body: input.body,
    creativeAssetId: input.creativeAssetId,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    featuredCreatorProfileId: input.featuredCreatorProfileId,
    linkLabel: input.linkLabel,
    linkUrl: input.linkUrl,
    placementType: input.placementType,
    slotKey: input.slotKey,
    sortOrder: input.sortOrder,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    title: input.title,
  };
}

export function createSponsorshipManagementViewService({
  adminService,
  getSignedMedia,
  now,
}: SponsorshipManagementViewDependencies) {
  async function mapPlacement(placement: SponsorshipPlacementRecord) {
    return toDto(placement, getSignedMedia, now());
  }

  return {
    async command(
      placementId: string,
      input: SponsorshipPlacementCommand,
      requestId: string,
    ) {
      const base = {
        expectedVersion: input.expectedVersion,
        placementId,
        reason: input.reason,
        requestId,
      };
      let placement: SponsorshipPlacementRecord;

      if (input.action === "ACTIVATE") {
        placement = await adminService.activate(base);
      } else if (input.action === "DEACTIVATE") {
        placement = await adminService.deactivate(base);
      } else if (input.action === "ARCHIVE") {
        placement = await adminService.archive(base);
      } else {
        const [reordered] = await adminService.reorder({
          items: [
            {
              expectedVersion: input.expectedVersion,
              placementId,
              sortOrder: input.sortOrder ?? 0,
            },
          ],
          reason: input.reason,
          requestId,
        });

        if (!reordered) {
          throw new Error("Sponsorship reorder returned no placement.");
        }
        placement = reordered;
      }

      return { placement: await mapPlacement(placement) };
    },

    async create(input: SponsorshipPlacementWriteInput, requestId: string) {
      const placement = await adminService.create({
        placement: toPersistenceWrite(input),
        reason: input.reason,
        requestId,
      });

      return { placement: await mapPlacement(placement) };
    },

    async list(
      filters: SponsorshipManagementFilters,
      requestId: string,
    ): Promise<SponsorshipManagementResponseDto> {
      const result = await adminService.list({
        audience: filters.audience,
        page: filters.page,
        pageSize: filters.pageSize,
        placementType: filters.type,
        requestId,
        search: filters.search,
        state: filters.state,
      });
      const items = await Promise.all(result.items.map(mapPlacement));

      return {
        items,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          totalItems: result.totalItems,
          totalPages: Math.ceil(result.totalItems / result.pageSize),
        },
      };
    },

    async update(
      placementId: string,
      input: SponsorshipPlacementWriteInput,
      requestId: string,
    ) {
      if (!input.expectedVersion) {
        throw new Error("Expected sponsorship version is required.");
      }

      const placement = await adminService.update({
        expectedVersion: input.expectedVersion,
        patch: toPersistenceWrite(input),
        placementId,
        reason: input.reason,
        requestId,
      });

      return { placement: await mapPlacement(placement) };
    },
  };
}
