"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/shared/components/ui/badge";
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@/shared/components/ui/field";

import type {
  InfluencerMediaFormState,
  MediaUploadActions,
} from "../types/media-upload.types";
import { MediaUploadField } from "./media-upload-field.client";

function UploadedAssetBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge className="gap-1.5" variant="outline">
      <CheckCircle2 aria-hidden="true" />
      {children}
    </Badge>
  );
}

export function InfluencerMediaFields({
  actions,
  initialState,
  onProfileVersionChange,
}: {
  actions: MediaUploadActions;
  initialState: InfluencerMediaFormState;
  onProfileVersionChange?: (version: number) => void;
}) {
  const [avatarAssetId, setAvatarAssetId] = useState(
    initialState.avatarAssetId,
  );
  const [coverAssetId, setCoverAssetId] = useState(initialState.coverAssetId);
  const activateOnUpload = initialState.profileExists;

  return (
    <FieldSet>
      <FieldLegend>Fotos do perfil</FieldLegend>
      <FieldDescription>
        {initialState.profileExists
          ? "Novas imagens são validadas e publicadas assim que o envio termina."
          : "As imagens ficam privadas durante o cadastro e só são associadas ao seu perfil após a validação do envio."}
      </FieldDescription>

      {avatarAssetId ? (
        <input name="avatarAssetId" type="hidden" value={avatarAssetId} />
      ) : null}
      {coverAssetId ? (
        <input name="coverAssetId" type="hidden" value={coverAssetId} />
      ) : null}

      {avatarAssetId ? (
        <UploadedAssetBadge>Foto de perfil já enviada</UploadedAssetBadge>
      ) : null}
      <MediaUploadField
        actions={actions}
        activateOnUpload={activateOnUpload}
        currentAssetId={activateOnUpload ? avatarAssetId : null}
        label="Foto de perfil (opcional)"
        onComplete={setAvatarAssetId}
        onProfileVersionChange={onProfileVersionChange}
        purpose="AVATAR"
      />

      {coverAssetId ? (
        <UploadedAssetBadge>Capa já enviada</UploadedAssetBadge>
      ) : null}
      <MediaUploadField
        actions={actions}
        activateOnUpload={activateOnUpload}
        currentAssetId={activateOnUpload ? coverAssetId : null}
        label="Capa (opcional)"
        onComplete={setCoverAssetId}
        onProfileVersionChange={onProfileVersionChange}
        purpose="COVER"
      />
    </FieldSet>
  );
}
