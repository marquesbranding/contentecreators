import "server-only";

import { and, eq, isNull, or, ne, sql } from "drizzle-orm";
import { getDatabaseClient, type ApplicationDatabase } from "@/db/client";
import { createAuditedTransactionRunner } from "@/features/audit/server";
import { accounts } from "@/db/schema";

export type RegistrationIdentityAvailability =
  | { status: "available" | "unconfirmed" | "blocked" }
  | {
      status: "registered";
      providers: ("email" | "google")[];
      hasPassword: boolean;
    };

export function createRegistrationIdentityRepository(
  database: ApplicationDatabase = getDatabaseClient().database,
) {
  return {
    async lookup(email: string): Promise<RegistrationIdentityAvailability> {
      const rows = await database.execute<{
        blocked: boolean;
        confirmed: boolean;
        has_password: boolean;
        providers: string[];
        id: string | null;
      }>(sql`
        select exists(select 1 from public.blocked_identities b
          where b.identity_key_hash = encode(extensions.digest(lower(trim(${email})), 'sha256'), 'hex')
          and b.unblocked_at is null and b.archived_at is null) as blocked,
          u.id, u.email_confirmed_at is not null as confirmed,
          coalesce(length(u.encrypted_password), 0) > 0
            and coalesce(u.raw_user_meta_data->>'registration_password_pending', 'false') <> 'true' as has_password,
          array(select i.provider from auth.identities i where i.user_id = u.id) as providers
        from (select 1) seed left join auth.users u on lower(u.email) = lower(${email}) limit 1
      `);
      const row = rows[0];
      if (row?.blocked) return { status: "blocked" };
      if (!row?.id) return { status: "available" };
      if (!row.confirmed) return { status: "unconfirmed" };
      return {
        status: "registered",
        hasPassword: row.has_password,
        providers: row.providers.filter(
          (provider): provider is "email" | "google" =>
            provider === "email" || provider === "google",
        ),
      };
    },
    async ensure(identityId: string, email: string, fullName?: string) {
      return createAuditedTransactionRunner(database)(
        {
          actorAccountId: null,
          actorRole: null,
          actorType: "SYSTEM",
          reason: "Create verified onboarding account",
          requestId: crypto.randomUUID(),
          source: "AUTH_HOOK",
        },
        async (transaction) => {
          await transaction.execute(
            sql`select pg_advisory_xact_lock(hashtextextended(${identityId}, 0))`,
          );
          const [existing] = await transaction
            .select()
            .from(accounts)
            .where(
              and(
                eq(accounts.authUserId, identityId),
                or(isNull(accounts.role), ne(accounts.role, "ADMIN")),
              ),
            )
            .limit(1);
          if (existing) return existing;
          const [created] = await transaction
            .insert(accounts)
            .values({
              authUserId: identityId,
              operationalEmail: email.trim().toLowerCase(),
              fullName:
                typeof fullName === "string"
                  ? fullName.trim().slice(0, 160) || null
                  : null,
            })
            .returning();
          return created;
        },
      );
    },
  };
}
