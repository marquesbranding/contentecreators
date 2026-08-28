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
  CompanyMediaFormState,
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

export function CompanyMediaFields({
  actions,
  initialState,
  onProfileVersionChange,
}: {
  actions: MediaUploadActions;
  initialState: CompanyMediaFormState;
  onProfileVersionChange?: (version: number) => void;
}) {
  const [logoAssetId, setLogoAssetId] = useState(initialState.logoAssetId);
  const [coverAssetId, setCoverAssetId] = useState(initialState.coverAssetId);
  const activateOnUpload = initialState.profileExists;

  return (
    <FieldSet>
      <FieldLegend>Identidade visual</FieldLegend>
      <FieldDescription>
        {initialState.profileExists
          ? "Novas imagens são validadas e publicadas assim que o envio termina."
          : "As imagens ficam privadas durante o cadastro e são associadas à empresa na submissão."}
      </FieldDescription>

      {logoAssetId ? (
        <input name="logoAssetId" type="hidden" value={logoAssetId} />
      ) : null}
      {coverAssetId ? (
        <input name="coverAssetId" type="hidden" value={coverAssetId} />
      ) : null}

      {logoAssetId ? (
        <UploadedAssetBadge>Logo já enviado</UploadedAssetBadge>
      ) : null}
      <MediaUploadField
        actions={actions}
        activateOnUpload={activateOnUpload}
        currentAssetId={activateOnUpload ? logoAssetId : null}
        label="Logo da empresa (opcional)"
        onComplete={setLogoAssetId}
        onProfileVersionChange={onProfileVersionChange}
        onRemove={() => setLogoAssetId(null)}
        purpose="LOGO"
      />

      {coverAssetId ? (
        <UploadedAssetBadge>Capa já enviada</UploadedAssetBadge>
      ) : null}
      <MediaUploadField
        actions={actions}
        activateOnUpload={activateOnUpload}
        currentAssetId={activateOnUpload ? coverAssetId : null}
        label="Capa da empresa (opcional)"
        onComplete={setCoverAssetId}
        onProfileVersionChange={onProfileVersionChange}
        onRemove={() => setCoverAssetId(null)}
        purpose="COVER"
      />
    </FieldSet>
  );
}
