/**
 * Single source of truth for "what can an admin ask a creator/company to
 * fix" — backs the REQUEST_CHANGES checklist in the backoffice and the
 * "here's what to fix" banner the owner sees on their onboarding form.
 * `dataFieldName` matches the `data-field-name`/`name` attribute
 * `ProfileFormFields` already renders for that field, used to scroll to and
 * focus it.
 */

export type CorrectableFieldSection =
  "location" | "media" | "networks" | "profile";

export interface CorrectableFieldDefinition {
  dataFieldName: string;
  key: string;
  label: string;
  section: CorrectableFieldSection;
}

const commonFields: readonly CorrectableFieldDefinition[] = [
  {
    dataFieldName: "avatarAssetId",
    key: "avatar",
    label: "Foto de perfil",
    section: "media",
  },
  {
    dataFieldName: "logoAssetId",
    key: "logo",
    label: "Logo",
    section: "media",
  },
  {
    dataFieldName: "coverAssetId",
    key: "cover",
    label: "Imagem de capa",
    section: "media",
  },
  {
    dataFieldName: "whatsapp",
    key: "whatsapp",
    label: "WhatsApp",
    section: "profile",
  },
  {
    dataFieldName: "socialChannels",
    key: "socialChannels",
    label: "Redes sociais",
    section: "networks",
  },
  {
    dataFieldName: "city",
    key: "location",
    label: "Localização",
    section: "location",
  },
  {
    dataFieldName: "isCdlMember",
    key: "isCdlMember",
    label: "Associado da CDL",
    section: "profile",
  },
];

const influencerFields: readonly CorrectableFieldDefinition[] = [
  {
    dataFieldName: "legalName",
    key: "legalName",
    label: "Nome completo",
    section: "profile",
  },
  {
    dataFieldName: "displayName",
    key: "displayName",
    label: "Nome de creator",
    section: "profile",
  },
  {
    dataFieldName: "creatorType",
    key: "creatorType",
    label: "Tipo de atuação",
    section: "profile",
  },
  {
    dataFieldName: "bio",
    key: "bio",
    label: "Sobre o conteúdo",
    section: "profile",
  },
  {
    dataFieldName: "nicheSlugs",
    key: "niches",
    label: "Principais nichos",
    section: "profile",
  },
  {
    dataFieldName: "socialChannels",
    key: "metrics",
    label: "Métricas informadas",
    section: "networks",
  },
];

const companyFields: readonly CorrectableFieldDefinition[] = [
  {
    dataFieldName: "legalName",
    key: "legalName",
    label: "Razão social",
    section: "profile",
  },
  {
    dataFieldName: "tradeName",
    key: "tradeName",
    label: "Nome fantasia",
    section: "profile",
  },
  { dataFieldName: "cnpj", key: "cnpj", label: "CNPJ", section: "profile" },
  {
    dataFieldName: "segment",
    key: "segment",
    label: "Segmento",
    section: "profile",
  },
  {
    dataFieldName: "employeeRange",
    key: "employeeRange",
    label: "Tamanho da empresa",
    section: "profile",
  },
  {
    dataFieldName: "description",
    key: "description",
    label: "Descrição da empresa",
    section: "profile",
  },
  {
    dataFieldName: "websiteUrl",
    key: "websiteUrl",
    label: "Site",
    section: "profile",
  },
  {
    dataFieldName: "street",
    key: "primaryLocation",
    label: "Endereço principal",
    section: "location",
  },
  {
    dataFieldName: "additionalLocations",
    key: "additionalLocations",
    label: "Localidades adicionais",
    section: "location",
  },
];

export const CORRECTABLE_FIELDS_BY_ROLE = {
  COMPANY: [...commonFields, ...companyFields],
  INFLUENCER: [...commonFields, ...influencerFields],
} as const satisfies Record<
  "COMPANY" | "INFLUENCER",
  readonly CorrectableFieldDefinition[]
>;

const allDefinitionsByKey = new Map<string, CorrectableFieldDefinition>(
  [
    ...CORRECTABLE_FIELDS_BY_ROLE.COMPANY,
    ...CORRECTABLE_FIELDS_BY_ROLE.INFLUENCER,
  ].map((field) => [field.key, field]),
);

export function getCorrectableFieldDefinition(key: string) {
  return allDefinitionsByKey.get(key);
}

export function getCorrectableFieldLabel(key: string) {
  return getCorrectableFieldDefinition(key)?.label ?? key;
}

export interface RequestedField {
  field: string;
  note?: string;
}

export function groupCorrectableFieldsBySection(
  role: "COMPANY" | "INFLUENCER",
) {
  const bySection = new Map<
    CorrectableFieldSection,
    CorrectableFieldDefinition[]
  >();

  for (const field of CORRECTABLE_FIELDS_BY_ROLE[role]) {
    const group = bySection.get(field.section) ?? [];
    group.push(field);
    bySection.set(field.section, group);
  }

  return bySection;
}

export const CORRECTABLE_FIELD_SECTION_LABELS: Record<
  CorrectableFieldSection,
  string
> = {
  location: "Localização",
  media: "Mídia",
  networks: "Redes",
  profile: "Perfil",
};
