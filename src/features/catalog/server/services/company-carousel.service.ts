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
  listCompanySegmentFacets,
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
        { preferredRole: "NON_ADMIN", requestId },
        async (transaction, viewer) => {
          const account = {
            id: viewer.accountId,
            role: viewer.role,
            status: viewer.status,
          };

          requireRole(account, ["INFLUENCER"]);
          requireApproved(account);

          const [items, segments] = await Promise.all([
            repository.listEligibleCompanies(transaction, limit, {
              search,
              segment,
            }),
            repository.listCompanySegmentFacets(transaction),
          ]);

          return companyCarouselResponseSchema.parse({
            facets: { segments },
            items,
            limit,
          });
        },
      );
    },
  };
}

export async function createServerCompanyCarouselService() {
  return createCompanyCarouselService({
    repository: {
      listCompanySegmentFacets,
      listEligibleCompanies: listEligibleCarouselCompanies,
    },
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
