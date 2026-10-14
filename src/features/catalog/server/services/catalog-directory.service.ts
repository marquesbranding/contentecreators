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
import { directoryShuffleDay } from "../repositories/catalog-directory-shuffle";
import { listDirectoryPage } from "../repositories/drizzle-directory.repository";
import { authorizeCatalogViewer } from "../policies/catalog-access.policy";

interface CatalogDirectoryServiceDependencies {
  list(
    transaction: Parameters<Parameters<VerifiedAccountTransactionRunner>[1]>[0],
    filters: DirectoryQuery,
    viewer: CatalogViewer,
  ): Promise<DirectoryPageDto>;
  /** Clock for the daily shuffle day; injectable for tests. */
  now?(): Date;
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

export function createCatalogDirectoryService({
  list,
  now = () => new Date(),
  runVerifiedAccountTransaction,
}: CatalogDirectoryServiceDependencies) {
  return {
    async list(input: DirectoryFiltersInput, requestId: string) {
      const filters = directoryFiltersSchema.parse(input);
      // A legacy (pre-shuffle) cursor decodes to null → first page; a valid v2
      // cursor pins the shuffle day it was issued for, so crossing midnight
      // mid-pagination never repeats or skips a profile.
      const decodedCursor = decodeDirectoryCursor(filters.cursor);
      const seed = decodedCursor?.seed ?? directoryShuffleDay(now());

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
              seed,
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
