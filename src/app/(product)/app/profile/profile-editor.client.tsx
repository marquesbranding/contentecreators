"use client";

import { useState } from "react";

import {
  ProfileHeaderMediaEditor,
  type CompanyMediaFormState,
  type InfluencerMediaFormState,
  type MediaUploadActions,
} from "@/features/media";
import {
  CompanyProfileEditForm,
  InfluencerProfileEditForm,
  type CompanyProfileAction,
  type CompanyProfileDto,
  type InfluencerProfileAction,
  type InfluencerProfileDto,
} from "@/features/onboarding";
import type { ProfileHeaderPreviewBadge } from "@/shared/components/profile-header-preview";
import { accountTypeLabels } from "@/shared/domain/account-type-labels";
import { BrowserQueryProvider } from "@/shared/query/browser-query-provider";

function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function formatLocation(city: string, state: string) {
  return city && state ? `${city}, ${state.toUpperCase()}` : city;
}

export function ProfileEditor({
  action,
  avatarUrl,
  coverUrl,
  mediaActions,
  mediaState,
  profile,
}: {
  action: InfluencerProfileAction;
  avatarUrl: string | null;
  coverUrl: string | null;
  mediaActions: MediaUploadActions;
  mediaState: InfluencerMediaFormState;
  profile: InfluencerProfileDto;
}) {
  return (
    <BrowserQueryProvider>
      <InfluencerProfileEditorContent
        action={action}
        avatarUrl={avatarUrl}
        coverUrl={coverUrl}
        mediaActions={mediaActions}
        mediaState={mediaState}
        profile={profile}
      />
    </BrowserQueryProvider>
  );
}

function InfluencerProfileEditorContent({
  action,
  avatarUrl,
  coverUrl,
  mediaActions,
  mediaState,
  profile,
}: {
  action: InfluencerProfileAction;
  avatarUrl: string | null;
  coverUrl: string | null;
  mediaActions: MediaUploadActions;
  mediaState: InfluencerMediaFormState;
  profile: InfluencerProfileDto;
}) {
  const [profileVersion, setProfileVersion] = useState(profile.version);
  const displayName = profile.displayName || profile.legalName;
  const badges: ProfileHeaderPreviewBadge[] = [
    {
      label: accountTypeLabels[profile.creatorType],
      tone: "primary",
    },
  ];

  return (
    <div className="space-y-8">
      <ProfileHeaderMediaEditor
        actions={mediaActions}
        avatar={{
          currentAssetId: mediaState.avatarAssetId,
          initialUrl: avatarUrl,
          label: "Foto de perfil",
          purpose: "AVATAR",
        }}
        badges={badges}
        cover={{
          currentAssetId: mediaState.coverAssetId,
          initialUrl: coverUrl,
          label: "Capa",
          purpose: "COVER",
        }}
        displayName={displayName}
        initials={initialsFromName(displayName)}
        location={formatLocation(profile.city, profile.state)}
        onProfileVersionChange={setProfileVersion}
      />
      <InfluencerProfileEditForm
        action={action}
        expectedVersion={profileVersion}
        onProfileVersionChange={setProfileVersion}
        profile={profile}
      />
    </div>
  );
}

export function CompanyProfileEditor({
  action,
  coverUrl,
  logoUrl,
  mediaActions,
  mediaState,
  profile,
}: {
  action: CompanyProfileAction;
  coverUrl: string | null;
  logoUrl: string | null;
  mediaActions: MediaUploadActions;
  mediaState: CompanyMediaFormState;
  profile: CompanyProfileDto;
}) {
  return (
    <BrowserQueryProvider>
      <CompanyProfileEditorContent
        action={action}
        coverUrl={coverUrl}
        logoUrl={logoUrl}
        mediaActions={mediaActions}
        mediaState={mediaState}
        profile={profile}
      />
    </BrowserQueryProvider>
  );
}

function CompanyProfileEditorContent({
  action,
  coverUrl,
  logoUrl,
  mediaActions,
  mediaState,
  profile,
}: {
  action: CompanyProfileAction;
  coverUrl: string | null;
  logoUrl: string | null;
  mediaActions: MediaUploadActions;
  mediaState: CompanyMediaFormState;
  profile: CompanyProfileDto;
}) {
  const [profileVersion, setProfileVersion] = useState(profile.version);

  return (
    <div className="space-y-8">
      <ProfileHeaderMediaEditor
        actions={mediaActions}
        avatar={{
          currentAssetId: mediaState.logoAssetId,
          initialUrl: logoUrl,
          label: "Logo da empresa",
          purpose: "LOGO",
        }}
        badges={[{ label: "Empresa", tone: "primary" }]}
        cover={{
          currentAssetId: mediaState.coverAssetId,
          initialUrl: coverUrl,
          label: "Capa",
          purpose: "COVER",
        }}
        displayName={profile.tradeName}
        initials={initialsFromName(profile.tradeName)}
        location={formatLocation(profile.city, profile.state)}
        onProfileVersionChange={setProfileVersion}
      />
      <CompanyProfileEditForm
        action={action}
        expectedVersion={profileVersion}
        onProfileVersionChange={setProfileVersion}
        profile={profile}
      />
    </div>
  );
}
