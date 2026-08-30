import "server-only";

import {
  loadCurrentCompanyReviewProfile,
  loadCurrentInfluencerReviewProfile,
} from "@/features/onboarding/server";
import {
  ProfileHeaderPreview,
  type ProfileHeaderPreviewBadge,
} from "@/shared/components/profile-header-preview";

import { CompanyMediaFields } from "../../components/company-media-fields.client";
import { InfluencerMediaFields } from "../../components/influencer-media-fields.client";
import {
  activateProfileMediaAction,
  finalizeMediaUploadAction,
  prepareMediaUploadAction,
  removeProfileMediaAction,
} from "../actions/media-upload.actions";
import { loadCurrentCompanyMediaFormState } from "../queries/company-media-form.queries";
import { loadCurrentInfluencerMediaFormState } from "../queries/influencer-media-form.queries";
import { getServerSignedMedia } from "../services/server-signed-media.service";

const mediaActions = {
  activate: activateProfileMediaAction,
  finalize: finalizeMediaUploadAction,
  prepare: prepareMediaUploadAction,
  remove: removeProfileMediaAction,
};

function initialsFromName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function formatLocation(city: string, state: string) {
  return city && state ? `${city}, ${state.toUpperCase()}` : city;
}

export async function PendingReviewMediaStep({
  role,
}: {
  role: "COMPANY" | "INFLUENCER";
}) {
  if (role === "INFLUENCER") {
    const [profile, mediaState] = await Promise.all([
      loadCurrentInfluencerReviewProfile(),
      loadCurrentInfluencerMediaFormState(),
    ]);
    const [avatarMedia, coverMedia] = await Promise.all([
      mediaState.avatarAssetId
        ? getServerSignedMedia(mediaState.avatarAssetId)
        : null,
      mediaState.coverAssetId
        ? getServerSignedMedia(mediaState.coverAssetId)
        : null,
    ]);
    const displayName = profile?.displayName || profile?.legalName || "";
    const badges: ProfileHeaderPreviewBadge[] = profile
      ? [
          {
            label: profile.creatorType === "INFLUENCER" ? "Influenciador" : "Creator UGC",
            tone: "primary",
          },
        ]
      : [];

    return (
      <div className="space-y-5">
        <ProfileHeaderPreview
          avatarUrl={avatarMedia?.url ?? null}
          badges={badges}
          coverUrl={coverMedia?.url ?? null}
          displayName={displayName}
          initials={initialsFromName(displayName)}
          location={
            profile ? formatLocation(profile.city, profile.state) : ""
          }
        />
        <InfluencerMediaFields actions={mediaActions} initialState={mediaState} />
      </div>
    );
  }

  const [profile, mediaState] = await Promise.all([
    loadCurrentCompanyReviewProfile(),
    loadCurrentCompanyMediaFormState(),
  ]);
  const [logoMedia, coverMedia] = await Promise.all([
    mediaState.logoAssetId ? getServerSignedMedia(mediaState.logoAssetId) : null,
    mediaState.coverAssetId ? getServerSignedMedia(mediaState.coverAssetId) : null,
  ]);
  const displayName = profile?.tradeName ?? "";

  return (
    <div className="space-y-5">
      <ProfileHeaderPreview
        avatarUrl={logoMedia?.url ?? null}
        badges={[{ label: "Empresa", tone: "primary" }]}
        coverUrl={coverMedia?.url ?? null}
        displayName={displayName}
        initials={initialsFromName(displayName)}
        location={profile ? formatLocation(profile.city, profile.state) : ""}
      />
      <CompanyMediaFields actions={mediaActions} initialState={mediaState} />
    </div>
  );
}
