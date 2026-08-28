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
      <FieldLegend>Imagens</FieldLegend>
      <FieldDescription>
        {initialState.profileExists
          ? "Atualize a imagem principal e a capa do seu perfil."
          : "Adicione imagem principal e capa antes de enviar o perfil."}
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
        label="Perfil"
        onComplete={setAvatarAssetId}
        onProfileVersionChange={onProfileVersionChange}
        onRemove={() => setAvatarAssetId(null)}
        purpose="AVATAR"
      />

      {coverAssetId ? (
        <UploadedAssetBadge>Capa já enviada</UploadedAssetBadge>
      ) : null}
      <MediaUploadField
        actions={actions}
        activateOnUpload={activateOnUpload}
        currentAssetId={activateOnUpload ? coverAssetId : null}
        label="Capa"
        onComplete={setCoverAssetId}
        onProfileVersionChange={onProfileVersionChange}
        onRemove={() => setCoverAssetId(null)}
        purpose="COVER"
      />
    </FieldSet>
  );
}
