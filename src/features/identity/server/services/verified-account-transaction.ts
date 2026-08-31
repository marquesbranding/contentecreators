import "server-only";

import { and, eq, isNull, ne, sql } from "drizzle-orm";

import {
  getDatabaseClient,
  type ApplicationDatabase,
  type ApplicationTransaction,
} from "@/db/client";
import { accounts, type Account } from "@/db/schema";
import { createServerSupabaseClient } from "@/shared/server/supabase/server-client";

type VerifiedAccountRole = NonNullable<Account["role"]>;

export interface VerifiedAccountContext {
  accountId: string;
  authUserId: string;
  role: VerifiedAccountRole;
  status: Account["status"];
}

export type VerifiedAccountTransactionErrorCode =
  "ACCOUNT_NOT_READY" | "UNAUTHENTICATED";

export class VerifiedAccountTransactionError extends Error {
  constructor(readonly code: VerifiedAccountTransactionErrorCode) {
    super(code);
    this.name = "VerifiedAccountTransactionError";
  }
}

type VerifiedAuthUserIdResolver = () => Promise<string | null>;

interface VerifiedAccountTransactionDependencies {
  database: ApplicationDatabase;
  resolveVerifiedAuthUserId: VerifiedAuthUserIdResolver;
}

interface VerifiedUserClient {
  auth: {
    getUser(): Promise<{
      data: {
        user: { id: string } | null;
      };
      error: unknown;
    }>;
  };
}

export function createSupabaseVerifiedAuthUserIdResolver(
  client: VerifiedUserClient,
): VerifiedAuthUserIdResolver {
  return async () => {
    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    return error || !user ? null : user.id;
  };
}

/**
 * An identity can now own an ADMIN row and a linked INFLUENCER/COMPANY row at
 * once. Most callers don't care which one they get (there's only ever one row
 * for the vast majority of accounts), so this stays optional and defaults to
 * preferring ADMIN — a superset of the historical single-row behavior. Only
 * callers that must resolve the caller's own creator/company identity (the
 * app surface, not the backoffice) need to pass "NON_ADMIN" explicitly.
 */
export type AccountRolePreference = "ADMIN" | "NON_ADMIN";

export function createVerifiedAccountTransactionRunner({
  database,
  resolveVerifiedAuthUserId,
}: VerifiedAccountTransactionDependencies) {
  return async function runVerifiedAccountTransaction<T>(
    {
      preferredRole,
      requestId,
    }: { preferredRole?: AccountRolePreference; requestId: string },
    work: (
      transaction: ApplicationTransaction,
      accountContext: VerifiedAccountContext,
    ) => Promise<T>,
  ): Promise<T> {
    const authUserId = await resolveVerifiedAuthUserId();

    if (!authUserId) {
      throw new VerifiedAccountTransactionError("UNAUTHENTICATED");
    }

    return database.transaction(async (transaction) => {
      const roleFilter =
        preferredRole === "ADMIN"
          ? eq(accounts.role, "ADMIN")
          : preferredRole === "NON_ADMIN"
            ? ne(accounts.role, "ADMIN")
            : undefined;

      const [account] = await transaction
        .select({
          id: accounts.id,
          role: accounts.role,
          status: accounts.status,
        })
        .from(accounts)
        .where(
          and(
            eq(accounts.authUserId, authUserId),
            isNull(accounts.archivedAt),
            roleFilter,
          ),
        )
        .orderBy(sql`case when ${accounts.role} = 'ADMIN' then 0 else 1 end`)
        .limit(1);

      if (!account?.role) {
        throw new VerifiedAccountTransactionError("ACCOUNT_NOT_READY");
      }

      const accountContext: VerifiedAccountContext = {
        accountId: account.id,
        authUserId,
        role: account.role,
        status: account.status,
      };

      await transaction.execute(sql`
        select
          set_config('app.jwt.auth_user_id', ${accountContext.authUserId}, true),
          set_config('app.jwt.account_id', ${accountContext.accountId}, true),
          set_config('app.jwt.account_role', ${accountContext.role}, true),
          set_config('app.jwt.account_status', ${accountContext.status}, true),
          set_config('app.jwt.request_id', ${requestId}, true)
      `);
      await transaction.execute(sql.raw("set local role contente_app_user"));

      return work(transaction, accountContext);
    });
  };
}

export type VerifiedAccountTransactionRunner = ReturnType<
  typeof createVerifiedAccountTransactionRunner
>;

export async function createServerVerifiedAccountTransactionRunner() {
  const client = await createServerSupabaseClient();

  return createVerifiedAccountTransactionRunner({
    database: getDatabaseClient().database,
    resolveVerifiedAuthUserId: createSupabaseVerifiedAuthUserIdResolver(client),
  });
}
