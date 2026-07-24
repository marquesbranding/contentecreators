export type AuthIdentityFixture = {
  email: string;
  emailConfirmed: boolean;
  id: string;
  provider: "email" | "google";
};

export type AccountRoleFixture = "ADMIN" | "INFLUENCER" | "COMPANY";
export type AccountStatusFixture =
  | "ONBOARDING"
  | "PENDING_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "SUSPENDED"
  | "BANNED";

export type AccountFixture = {
  authUserId: string;
  email: string;
  id: string;
  role: AccountRoleFixture;
  status: AccountStatusFixture;
  version: number;
};

export type CreatorProfileFixture = {
  accountId: string;
  bio: string;
  city: string;
  creatorType: "INFLUENCER" | "UGC";
  displayName: string;
  id: string;
  state: string;
  whatsapp: string;
};

export type CompanyProfileFixture = {
  accountId: string;
  cnpj: string;
  description: string;
  id: string;
  legalName: string;
  tradeName: string;
  whatsapp: string;
};

export type SponsorshipPlacementFixture = {
  audience: "ALL" | "INFLUENCER" | "COMPANY";
  id: string;
  placementType: "TOP" | "INLINE" | "CAROUSEL" | "FEATURED_CREATOR";
  route: string;
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  title: string;
};

export type ModerationEventFixture = {
  actorAccountId: string;
  accountId: string;
  fromStatus: AccountStatusFixture;
  id: string;
  reason: string | null;
  sequence: number;
  toStatus: AccountStatusFixture;
};

export type ConsentFixture = {
  accountId: string;
  documentHash: string;
  documentType: "TERMS" | "PRIVACY" | "CONTACT_VISIBILITY";
  documentVersion: string;
  granted: boolean;
  id: string;
};

export type LegalDocumentFixture = {
  contentHash: string;
  documentType: "TERMS" | "PRIVACY" | "CONTACT_VISIBILITY";
  id: string;
  version: string;
};

export type AuditRevisionFixture = {
  actorAccountId: string;
  actorType: "USER" | "ADMIN" | "SYSTEM";
  after: Readonly<Record<string, unknown>>;
  before: Readonly<Record<string, unknown>> | null;
  changedFields: readonly string[];
  entityId: string;
  entityType: string;
  id: string;
  revision: number;
  source: "APPLICATION" | "BACKOFFICE" | "SYSTEM";
};

const ids = {
  account: "00000000-0000-4000-8000-000000000001",
  admin: "00000000-0000-4000-8000-000000000002",
  aggregate: "00000000-0000-4000-8000-000000000003",
  authUser: "00000000-0000-4000-8000-000000000004",
  record: "00000000-0000-4000-8000-000000000005",
} as const;

export function buildAuthIdentity(
  overrides: Partial<AuthIdentityFixture> = {},
): AuthIdentityFixture {
  return {
    email: "creator@example.test",
    emailConfirmed: true,
    id: ids.authUser,
    provider: "email",
    ...overrides,
  };
}

export function buildAccount(
  overrides: Partial<AccountFixture> = {},
): AccountFixture {
  return {
    authUserId: ids.authUser,
    email: "creator@example.test",
    id: ids.account,
    role: "INFLUENCER",
    status: "ONBOARDING",
    version: 1,
    ...overrides,
  };
}

export function buildCreatorProfile(
  overrides: Partial<CreatorProfileFixture> = {},
): CreatorProfileFixture {
  return {
    accountId: ids.account,
    bio: "Conteúdo sintético para testes automatizados.",
    city: "São Paulo",
    creatorType: "INFLUENCER",
    displayName: "Creator de Teste",
    id: ids.aggregate,
    state: "SP",
    whatsapp: "5511999999999",
    ...overrides,
  };
}

export function buildCompanyProfile(
  overrides: Partial<CompanyProfileFixture> = {},
): CompanyProfileFixture {
  return {
    accountId: ids.account,
    cnpj: "11222333000181",
    description: "Empresa sintética para testes automatizados.",
    id: ids.aggregate,
    legalName: "Empresa de Teste Ltda.",
    tradeName: "Empresa de Teste",
    whatsapp: "5511988888888",
    ...overrides,
  };
}

export function buildSponsorshipPlacement(
  overrides: Partial<SponsorshipPlacementFixture> = {},
): SponsorshipPlacementFixture {
  return {
    audience: "ALL",
    id: ids.aggregate,
    placementType: "TOP",
    route: "/",
    status: "DRAFT",
    title: "Divulgação sintética",
    ...overrides,
  };
}

export function buildModerationEvent(
  overrides: Partial<ModerationEventFixture> = {},
): ModerationEventFixture {
  return {
    accountId: ids.account,
    actorAccountId: ids.account,
    fromStatus: "ONBOARDING",
    id: ids.record,
    reason: null,
    sequence: 1,
    toStatus: "PENDING_REVIEW",
    ...overrides,
  };
}

export function buildConsent(
  overrides: Partial<ConsentFixture> = {},
): ConsentFixture {
  return {
    accountId: ids.account,
    documentHash: "sha256:test-document-hash",
    documentType: "PRIVACY",
    documentVersion: "test-v1",
    granted: true,
    id: ids.record,
    ...overrides,
  };
}

export function buildLegalDocument(
  overrides: Partial<LegalDocumentFixture> = {},
): LegalDocumentFixture {
  return {
    contentHash:
      "6f027472d9452c4c207ff66c8e4b95b66c2df7283af192a4e348d4f2cfe6f71c",
    documentType: "TERMS",
    id: ids.aggregate,
    version: "BETA-PLACEHOLDER-v1",
    ...overrides,
  };
}

export function buildAuditRevision(
  overrides: Partial<AuditRevisionFixture> = {},
): AuditRevisionFixture {
  return {
    actorAccountId: ids.account,
    actorType: "USER",
    after: { status: "PENDING_REVIEW" },
    before: { status: "ONBOARDING" },
    changedFields: ["status"],
    entityId: ids.aggregate,
    entityType: "account",
    id: ids.record,
    revision: 1,
    source: "APPLICATION",
    ...overrides,
  };
}
