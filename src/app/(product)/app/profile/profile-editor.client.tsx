"use client";

import { useState } from "react";

import {
  CompanyMediaFields,
  InfluencerMediaFields,
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
import { BrowserQueryProvider } from "@/shared/query/browser-query-provider";

export function ProfileEditor({
  action,
  mediaActions,
  mediaState,
  profile,
}: {
  action: InfluencerProfileAction;
  mediaActions: MediaUploadActions;
  mediaState: InfluencerMediaFormState;
  profile: InfluencerProfileDto;
}) {
  return (
    <BrowserQueryProvider>
      <InfluencerProfileEditorContent
        action={action}
        mediaActions={mediaActions}
        mediaState={mediaState}
        profile={profile}
      />
    </BrowserQueryProvider>
  );
}

function InfluencerProfileEditorContent({
  action,
  mediaActions,
  mediaState,
  profile,
}: {
  action: InfluencerProfileAction;
  mediaActions: MediaUploadActions;
  mediaState: InfluencerMediaFormState;
  profile: InfluencerProfileDto;
}) {
  const [profileVersion, setProfileVersion] = useState(profile.version);

  return (
    <InfluencerProfileEditForm
      action={action}
      expectedVersion={profileVersion}
      mediaFields={
        <InfluencerMediaFields
          actions={mediaActions}
          initialState={mediaState}
          onProfileVersionChange={setProfileVersion}
        />
      }
      onProfileVersionChange={setProfileVersion}
      profile={profile}
    />
  );
}

export function CompanyProfileEditor({
  action,
  mediaActions,
  mediaState,
  profile,
}: {
  action: CompanyProfileAction;
  mediaActions: MediaUploadActions;
  mediaState: CompanyMediaFormState;
  profile: CompanyProfileDto;
}) {
  return (
    <BrowserQueryProvider>
      <CompanyProfileEditorContent
        action={action}
        mediaActions={mediaActions}
        mediaState={mediaState}
        profile={profile}
      />
    </BrowserQueryProvider>
  );
}

function CompanyProfileEditorContent({
  action,
  mediaActions,
  mediaState,
  profile,
}: {
  action: CompanyProfileAction;
  mediaActions: MediaUploadActions;
  mediaState: CompanyMediaFormState;
  profile: CompanyProfileDto;
}) {
  const [profileVersion, setProfileVersion] = useState(profile.version);

  return (
    <CompanyProfileEditForm
      action={action}
      expectedVersion={profileVersion}
      mediaFields={
        <CompanyMediaFields
          actions={mediaActions}
          initialState={mediaState}
          onProfileVersionChange={setProfileVersion}
        />
      }
      onProfileVersionChange={setProfileVersion}
      profile={profile}
    />
  );
}
