import "server-only";

import { cache } from "react";

import { getDatabaseClient } from "@/db/client";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";

import type {
  CurrentAccountDto,
  CurrentSessionDto,
} from "../../types/current-account.types";
import { toCurrentAccountDto } from "../mappers/current-account.mapper";
import {
  createSupabaseVerifiedAuthUserIdResolver,
  createVerifiedAccountTransactionRunner,
  VerifiedAccountTransactionError,
  type VerifiedAccountTransactionRunner,
} from "../services/verified-account-transaction";

interface CurrentAccountDalDependencies {
  runVerifiedAccountTransaction: VerifiedAccountTransactionRunner;
}

export function createCurrentAccountDal({
  runVerifiedAccountTransaction,
}: CurrentAccountDalDependencies) {
  return {
    async resolveCurrentSession({
      requestId,
    }: {
      requestId: string;
    }): Promise<CurrentSessionDto> {
      try {
        const account = await runVerifiedAccountTransaction(
          { requestId },
          async (_transaction, context) => toCurrentAccountDto(context),
        );

        return {
          account,
          kind: "authenticated",
        };
      } catch (error) {
        if (error instanceof VerifiedAccountTransactionError) {
          return error.code === "UNAUTHENTICATED"
            ? {
                account: null,
                kind: "anonymous",
              }
            : {
                account: null,
                kind: "authenticated",
              };
        }

        throw error;
      }
    },
  };
}

async function createServerCurrentAccountDal() {
  const client = await createServerSupabaseClient();

  return createCurrentAccountDal({
    runVerifiedAccountTransaction: createVerifiedAccountTransactionRunner({
      database: getDatabaseClient().database,
      resolveVerifiedAuthUserId:
        createSupabaseVerifiedAuthUserIdResolver(client),
    }),
  });
}

export async function resolveFreshServerCurrentSession(
  requestId: string,
): Promise<CurrentSessionDto> {
  const dal = await createServerCurrentAccountDal();

  return dal.resolveCurrentSession({ requestId });
}

async function resolveServerCurrentSession(): Promise<CurrentSessionDto> {
  return resolveFreshServerCurrentSession(crypto.randomUUID());
}

/**
 * Server Component-only request snapshot. React invalidates this cache for
 * every server request; mutations must resolve authorization again.
 */
export const getServerCurrentSession = cache(resolveServerCurrentSession);

/**
 * Returns only the account fields required to choose a protected experience.
 * It intentionally omits the Supabase user ID, email and database row fields.
 */
export const getServerCurrentAccount = cache(
  async (): Promise<CurrentAccountDto | null> => {
    const session = await getServerCurrentSession();

    return session.account;
  },
);
