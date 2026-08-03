import "server-only";

import type { ApplicationTransaction } from "@/db/client";

export interface CompanyDetailRecord {
  city: string | null;
  companyId: string;
  coverAssetId: string | null;
  description: string | null;
  displayName: string;
  email: string;
  logoAssetId: string | null;
  media: {
    id: string;
    kind: "COVER" | "LOGO";
  }[];
  segment: string | null;
  state: string | null;
  websiteUrl: string | null;
  whatsappE164: string | null;
}

export type FindEligibleCompanyDetail = (
  transaction: ApplicationTransaction,
  companyId: string,
) => Promise<CompanyDetailRecord | null>;
