import "server-only";

import type { CurrentAccountDto } from "@/features/identity/server";

export interface CatalogContactConsentState {
  consentIsActive: boolean;
  emailVisible: boolean;
  socialVisible: boolean;
  whatsappVisible: boolean;
}

export type CatalogContactAccess =
  | {
      reason: "CONSENT_NOT_GRANTED" | "VIEWER_NOT_COMPANY";
      status: "UNAVAILABLE";
    }
  | {
      emailVisible: boolean;
      socialVisible: boolean;
      status: "AVAILABLE";
      whatsappVisible: boolean;
    };

export function getCatalogContactAccess(
  viewer: CurrentAccountDto,
  consent: CatalogContactConsentState | null,
): CatalogContactAccess {
  if (viewer.role !== "COMPANY") {
    return {
      reason: "VIEWER_NOT_COMPANY",
      status: "UNAVAILABLE",
    };
  }

  if (!consent?.consentIsActive) {
    return {
      reason: "CONSENT_NOT_GRANTED",
      status: "UNAVAILABLE",
    };
  }

  return {
    emailVisible: consent.emailVisible,
    socialVisible: consent.socialVisible,
    status: "AVAILABLE",
    whatsappVisible: consent.whatsappVisible,
  };
}
