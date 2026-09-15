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
            mediaMobile: candidate.mediaMobile,
            mediaTablet: candidate.mediaTablet,
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
        );
      const resolveCandidate = async (
        candidate: SponsorshipDeliveryCandidateRecord,
      ): Promise<RendererPlacementDto | null> => {
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
            advertiserLabel: placement.advertiserLabel,
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

        const [media, mediaTablet, mediaMobile] = await Promise.all([
          resolveSignedMedia(
            placement.creativeAssetId,
            placement.id,
            query.now,
          ),
          placement.creativeAssetTabletId
            ? resolveSignedMedia(
                placement.creativeAssetTabletId,
                placement.id,
                query.now,
              )
            : Promise.resolve(null),
          placement.creativeAssetMobileId
            ? resolveSignedMedia(
                placement.creativeAssetMobileId,
                placement.id,
                query.now,
              )
            : Promise.resolve(null),
        ]);

        if (!media) {
          return null;
        }

        const alt = creativeAlt(candidate);

        return {
          advertiserLabel: placement.advertiserLabel,
          body: placement.body,
          eligible: true,
          featuredCreator: null,
          id: placement.id,
          linkLabel: placement.linkLabel,
          linkUrl: placement.linkUrl,
          media: { alt, url: media.url },
          mediaMobile: mediaMobile ? { alt, url: mediaMobile.url } : null,
          mediaTablet: mediaTablet ? { alt, url: mediaTablet.url } : null,
          sortOrder: placement.sortOrder,
          title: placement.title,
          type: placement.placementType,
        } satisfies RendererPlacementDto;
      };
      const delivered: RendererPlacementDto[] = [];

      /* Resolve in batches so a higher-priority placement whose media can no
       * longer be signed yields its slot to the next eligible one instead of
       * leaving the slot empty. */
      for (
        let start = 0;
        start < eligible.length && delivered.length < limit;
        start += limit
      ) {
        const batch = await Promise.all(
          eligible.slice(start, start + limit).map(resolveCandidate),
        );

        for (const placement of batch) {
          if (placement && delivered.length < limit) {
            delivered.push(placement);
          }
        }
      }

      return delivered;
    },
  };
}
