import "server-only";

import type { CurrentAccountDto } from "@/features/identity/server";

import type {
  CatalogCreatorContactDto,
  CatalogCreatorDetailDto,
  CatalogCreatorMetricDto,
} from "../../types/catalog-detail.types";
import type { CatalogSocialPlatform } from "../../types/creator-catalog.types";
import { getCatalogContactAccess } from "../policies/catalog-detail.policy";
import type { CatalogCreatorDetailRecord } from "../repositories/catalog-detail.repository";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const whatsappPattern = /^\+?[1-9]\d{9,14}$/u;

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);

    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function mapMetrics(
  records: CatalogCreatorDetailRecord["metrics"],
): CatalogCreatorMetricDto[] {
  const latestByPlatform = new Map<
    CatalogSocialPlatform,
    CatalogCreatorDetailRecord["metrics"][number]
  >();

  for (const record of [...records].sort(
    (left, right) => right.observedOn.getTime() - left.observedOn.getTime(),
  )) {
    if (!latestByPlatform.has(record.platform)) {
      latestByPlatform.set(record.platform, record);
    }
  }

  return [...latestByPlatform.values()].map((record) => {
    const parsedEngagementRate =
      record.engagementRate === null ? null : Number(record.engagementRate);

    return {
      engagementRate:
        parsedEngagementRate !== null &&
        Number.isFinite(parsedEngagementRate) &&
        parsedEngagementRate >= 0 &&
        parsedEngagementRate <= 100
          ? parsedEngagementRate
          : null,
      followerCount:
        record.followerCount !== null &&
        Number.isSafeInteger(record.followerCount) &&
        record.followerCount >= 0
          ? record.followerCount
          : null,
      interactionCount:
        record.interactionCount !== null &&
        Number.isSafeInteger(record.interactionCount) &&
        record.interactionCount >= 0
          ? record.interactionCount
          : null,
      isPrimary: record.isPrimary,
      observedOn: record.observedOn.toISOString().slice(0, 10),
      platform: record.platform,
      source: "SELF_REPORTED",
      viewCount:
        record.viewCount !== null &&
        Number.isSafeInteger(record.viewCount) &&
        record.viewCount >= 0
          ? record.viewCount
          : null,
    };
  });
}

function mapAvailableContact(
  record: CatalogCreatorDetailRecord,
  access: Extract<
    ReturnType<typeof getCatalogContactAccess>,
    { status: "AVAILABLE" }
  >,
): CatalogCreatorContactDto {
  const email =
    access.emailVisible &&
    record.contact?.email &&
    emailPattern.test(record.contact.email)
      ? { href: `mailto:${record.contact.email}` }
      : null;
  const whatsapp =
    access.whatsappVisible &&
    record.contact?.whatsappE164 &&
    whatsappPattern.test(record.contact.whatsappE164)
      ? {
          href: `https://wa.me/${record.contact.whatsappE164.replace(/\D/gu, "")}`,
        }
      : null;
  const social = access.socialVisible
    ? record.socialProfiles.flatMap((profile) => {
        const href = safeHttpUrl(profile.normalizedUrl);

        return href ? [{ href, platform: profile.platform }] : [];
      })
    : [];

  if (!email && !whatsapp && social.length === 0) {
    return {
      reason: "NO_CONTACT_CHANNELS",
      status: "UNAVAILABLE",
    };
  }

  return {
    email,
    social,
    status: "AVAILABLE",
    whatsapp,
  };
}

function mapContact(
  record: CatalogCreatorDetailRecord,
  viewer: CurrentAccountDto,
): CatalogCreatorContactDto {
  const access = getCatalogContactAccess(viewer, record.contact);

  if (access.status === "UNAVAILABLE") {
    return access;
  }

  return mapAvailableContact(record, access);
}

export function mapCatalogCreatorDetail(
  record: CatalogCreatorDetailRecord,
  viewer: CurrentAccountDto,
): CatalogCreatorDetailDto {
  const avatarIsActive = record.media.some(
    (media) => media.id === record.avatarAssetId && media.kind === "AVATAR",
  );
  const coverIsActive = record.media.some(
    (media) => media.id === record.coverAssetId && media.kind === "COVER",
  );

  return {
    bio: record.bio,
    contact: mapContact(record, viewer),
    creatorId: record.creatorId,
    creatorType: record.creatorType,
    displayName: record.displayName,
    location: {
      city: record.city,
      state: record.state,
    },
    media: {
      avatar:
        record.avatarAssetId && avatarIsActive
          ? {
              assetId: record.avatarAssetId,
              kind: "AVATAR",
            }
          : null,
      cover:
        record.coverAssetId && coverIsActive
          ? {
              assetId: record.coverAssetId,
              kind: "COVER",
            }
          : null,
    },
    metrics: mapMetrics(record.metrics),
    niches: record.niches.map(({ name, slug }) => ({ name, slug })),
    socialProfiles: record.socialProfiles.map(({ handle, platform }) => ({
      handle,
      platform,
    })),
  };
}
