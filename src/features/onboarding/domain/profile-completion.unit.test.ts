import { describe, expect, it } from "vitest";

import {
  calculateProfileCompletion,
  PROFILE_COMPLETION_VERSION,
  type CompanyProfileCompletionInput,
  type CreatorProfileCompletionInput,
} from "./profile-completion";

const activeAvatar = {
  archivedAt: null,
  kind: "AVATAR" as const,
  ownerMatches: true,
  status: "ACTIVE" as const,
};
const activeCover = {
  archivedAt: null,
  kind: "COVER" as const,
  ownerMatches: true,
  status: "ACTIVE" as const,
};
const activeLogo = {
  archivedAt: null,
  kind: "LOGO" as const,
  ownerMatches: true,
  status: "ACTIVE" as const,
};
const primaryLocation = {
  city: "São Paulo",
  isPrimary: true,
  neighborhood: "Centro",
  number: "100",
  postalCode: "01001000",
  state: "SP",
  street: "Praça da Sé",
};
const creatorInput = {
  avatar: activeAvatar,
  bio: "Crio conteúdo autoral de tecnologia para marcas brasileiras.",
  city: "São Paulo",
  cover: activeCover,
  creatorType: "INFLUENCER",
  displayName: "Joana Cria",
  emailVerified: true,
  legalName: "Joana da Silva",
  metricSnapshots: [
    {
      engagementRate: 4.25,
      followerCount: 12_500,
      observedOn: "2026-07-24",
    },
  ],
  nicheSlugs: ["tecnologia"],
  role: "INFLUENCER",
  socialProfiles: [
    {
      archivedAt: null,
      normalizedUrl: "https://instagram.com/joanacria",
      platform: "INSTAGRAM",
    },
  ],
  state: "SP",
  whatsapp: "+5511999999999",
} satisfies CreatorProfileCompletionInput;
const companyInput = {
  additionalLocations: [
    {
      city: "Curitiba",
      isPrimary: false,
      neighborhood: "Centro",
      number: "120",
      postalCode: "80010000",
      state: "PR",
      street: "Rua das Flores",
    },
  ],
  cnpj: "11222333000181",
  cover: activeCover,
  description:
    "Empresa de tecnologia que conecta marcas e creators em todo o Brasil.",
  emailVerified: true,
  employeeRange: "11_TO_50",
  legalName: "Contente Company Ltda.",
  logo: activeLogo,
  primaryLocation,
  role: "COMPANY",
  segment: "Tecnologia",
  socialProfiles: [
    {
      archivedAt: null,
      normalizedUrl: "https://linkedin.com/company/contente-company",
      platform: "LINKEDIN",
    },
  ],
  tradeName: "Contente Company",
  websiteUrl: "https://contente.example.com",
  whatsapp: "+5511999999999",
} satisfies CompanyProfileCompletionInput;

describe("calculateProfileCompletion", () => {
  it("returns zero and every creator missing-field key for an empty profile", () => {
    const result = calculateProfileCompletion({
      role: "INFLUENCER",
    });

    expect(result).toEqual({
      completedWeight: 0,
      missingFields: [
        "verifiedEmail",
        "legalName",
        "displayName",
        "whatsapp",
        "creatorType",
        "location",
        "niches",
        "bio",
        "socialProfile",
        "metricSnapshot",
        "avatar",
        "cover",
      ],
      percentage: 0,
      totalWeight: 100,
      version: PROFILE_COMPLETION_VERSION,
    });
  });

  it("calculates required creator data separately from optional media", () => {
    const withoutMedia = calculateProfileCompletion({
      ...creatorInput,
      avatar: undefined,
      cover: undefined,
    });
    const withAvatar = calculateProfileCompletion({
      ...creatorInput,
      cover: undefined,
    });

    expect(withoutMedia.percentage).toBe(69);
    expect(withoutMedia.missingFields).toEqual(["avatar", "cover"]);
    expect(withAvatar.percentage).toBe(85);
    expect(withAvatar.missingFields).toEqual(["cover"]);
    expect(calculateProfileCompletion(creatorInput).percentage).toBe(100);
  });

  it("invalidates malformed creator location, social, metrics and media", () => {
    const result = calculateProfileCompletion({
      ...creatorInput,
      avatar: {
        ...activeAvatar,
        ownerMatches: false,
      },
      city: "S",
      cover: {
        ...activeCover,
        archivedAt: "2026-07-24T12:00:00.000Z",
        status: "ARCHIVED",
      },
      metricSnapshots: [
        {
          engagementRate: 101,
          followerCount: -1,
          observedOn: "not-a-date",
        },
      ],
      socialProfiles: [
        {
          archivedAt: null,
          normalizedUrl: "javascript:alert(1)",
          platform: "INSTAGRAM",
        },
      ],
      state: "S",
    });

    expect(result.percentage).toBe(48);
    expect(result.missingFields).toEqual([
      "location",
      "socialProfile",
      "metricSnapshot",
      "avatar",
      "cover",
    ]);
  });

  it("returns zero and every company missing-field key for an empty profile", () => {
    const result = calculateProfileCompletion({
      role: "COMPANY",
    });

    expect(result.percentage).toBe(0);
    expect(result.missingFields).toEqual([
      "verifiedEmail",
      "legalName",
      "tradeName",
      "cnpj",
      "employeeRange",
      "segment",
      "whatsapp",
      "description",
      "primaryLocation",
      "website",
      "socialProfile",
      "additionalLocation",
      "logo",
      "cover",
    ]);
  });

  it("calculates company locations, social profile and optional media independently", () => {
    const requiredOnly = calculateProfileCompletion({
      ...companyInput,
      additionalLocations: [],
      cover: undefined,
      logo: undefined,
      socialProfiles: [],
      websiteUrl: undefined,
    });

    expect(requiredOnly.percentage).toBe(61);
    expect(requiredOnly.missingFields).toEqual([
      "website",
      "socialProfile",
      "additionalLocation",
      "logo",
      "cover",
    ]);
    expect(calculateProfileCompletion(companyInput).percentage).toBe(100);
  });

  it("rejects incomplete locations, unsafe URLs and invalidated company media", () => {
    const result = calculateProfileCompletion({
      ...companyInput,
      additionalLocations: [
        {
          ...primaryLocation,
          city: "",
          isPrimary: false,
        },
      ],
      cover: {
        ...activeCover,
        kind: "AVATAR",
      },
      logo: {
        ...activeLogo,
        status: "PENDING",
      },
      primaryLocation: {
        ...primaryLocation,
        postalCode: "123",
      },
      socialProfiles: [
        {
          archivedAt: "2026-07-24T12:00:00.000Z",
          normalizedUrl: "https://linkedin.com/company/contente-company",
          platform: "LINKEDIN",
        },
      ],
      websiteUrl: "data:text/html,unsafe",
    });

    expect(result.missingFields).toEqual([
      "primaryLocation",
      "website",
      "socialProfile",
      "additionalLocation",
      "logo",
      "cover",
    ]);
    expect(result.percentage).toBe(51);
  });

  it("uses one immutable calculator version for creator, UGC and company results", () => {
    const influencer = calculateProfileCompletion(creatorInput);
    const ugc = calculateProfileCompletion({
      ...creatorInput,
      creatorType: "UGC",
    });
    const company = calculateProfileCompletion(companyInput);

    expect(influencer.version).toBe(PROFILE_COMPLETION_VERSION);
    expect(ugc.version).toBe(influencer.version);
    expect(company.version).toBe(influencer.version);
  });
});
