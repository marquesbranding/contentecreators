import { describe, expect, it } from "vitest";

import type { CurrentAccountDto } from "@/features/identity/server";

import type { CatalogCreatorDetailRecord } from "../repositories/catalog-detail.repository";
import { mapCatalogCreatorDetail } from "./catalog-detail.mapper";

const creatorId = "20000000-0000-4000-8000-000000000002";
const baseRecord: CatalogCreatorDetailRecord = {
  avatarAssetId: "30000000-0000-4000-8000-000000000003",
  bio: "Creator de tecnologia e educação com produção multiplataforma.",
  city: "São Paulo",
  contact: {
    consentIsActive: true,
    email: "creator@example.test",
    emailVisible: true,
    socialVisible: true,
    whatsappE164: "+5511999999999",
    whatsappVisible: true,
  },
  coverAssetId: "40000000-0000-4000-8000-000000000004",
  creatorId,
  creatorType: "INFLUENCER",
  displayName: "Creator Sintética",
  media: [
    {
      id: "30000000-0000-4000-8000-000000000003",
      kind: "AVATAR",
    },
    {
      id: "40000000-0000-4000-8000-000000000004",
      kind: "COVER",
    },
  ],
  metrics: [
    {
      engagementRate: "4.2500",
      followerCount: 45000,
      observedOn: new Date("2026-07-20T00:00:00.000Z"),
      platform: "INSTAGRAM",
      source: "SELF_REPORTED",
    },
    {
      engagementRate: "3.5000",
      followerCount: 12000,
      observedOn: new Date("2026-06-20T00:00:00.000Z"),
      platform: "INSTAGRAM",
      source: "SELF_REPORTED",
    },
  ],
  niches: [
    { name: "Tecnologia", slug: "tecnologia" },
    { name: "Educação", slug: "educacao" },
  ],
  socialProfiles: [
    {
      handle: "@creator",
      normalizedUrl: "https://instagram.com/creator",
      platform: "INSTAGRAM",
    },
  ],
  state: "SP",
};

const companyViewer: CurrentAccountDto = {
  id: "50000000-0000-4000-8000-000000000005",
  role: "COMPANY",
  status: "APPROVED",
};

describe("catalog detail mapper", () => {
  it("maps the minimal presentation DTO and only the latest self-reported metric", () => {
    const result = mapCatalogCreatorDetail(baseRecord, {
      ...companyViewer,
      role: "INFLUENCER",
    });

    expect(result).toMatchObject({
      bio: baseRecord.bio,
      creatorId,
      creatorType: "INFLUENCER",
      displayName: "Creator Sintética",
      location: { city: "São Paulo", state: "SP" },
      media: {
        avatar: {
          assetId: "30000000-0000-4000-8000-000000000003",
          kind: "AVATAR",
        },
        cover: {
          assetId: "40000000-0000-4000-8000-000000000004",
          kind: "COVER",
        },
      },
      metrics: [
        {
          engagementRate: 4.25,
          followerCount: 45000,
          observedOn: "2026-07-20",
          platform: "INSTAGRAM",
          source: "SELF_REPORTED",
        },
      ],
      niches: [
        { name: "Tecnologia", slug: "tecnologia" },
        { name: "Educação", slug: "educacao" },
      ],
      socialProfiles: [{ handle: "@creator", platform: "INSTAGRAM" }],
    });
    expect(result.contact).toEqual({
      reason: "VIEWER_NOT_COMPANY",
      status: "UNAVAILABLE",
    });
    expect(JSON.stringify(result)).not.toMatch(
      /operationalEmail|whatsappE164|accountId|moderation|audit|blocked|consent/i,
    );
    expect(JSON.stringify(result)).not.toContain("creator@example.test");
    expect(JSON.stringify(result)).not.toContain("+5511999999999");
  });

  it("maps safe contact actions only for an approved company with active consent", () => {
    const result = mapCatalogCreatorDetail(baseRecord, companyViewer);

    expect(result.contact).toEqual({
      email: {
        href: "mailto:creator@example.test",
      },
      social: [
        {
          href: "https://instagram.com/creator",
          platform: "INSTAGRAM",
        },
      ],
      status: "AVAILABLE",
      whatsapp: {
        href: "https://wa.me/5511999999999",
      },
    });
  });

  it("returns an explanatory unavailable state without contact data when consent is absent", () => {
    const result = mapCatalogCreatorDetail(
      {
        ...baseRecord,
        contact: {
          consentIsActive: false,
          email: "creator@example.test",
          emailVisible: true,
          socialVisible: true,
          whatsappE164: "+5511999999999",
          whatsappVisible: true,
        },
      },
      companyViewer,
    );

    expect(result.contact).toEqual({
      reason: "CONSENT_NOT_GRANTED",
      status: "UNAVAILABLE",
    });
    expect(JSON.stringify(result.contact)).not.toMatch(
      /creator@example|5511999999999|instagram.com/u,
    );
  });

  it("drops unsafe or missing channels and reports when none remain", () => {
    const result = mapCatalogCreatorDetail(
      {
        ...baseRecord,
        contact: {
          consentIsActive: true,
          email: "not-an-email",
          emailVisible: true,
          socialVisible: true,
          whatsappE164: "invalid",
          whatsappVisible: true,
        },
        socialProfiles: [
          {
            handle: "@unsafe",
            normalizedUrl: "javascript:alert(1)",
            platform: "OTHER",
          },
        ],
      },
      companyViewer,
    );

    expect(result.contact).toEqual({
      reason: "NO_CONTACT_CHANNELS",
      status: "UNAVAILABLE",
    });
  });

  it("does not expose social URLs containing embedded credentials", () => {
    const result = mapCatalogCreatorDetail(
      {
        ...baseRecord,
        contact: {
          consentIsActive: true,
          email: null,
          emailVisible: false,
          socialVisible: true,
          whatsappE164: null,
          whatsappVisible: false,
        },
        socialProfiles: [
          {
            handle: "@unsafe",
            normalizedUrl: "https://user:password@example.test/private",
            platform: "OTHER",
          },
        ],
      },
      companyViewer,
    );

    expect(result.contact).toEqual({
      reason: "NO_CONTACT_CHANNELS",
      status: "UNAVAILABLE",
    });
    expect(JSON.stringify(result)).not.toMatch(/user|password|private/u);
  });
});
