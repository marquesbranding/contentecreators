import "server-only";

import {
  createServerVerifiedAccountTransactionRunner,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import {
  creatorCatalogFiltersSchema,
  type CreatorCatalogFiltersInput,
} from "../../schemas/creator-catalog.schema";
import type {
  CatalogViewer,
  CreatorCatalogPageDto,
  CreatorCatalogQuery,
} from "../../types/creator-catalog.types";
import { decodeCreatorCatalogCursor } from "../repositories/creator-catalog-cursor";
import { listCreatorCatalog } from "../repositories/drizzle-creator-catalog.repository";
import { authorizeCatalogViewer } from "../policies/catalog-access.policy";

interface CreatorCatalogServiceDependencies {
  list(
    transaction: Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0],
    filters: CreatorCatalogQuery,
    viewer: CatalogViewer,
  ): Promise<CreatorCatalogPageDto>;
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

export function createCreatorCatalogService({
  list,
  runVerifiedAccountTransaction,
}: CreatorCatalogServiceDependencies) {
  return {
    async list(input: CreatorCatalogFiltersInput, requestId: string) {
      const filters = creatorCatalogFiltersSchema.parse(input);
      const decodedCursor = decodeCreatorCatalogCursor(filters.cursor);

      return runVerifiedAccountTransaction(
        { requestId },
        (transaction, actor) => {
          const viewer = authorizeCatalogViewer({
            accountId: actor.accountId,
            archivedAt: null,
            role: actor.role,
            status: actor.status,
          });

          return list(
            transaction,
            {
              ...filters,
              cursor: decodedCursor,
            },
            viewer,
          );
        },
      );
    },
  };
}

export async function createServerCreatorCatalogService() {
  return createCreatorCatalogService({
    list: listCreatorCatalog,
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
