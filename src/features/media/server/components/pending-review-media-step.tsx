import "server-only";

import {
  loadCurrentCompanyReviewProfile,
  loadCurrentInfluencerReviewProfile,
} from "@/features/onboarding/server";
import type { ProfileHeaderPreviewBadge } from "@/shared/components/profile-header-preview";
import { accountTypeLabels } from "@/shared/domain/account-type-labels";

import { ProfileHeaderMediaEditor } from "../../components/profile-header-media-editor.client";
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
            label: accountTypeLabels[profile.creatorType],
            tone: "primary",
          },
        ]
      : [];

    return (
      <ProfileHeaderMediaEditor
        actions={mediaActions}
        avatar={{
          currentAssetId: mediaState.avatarAssetId,
          initialUrl: avatarMedia?.url ?? null,
          label: "Foto de perfil",
          purpose: "AVATAR",
        }}
        badges={badges}
        cover={{
          currentAssetId: mediaState.coverAssetId,
          initialUrl: coverMedia?.url ?? null,
          label: "Imagem de capa",
          purpose: "COVER",
        }}
        displayName={displayName}
        initials={initialsFromName(displayName)}
        location={profile ? formatLocation(profile.city, profile.state) : ""}
      />
    );
  }

  const [profile, mediaState] = await Promise.all([
    loadCurrentCompanyReviewProfile(),
    loadCurrentCompanyMediaFormState(),
  ]);
  const [logoMedia, coverMedia] = await Promise.all([
    mediaState.logoAssetId
      ? getServerSignedMedia(mediaState.logoAssetId)
      : null,
    mediaState.coverAssetId
      ? getServerSignedMedia(mediaState.coverAssetId)
      : null,
  ]);
  const displayName = profile?.tradeName ?? "";

  return (
    <ProfileHeaderMediaEditor
      actions={mediaActions}
      avatar={{
        currentAssetId: mediaState.logoAssetId,
        initialUrl: logoMedia?.url ?? null,
        label: "Logo da empresa",
        purpose: "LOGO",
      }}
      badges={[{ label: "Empresa", tone: "primary" }]}
      cover={{
        currentAssetId: mediaState.coverAssetId,
        initialUrl: coverMedia?.url ?? null,
        label: "Capa da empresa",
        purpose: "COVER",
      }}
      displayName={displayName}
      initials={initialsFromName(displayName)}
      location={profile ? formatLocation(profile.city, profile.state) : ""}
    />
  );
}
