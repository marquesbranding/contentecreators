import "server-only";

import {
  createServerVerifiedAccountTransactionRunner,
  requireApproved,
  requireRole,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import {
  companyCarouselResponseSchema,
  parseCompanyCarouselLimit,
  parseCompanyCarouselSearch,
  parseCompanyCarouselSegment,
} from "../../schemas/company-carousel.schema";
import type {
  CompanyCarouselRequest,
  CompanyCarouselResponseDto,
} from "../../types/company-carousel.types";
import {
  type CompanyCarouselRepository,
  listEligibleCarouselCompanies,
} from "../repositories/company-carousel.repository";

interface CompanyCarouselServiceDependencies {
  repository: CompanyCarouselRepository;
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

export function createCompanyCarouselService({
  repository,
  runVerifiedAccountTransaction,
}: CompanyCarouselServiceDependencies) {
  return {
    list(
      input: CompanyCarouselRequest,
      requestId: string,
    ): Promise<CompanyCarouselResponseDto> {
      const limit = parseCompanyCarouselLimit(input.limit);
      const search = parseCompanyCarouselSearch(input.search);
      const segment = parseCompanyCarouselSegment(input.segment);

      return runVerifiedAccountTransaction(
        { requestId },
        async (transaction, viewer) => {
          const account = {
            id: viewer.accountId,
            role: viewer.role,
            status: viewer.status,
          };

          requireRole(account, ["INFLUENCER"]);
          requireApproved(account);

          const items = await repository.listEligibleCompanies(
            transaction,
            limit,
            { search, segment },
          );

          return companyCarouselResponseSchema.parse({ items, limit });
        },
      );
    },
  };
}

export async function createServerCompanyCarouselService() {
  return createCompanyCarouselService({
    repository: {
      listEligibleCompanies: listEligibleCarouselCompanies,
    },
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
