import "server-only";

import type { VerifiedAccountTransactionRunner } from "@/features/identity/server";

import {
  catalogDetailQuerySchema,
  type CatalogDetailQuery,
} from "../../schemas/catalog-detail.schema";
import { mapCatalogCreatorDetail } from "../mappers/catalog-detail.mapper";
import { authorizeCatalogViewer } from "../policies/catalog-access.policy";
import type { FindEligibleCatalogCreator } from "../repositories/catalog-detail.repository";

interface CatalogDetailServiceDependencies {
  findEligibleCreator: FindEligibleCatalogCreator;
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

export function createCatalogDetailService({
  findEligibleCreator,
  runVerifiedAccountTransaction,
}: CatalogDetailServiceDependencies) {
  return {
    async load(input: CatalogDetailQuery) {
      const query = catalogDetailQuerySchema.parse(input);

      return runVerifiedAccountTransaction(
        { preferredRole: "NON_ADMIN", requestId: query.requestId },
        async (transaction, context) => {
          const viewer = authorizeCatalogViewer({
            accountId: context.accountId,
            archivedAt: null,
            role: context.role,
            status: context.status,
          });
          const record = await findEligibleCreator(
            transaction,
            query.creatorId,
            viewer,
          );

          return record
            ? mapCatalogCreatorDetail(record, {
                id: viewer.accountId,
                role: viewer.role,
                status: "APPROVED",
              })
            : null;
        },
      );
    },
  };
}
