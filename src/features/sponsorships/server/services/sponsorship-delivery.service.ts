import "server-only";

import {
  evaluatePlacement,
  sortEligiblePlacements,
} from "../../domain/sponsorship-placement-policy";
import type { RendererPlacementDto } from "../../types/sponsorship-placement.types";
import type {
  SponsorshipDeliveryCandidateRecord,
  SponsorshipDeliveryQuery,
  SponsorshipDeliveryRepository,
} from "../repositories/sponsorship-delivery.repository";

interface SignedSponsorshipMedia {
  height: number | null;
  url: string;
  width: number | null;
}

interface SponsorshipDeliveryServiceDependencies {
  repository: SponsorshipDeliveryRepository;
  resolveSignedMedia(
    assetId: string,
    placementId: string,
    now: Date,
  ): Promise<SignedSponsorshipMedia | null>;
}

function creativeAlt(candidate: SponsorshipDeliveryCandidateRecord) {
  const advertiser = candidate.placement.advertiserLabel?.trim();

  return advertiser
    ? `${candidate.placement.title} — ${advertiser}`
    : candidate.placement.title!;
}

export function createSponsorshipDeliveryService({
  repository,
  resolveSignedMedia,
}: SponsorshipDeliveryServiceDependencies) {
  return {
    async load(
      query: SponsorshipDeliveryQuery,
    ): Promise<RendererPlacementDto[]> {
      const limit = Math.min(20, Math.max(1, Math.trunc(query.limit)));
      const candidates = await repository.listCandidates({
        ...query,
        limit,
      });
      const eligibleCandidates = candidates.filter(
        (candidate) =>
          evaluatePlacement({
            allowedPlacementTypes: query.allowedPlacementTypes,
            featuredCreator: candidate.featuredCreator,
            media: candidate.media,
            now: query.now,
            placement: candidate.placement,
            route: query.route,
            slotKey: query.slotKey,
            viewer: query.viewer,
          }).eligible,
      );
      const candidateByPlacementId = new Map(
        eligibleCandidates.map((candidate) => [
          candidate.placement.id,
          candidate,
        ]),
      );
      const eligible = sortEligiblePlacements(
        eligibleCandidates.map(({ placement }) => placement),
      )
        .map((placement) => candidateByPlacementId.get(placement.id))
        .filter(
          (candidate): candidate is SponsorshipDeliveryCandidateRecord =>
            candidate !== undefined,
        )
        .slice(0, limit);
      const resolved = await Promise.all(
        eligible.map(
          async (candidate): Promise<RendererPlacementDto | null> => {
            const { placement } = candidate;

            if (!placement.title) {
              return null;
            }

            if (placement.placementType === "FEATURED_CREATOR") {
              if (
                !placement.featuredCreatorProfileId ||
                !candidate.featuredPresentation
              ) {
                return null;
              }

              const avatar = candidate.featuredPresentation.avatarAssetId
                ? await resolveSignedMedia(
                    candidate.featuredPresentation.avatarAssetId,
                    placement.id,
                    query.now,
                  )
                : null;

              return {
                body: placement.body,
                eligible: true,
                featuredCreator: {
                  avatar: avatar
                    ? {
                        alt: `Foto de perfil de ${candidate.featuredPresentation.displayName}`,
                        url: avatar.url,
                      }
                    : null,
                  creatorId: placement.featuredCreatorProfileId,
                  displayName: candidate.featuredPresentation.displayName,
                },
                id: placement.id,
                linkLabel: placement.linkLabel,
                linkUrl: placement.linkUrl,
                media: null,
                sortOrder: placement.sortOrder,
                title: placement.title,
                type: placement.placementType,
              } satisfies RendererPlacementDto;
            }

            if (!placement.creativeAssetId) {
              return null;
            }

            const media = await resolveSignedMedia(
              placement.creativeAssetId,
              placement.id,
              query.now,
            );

            if (!media) {
              return null;
            }

            return {
              body: placement.body,
              eligible: true,
              featuredCreator: null,
              id: placement.id,
              linkLabel: placement.linkLabel,
              linkUrl: placement.linkUrl,
              media: {
                alt: creativeAlt(candidate),
                url: media.url,
              },
              sortOrder: placement.sortOrder,
              title: placement.title,
              type: placement.placementType,
            } satisfies RendererPlacementDto;
          },
        ),
      );

      return resolved.filter(
        (placement): placement is RendererPlacementDto => placement !== null,
      );
    },
  };
}
