import "server-only";

import {
  createServerVerifiedAccountTransactionRunner,
  type VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import {
  directoryFiltersSchema,
  type DirectoryFiltersInput,
} from "../../schemas/catalog-directory.schema";
import type {
  CatalogViewer,
  DirectoryPageDto,
  DirectoryQuery,
} from "../../types/catalog-directory.types";
import { decodeDirectoryCursor } from "../repositories/catalog-directory-cursor";
import { listDirectoryPage } from "../repositories/drizzle-directory.repository";
import { authorizeCatalogViewer } from "../policies/catalog-access.policy";

interface CatalogDirectoryServiceDependencies {
  list(
    transaction: Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0],
    filters: DirectoryQuery,
    viewer: CatalogViewer,
  ): Promise<DirectoryPageDto>;
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

export function createCatalogDirectoryService({
  list,
  runVerifiedAccountTransaction,
}: CatalogDirectoryServiceDependencies) {
  return {
    async list(input: DirectoryFiltersInput, requestId: string) {
      const filters = directoryFiltersSchema.parse(input);
      const decodedCursor = decodeDirectoryCursor(filters.cursor);

      return runVerifiedAccountTransaction(
        { preferredRole: "NON_ADMIN", requestId },
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

export async function createServerCatalogDirectoryService() {
  return createCatalogDirectoryService({
    list: listDirectoryPage,
    runVerifiedAccountTransaction:
      await createServerVerifiedAccountTransactionRunner(),
  });
}
