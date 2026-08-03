import "server-only";

import {
  requireApproved,
  requireRole,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import {
  companyDetailQuerySchema,
  type CompanyDetailQuery,
} from "../../schemas/company-detail.schema";
import type { CompanyDetailDto } from "../../types/company-detail.types";
import type {
  CompanyDetailRecord,
  FindEligibleCompanyDetail,
} from "../repositories/company-detail.repository";

const whatsappPattern = /^\+?[1-9]\d{7,14}$/u;

function mapCompanyDetail(record: CompanyDetailRecord): CompanyDetailDto {
  const logoIsActive = record.media.some(
    (media) => media.id === record.logoAssetId && media.kind === "LOGO",
  );
  const coverIsActive = record.media.some(
    (media) => media.id === record.coverAssetId && media.kind === "COVER",
  );
  const whatsapp =
    record.whatsappE164 && whatsappPattern.test(record.whatsappE164)
      ? {
          href: `https://wa.me/${record.whatsappE164.replace(/\D/gu, "")}`,
        }
      : null;

  return {
    companyId: record.companyId,
    contact: {
      email: { href: `mailto:${record.email}` },
      site: record.websiteUrl ? { href: record.websiteUrl } : null,
      whatsapp,
    },
    description: record.description,
    displayName: record.displayName,
    location:
      record.city && record.state
        ? {
            city: record.city,
            state: record.state,
          }
        : null,
    media: {
      cover:
        record.coverAssetId && coverIsActive
          ? {
              assetId: record.coverAssetId,
              kind: "COVER",
            }
          : null,
      logo:
        record.logoAssetId && logoIsActive
          ? {
              assetId: record.logoAssetId,
              kind: "LOGO",
            }
          : null,
    },
    segment: record.segment,
  };
}

interface CompanyDetailServiceDependencies {
  findEligibleCompany: FindEligibleCompanyDetail;
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

export function createCompanyDetailService({
  findEligibleCompany,
  runVerifiedAccountTransaction,
}: CompanyDetailServiceDependencies) {
  return {
    async load(input: CompanyDetailQuery): Promise<CompanyDetailDto | null> {
      const query = companyDetailQuerySchema.parse(input);

      return runVerifiedAccountTransaction(
        { requestId: query.requestId },
        async (transaction, viewer) => {
          const account = {
            id: viewer.accountId,
            role: viewer.role,
            status: viewer.status,
          };

          requireRole(account, ["INFLUENCER"]);
          requireApproved(account);

          const record = await findEligibleCompany(
            transaction,
            query.companyId,
          );

          return record ? mapCompanyDetail(record) : null;
        },
      );
    },
  };
}
