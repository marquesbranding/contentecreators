import "server-only";

import type { ApplicationTransaction } from "@/db/client";
import { applyVerifiedAuditContext } from "@/features/audit/server";
import {
  requireAdmin,
  type VerifiedAccountContext,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import { validatePlacementForActivation } from "../../domain/sponsorship-placement-policy";
import { sponsorshipPlacementDraftSchema } from "../../schemas/sponsorship-placement.schema";
import type { SponsorshipPlacementCandidate } from "../../types/sponsorship-placement.types";
import type {
  AdminSponsorshipPlacementRepository,
  SponsorshipActivationEvidence,
  SponsorshipActivationMediaEvidence,
  SponsorshipPlacementCreateData,
  SponsorshipPlacementListFilters,
  SponsorshipPlacementReorderItem,
  SponsorshipPlacementUpdateData,
} from "../repositories/sponsorship-placement.repository";
import { SponsorshipPlacementRepositoryError } from "../repositories/sponsorship-placement.repository";

export type SponsorshipPlacementServiceErrorCode =
  | "INVALID_ACTIVATION"
  | "INVALID_INPUT"
  | "INVALID_REASON"
  | "NOT_FOUND"
  | "VERSION_CONFLICT";

export class SponsorshipPlacementServiceError extends Error {
  constructor(readonly code: SponsorshipPlacementServiceErrorCode) {
    super(code);
    this.name = "SponsorshipPlacementServiceError";
  }
}

interface AdminSponsorshipPlacementServiceDependencies {
  repository: AdminSponsorshipPlacementRepository;
  runVerifiedTransaction: VerifiedAccountTransactionRunner;
}

interface MutationContext {
  reason: string;
  requestId: string;
}

function requireHumanReason(value: string) {
  const reason = value.trim();

  if (reason.length < 8 || reason.length > 500) {
    throw new SponsorshipPlacementServiceError("INVALID_REASON");
  }

  return reason;
}

function toActivationInput(evidence: SponsorshipActivationEvidence) {
  return {
    featuredCreator: evidence.featuredCreator,
    media: evidence.media,
    mediaMobile: evidence.mediaMobile,
    mediaTablet: evidence.mediaTablet,
    placement: {
      advertiserAccountId: evidence.placement.advertiserAccountId,
      advertiserLabel: evidence.placement.advertiserLabel,
      archivedAt: evidence.placement.archivedAt,
      audience: evidence.placement.audience,
      body: evidence.placement.body,
      creativeAssetId: evidence.placement.creativeAssetId,
      creativeAssetMobileId: evidence.placement.creativeAssetMobileId,
      creativeAssetTabletId: evidence.placement.creativeAssetTabletId,
      endsAt: evidence.placement.endsAt,
      featuredCreatorProfileId: evidence.placement.featuredCreatorProfileId,
      id: evidence.placement.id,
      isActive: evidence.placement.isActive,
      linkLabel: evidence.placement.linkLabel,
      linkUrl: evidence.placement.linkUrl,
      placementType: evidence.placement.placementType,
      slotKey: evidence.placement.slotKey,
      sortOrder: evidence.placement.sortOrder,
      startsAt: evidence.placement.startsAt,
      title: evidence.placement.title,
    } satisfies SponsorshipPlacementCandidate,
  };
}

function parseDraft(input: unknown) {
  const result = sponsorshipPlacementDraftSchema.safeParse(input);

  if (!result.success) {
    throw new SponsorshipPlacementServiceError("INVALID_INPUT");
  }

  return result.data;
}

function requireExpectedVersion(value: number) {
  if (!Number.isInteger(value) || value < 1) {
    throw new SponsorshipPlacementServiceError("VERSION_CONFLICT");
  }
}

function isOwnedPendingSponsorshipCreative(
  assetId: string | null,
  media: SponsorshipActivationMediaEvidence | null,
  actorAccountId: string,
): media is SponsorshipActivationMediaEvidence {
  return Boolean(
    media &&
    assetId &&
    media.id === assetId &&
    media.ownerAccountId === actorAccountId &&
    media.ownerAccountRole === "ADMIN" &&
    media.bucketName === "sponsorship-media" &&
    media.kind === "SPONSORSHIP_CREATIVE" &&
    media.status === "PENDING" &&
    ["image/jpeg", "image/png", "image/webp"].includes(media.mimeType) &&
    media.sizeBytes > 0 &&
    media.sizeBytes <= 8 * 1024 * 1024 &&
    media.width !== null &&
    media.width > 0 &&
    media.width <= 16_384 &&
    media.height !== null &&
    media.height > 0 &&
    media.height <= 16_384 &&
    media.width * media.height <= 40_000_000 &&
    !media.archivedAt,
  );
}

function isEligibleReplacementCreative(
  assetId: string | null,
  media: SponsorshipActivationMediaEvidence | null,
  actorAccountId: string,
): boolean {
  if (
    !media ||
    !assetId ||
    media.id !== assetId ||
    media.ownerAccountRole !== "ADMIN" ||
    media.bucketName !== "sponsorship-media" ||
    media.kind !== "SPONSORSHIP_CREATIVE" ||
    media.archivedAt
  ) {
    return false;
  }

  return (
    media.status === "ACTIVE" ||
    isOwnedPendingSponsorshipCreative(assetId, media, actorAccountId)
  );
}

/** Promotes a slot's pending creative to ACTIVE during activation, or passes
 * an already-active one through unchanged. Throws when a pending asset
 * doesn't actually belong to (or pass validation for) this admin. */
async function promoteIfPending(
  repository: AdminSponsorshipPlacementRepository,
  transaction: ApplicationTransaction,
  assetId: string | null,
  media: SponsorshipActivationMediaEvidence | null,
  actorAccountId: string,
): Promise<SponsorshipActivationMediaEvidence | null> {
  if (!media || media.status !== "PENDING") {
    return media;
  }

  if (!isOwnedPendingSponsorshipCreative(assetId, media, actorAccountId)) {
    throw new SponsorshipPlacementServiceError("INVALID_ACTIVATION");
  }

  const promoted = await repository.promotePendingCreative(
    transaction,
    media.id,
    actorAccountId,
  );

  if (!promoted) {
    throw new SponsorshipPlacementServiceError("INVALID_ACTIVATION");
  }

  return promoted;
}

export function createAdminSponsorshipPlacementService({
  repository,
  runVerifiedTransaction,
}: AdminSponsorshipPlacementServiceDependencies) {
  async function runAdminRead<T>(
    requestId: string,
    work: (
      transaction: ApplicationTransaction,
      actor: VerifiedAccountContext,
    ) => Promise<T>,
  ): Promise<T> {
    return runVerifiedTransaction({ requestId }, async (transaction, actor) => {
      requireAdmin({
        id: actor.accountId,
        role: actor.role,
        status: actor.status,
      });

      return work(transaction, actor);
    });
  }

  async function runAdminMutation<T>(
    context: MutationContext,
    work: (
      transaction: ApplicationTransaction,
      actor: VerifiedAccountContext,
    ) => Promise<T>,
  ): Promise<T> {
    const reason = requireHumanReason(context.reason);

    try {
      return await runVerifiedTransaction(
        { requestId: context.requestId },
        async (transaction, actor) => {
          requireAdmin({
            id: actor.accountId,
            role: actor.role,
            status: actor.status,
          });
          await applyVerifiedAuditContext(transaction, {
            actorAccountId: actor.accountId,
            actorRole: "ADMIN",
            actorType: "ADMIN",
            reason,
            requestId: context.requestId,
            source: "BACKOFFICE",
          });

          return work(transaction, actor);
        },
      );
    } catch (error) {
      if (error instanceof SponsorshipPlacementRepositoryError) {
        throw new SponsorshipPlacementServiceError(error.code);
      }

      throw error;
    }
  }

  return {
    archive(command: {
      expectedVersion: number;
      placementId: string;
      reason: string;
      requestId: string;
    }) {
      requireExpectedVersion(command.expectedVersion);

      return runAdminMutation(command, (transaction) =>
        repository.archive(
          transaction,
          command.placementId,
          command.expectedVersion,
        ),
      );
    },

    async activate(command: {
      expectedVersion: number;
      placementId: string;
      reason: string;
      requestId: string;
    }) {
      requireExpectedVersion(command.expectedVersion);

      return runAdminMutation(command, async (transaction, actor) => {
        let evidence = await repository.findActivationEvidence(
          transaction,
          command.placementId,
        );

        if (!evidence) {
          throw new SponsorshipPlacementServiceError("NOT_FOUND");
        }

        if (evidence.placement.version !== command.expectedVersion) {
          throw new SponsorshipPlacementServiceError("VERSION_CONFLICT");
        }

        const [media, mediaTablet, mediaMobile] = await Promise.all([
          promoteIfPending(
            repository,
            transaction,
            evidence.placement.creativeAssetId,
            evidence.media,
            actor.accountId,
          ),
          promoteIfPending(
            repository,
            transaction,
            evidence.placement.creativeAssetTabletId,
            evidence.mediaTablet,
            actor.accountId,
          ),
          promoteIfPending(
            repository,
            transaction,
            evidence.placement.creativeAssetMobileId,
            evidence.mediaMobile,
            actor.accountId,
          ),
        ]);

        evidence = { ...evidence, media, mediaMobile, mediaTablet };

        if (
          !validatePlacementForActivation(toActivationInput(evidence)).eligible
        ) {
          throw new SponsorshipPlacementServiceError("INVALID_ACTIVATION");
        }

        if (evidence.placement.isActive) {
          return evidence.placement;
        }

        return repository.setActive(
          transaction,
          command.placementId,
          command.expectedVersion,
          true,
        );
      });
    },

    create(command: {
      placement: Omit<SponsorshipPlacementCreateData, "isActive">;
      reason: string;
      requestId: string;
    }) {
      return runAdminMutation(command, (transaction) => {
        const placement = parseDraft({
          ...command.placement,
          isActive: false,
        });

        return repository.create(transaction, {
          ...placement,
          isActive: false,
        });
      });
    },

    deactivate(command: {
      expectedVersion: number;
      placementId: string;
      reason: string;
      requestId: string;
    }) {
      requireExpectedVersion(command.expectedVersion);

      return runAdminMutation(command, (transaction) =>
        repository.setActive(
          transaction,
          command.placementId,
          command.expectedVersion,
          false,
        ),
      );
    },

    get(query: {
      includeArchived?: boolean;
      placementId: string;
      requestId: string;
    }) {
      return runAdminRead(query.requestId, (transaction) =>
        repository.findById(
          transaction,
          query.placementId,
          query.includeArchived,
        ),
      );
    },

    list(query: SponsorshipPlacementListFilters & { requestId: string }) {
      const filters = {
        ...query,
        page: Math.max(1, Math.trunc(query.page)),
        pageSize: Math.min(50, Math.max(1, Math.trunc(query.pageSize))),
      };

      return runAdminRead(query.requestId, (transaction) =>
        repository.list(transaction, filters),
      );
    },

    reorder(command: {
      items: SponsorshipPlacementReorderItem[];
      reason: string;
      requestId: string;
    }) {
      for (const item of command.items) {
        requireExpectedVersion(item.expectedVersion);

        if (!Number.isInteger(item.sortOrder) || item.sortOrder < 0) {
          throw new SponsorshipPlacementServiceError("VERSION_CONFLICT");
        }
      }

      return runAdminMutation(command, (transaction) =>
        repository.reorder(transaction, command.items),
      );
    },

    update(command: {
      expectedVersion: number;
      patch: SponsorshipPlacementUpdateData;
      placementId: string;
      reason: string;
      requestId: string;
    }) {
      requireExpectedVersion(command.expectedVersion);

      return runAdminMutation(command, async (transaction, actor) => {
        const current = await repository.findById(
          transaction,
          command.placementId,
        );

        if (!current) {
          throw new SponsorshipPlacementServiceError("NOT_FOUND");
        }

        if (current.version !== command.expectedVersion) {
          throw new SponsorshipPlacementServiceError("VERSION_CONFLICT");
        }

        const parsed = parseDraft({
          advertiserAccountId: current.advertiserAccountId,
          advertiserLabel: current.advertiserLabel,
          audience: current.audience,
          body: current.body,
          creativeAssetId: current.creativeAssetId,
          creativeAssetMobileId: current.creativeAssetMobileId,
          creativeAssetTabletId: current.creativeAssetTabletId,
          endsAt: current.endsAt,
          featuredCreatorProfileId: current.featuredCreatorProfileId,
          isActive: current.isActive,
          linkLabel: current.linkLabel,
          linkUrl: current.linkUrl,
          placementType: current.placementType,
          slotKey: current.slotKey,
          sortOrder: current.sortOrder,
          startsAt: current.startsAt,
          title: current.title,
          ...command.patch,
        });
        const patch = Object.fromEntries(
          Object.keys(command.patch).map((key) => [
            key,
            parsed[key as keyof typeof parsed],
          ]),
        ) as SponsorshipPlacementUpdateData;

        const updated = await repository.update(
          transaction,
          command.placementId,
          command.expectedVersion,
          patch,
        );

        const creativeSlots = [
          {
            current: current.creativeAssetId,
            field: "creativeAssetId" as const,
            media: (e: SponsorshipActivationEvidence) => e.media,
            updated: updated.creativeAssetId,
          },
          {
            current: current.creativeAssetTabletId,
            field: "creativeAssetTabletId" as const,
            media: (e: SponsorshipActivationEvidence) => e.mediaTablet,
            updated: updated.creativeAssetTabletId,
          },
          {
            current: current.creativeAssetMobileId,
            field: "creativeAssetMobileId" as const,
            media: (e: SponsorshipActivationEvidence) => e.mediaMobile,
            updated: updated.creativeAssetMobileId,
          },
        ];
        let evidence: SponsorshipActivationEvidence | null = null;

        for (const slot of creativeSlots) {
          const wasReplaced =
            Object.hasOwn(command.patch, slot.field) &&
            slot.current !== slot.updated &&
            slot.current !== null &&
            slot.updated !== null;

          if (!wasReplaced) {
            continue;
          }

          evidence ??= await repository.findActivationEvidence(
            transaction,
            command.placementId,
          );

          if (
            !evidence ||
            !isEligibleReplacementCreative(
              slot.updated,
              slot.media(evidence),
              actor.accountId,
            )
          ) {
            throw new SponsorshipPlacementServiceError("INVALID_ACTIVATION");
          }

          await repository.archiveReplacedCreativeIfUnreferenced(
            transaction,
            slot.current!,
            slot.updated!,
          );
        }

        if (!updated.isActive) {
          return updated;
        }

        evidence ??= await repository.findActivationEvidence(
          transaction,
          command.placementId,
        );

        if (
          !evidence ||
          !validatePlacementForActivation(toActivationInput(evidence)).eligible
        ) {
          throw new SponsorshipPlacementServiceError("INVALID_ACTIVATION");
        }

        return updated;
      });
    },
  };
}
