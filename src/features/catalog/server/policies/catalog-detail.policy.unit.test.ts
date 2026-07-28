import { describe, expect, it } from "vitest";

import type { CurrentAccountDto } from "@/features/identity/server";

import { getCatalogContactAccess } from "./catalog-detail.policy";

const approvedCompany: CurrentAccountDto = {
  id: "10000000-0000-4000-8000-000000000001",
  role: "COMPANY",
  status: "APPROVED",
};

describe("catalog detail policy", () => {
  it("never enables private contact for influencer viewers", () => {
    expect(
      getCatalogContactAccess(
        { ...approvedCompany, role: "INFLUENCER" },
        {
          consentIsActive: true,
          emailVisible: true,
          socialVisible: true,
          whatsappVisible: true,
        },
      ),
    ).toEqual({
      reason: "VIEWER_NOT_COMPANY",
      status: "UNAVAILABLE",
    });
  });

  it("requires a current contact-visibility consent for companies", () => {
    expect(
      getCatalogContactAccess(approvedCompany, {
        consentIsActive: false,
        emailVisible: true,
        socialVisible: true,
        whatsappVisible: true,
      }),
    ).toEqual({
      reason: "CONSENT_NOT_GRANTED",
      status: "UNAVAILABLE",
    });
  });

  it("returns only the channels individually enabled by active consent", () => {
    expect(
      getCatalogContactAccess(approvedCompany, {
        consentIsActive: true,
        emailVisible: true,
        socialVisible: false,
        whatsappVisible: true,
      }),
    ).toEqual({
      emailVisible: true,
      socialVisible: false,
      status: "AVAILABLE",
      whatsappVisible: true,
    });
  });
});
