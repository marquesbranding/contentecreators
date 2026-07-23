import { describe, expect, it } from "vitest";

import {
  buildAccount,
  buildAuditRevision,
  buildAuthIdentity,
  buildCompanyProfile,
  buildConsent,
  buildCreatorProfile,
  buildModerationEvent,
  buildSponsorshipPlacement,
} from "@/test/builders/business-builders";

describe("synthetic business builders", () => {
  it("creates deterministic, overrideable identity/account fixtures", () => {
    const identity = buildAuthIdentity();
    const account = buildAccount({
      authUserId: identity.id,
      role: "COMPANY",
      status: "CHANGES_REQUESTED",
    });

    expect(identity.email).toBe("creator@example.test");
    expect(account).toMatchObject({
      authUserId: identity.id,
      role: "COMPANY",
      status: "CHANGES_REQUESTED",
    });
  });

  it("covers each business aggregate without production data", () => {
    expect(buildCreatorProfile()).toMatchObject({
      creatorType: "INFLUENCER",
      displayName: "Creator de Teste",
    });
    expect(buildCompanyProfile()).toMatchObject({
      tradeName: "Empresa de Teste",
    });
    expect(buildSponsorshipPlacement()).toMatchObject({
      audience: "ALL",
      status: "DRAFT",
    });
    expect(buildModerationEvent()).toMatchObject({
      fromStatus: "ONBOARDING",
      toStatus: "PENDING_REVIEW",
    });
    expect(buildConsent()).toMatchObject({
      documentType: "PRIVACY",
      granted: true,
    });
    expect(buildAuditRevision()).toMatchObject({
      actorType: "USER",
      source: "APPLICATION",
    });
  });
});
