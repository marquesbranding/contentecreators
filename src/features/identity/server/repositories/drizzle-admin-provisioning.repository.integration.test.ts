import { and, eq, ne, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { accounts, auditRevisions } from "@/db/schema";
import { applyVerifiedAuditContext } from "@/features/audit/server";
import type {
  VerifiedAccountContext,
  VerifiedAccountTransactionRunner,
} from "@/features/identity/server";

import { createDrizzleAdminProvisioningRepository } from "./drizzle-admin-provisioning.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const drizzleClient = createDatabaseClient(databaseUrl);
const seedAdmin = {
  accountId: "a0000000-0000-4000-8000-000000000001",
  authUserId: "10000000-0000-4000-8000-000000000001",
  email: "admin@contentecreators.test",
};
const targetIdentity = {
  email: "admin-second@contentecreators.test",
  id: "21000000-0000-4000-8000-000000000009",
};
const targetAccountId = "b1000000-0000-4000-8000-000000000009";
const rollback = new Error("rollback admin provisioning repository");

describeLocalStack("Drizzle admin provisioning repository", () => {
  afterAll(async () => {
    await drizzleClient.client.end({ timeout: 2 });
  });

  it("bootstraps the first admin idempotently with a system audit revision", async () => {
    let result:
      | {
          account: {
            completionPercentage: number;
            role: string | null;
            status: string;
          };
          auditRows: {
            actorType: string;
            operation: string;
            reason: string | null;
            source: string;
          }[];
          first: {
            accountId: string;
            kind: string;
          };
          repeated: {
            accountId: string;
            kind: string;
          };
        }
      | undefined;

    try {
      await drizzleClient.database.transaction(async (transaction) => {
        await applyVerifiedAuditContext(transaction, {
          actorAccountId: null,
          actorRole: null,
          actorType: "SYSTEM",
          reason: "Synthetic rollback-only bootstrap setup",
          requestId: "admin-bootstrap-setup",
          source: "SCRIPT",
        });
        await transaction
          .update(accounts)
          .set({ archivedAt: new Date() })
          .where(
            and(
              eq(accounts.role, "ADMIN"),
              ne(accounts.id, seedAdmin.accountId),
            ),
          );
        await transaction
          .update(accounts)
          .set({
            approvedAt: null,
            completionPercentage: 0,
            role: null,
            status: "ONBOARDING",
          })
          .where(eq(accounts.id, seedAdmin.accountId));

        const repository = createDrizzleAdminProvisioningRepository({
          database: transaction,
          runBootstrapTransaction: async (context, work) => {
            await applyVerifiedAuditContext(transaction, context);
            return work(transaction);
          },
        });

        await expect(
          repository.findIdentityByEmail(` ${seedAdmin.email.toUpperCase()} `),
        ).resolves.toEqual({
          email: seedAdmin.email,
          id: seedAdmin.authUserId,
        });
        await expect(
          repository.inspectInitialAdmin(seedAdmin.authUserId),
        ).resolves.toEqual({ kind: "available" });

        const input = {
          approvalReference: "CLIENTE-ADMIN-2026-01",
          email: seedAdmin.email,
          identityId: seedAdmin.authUserId,
          requestId: "admin-bootstrap-integration",
        };
        const first = await repository.bootstrapInitialAdmin(input);
        const repeated = await repository.bootstrapInitialAdmin(input);

        if (first.kind === "rejected" || repeated.kind === "rejected") {
          throw new Error("Expected idempotent initial admin provisioning.");
        }

        const [account] = await transaction
          .select({
            completionPercentage: accounts.completionPercentage,
            role: accounts.role,
            status: accounts.status,
          })
          .from(accounts)
          .where(eq(accounts.id, seedAdmin.accountId));
        const auditRows = await transaction
          .select({
            actorType: auditRevisions.actorType,
            operation: auditRevisions.operation,
            reason: auditRevisions.reason,
            source: auditRevisions.source,
          })
          .from(auditRevisions)
          .where(eq(auditRevisions.requestId, "admin-bootstrap-integration"));

        result = {
          account: account!,
          auditRows,
          first,
          repeated,
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(result).toEqual({
      account: {
        completionPercentage: 100,
        role: "ADMIN",
        status: "APPROVED",
      },
      auditRows: [
        {
          actorType: "SYSTEM",
          operation: "UPDATE",
          reason: "Initial administrator bootstrap: CLIENTE-ADMIN-2026-01",
          source: "SCRIPT",
        },
      ],
      first: {
        accountId: seedAdmin.accountId,
        kind: "provisioned",
      },
      repeated: {
        accountId: seedAdmin.accountId,
        kind: "already_provisioned",
      },
    });
  });

  it("bootstraps an approved production admin when another admin already exists", async () => {
    let result:
      | {
          account: {
            authUserId: string;
            role: string | null;
            status: string;
          };
          auditRows: {
            actorType: string;
            operation: string;
            reason: string | null;
            source: string;
          }[];
          first: {
            accountId: string;
            kind: string;
          };
          repeated: {
            accountId: string;
            kind: string;
          };
        }
      | undefined;

    try {
      await drizzleClient.database.transaction(async (transaction) => {
        await transaction.execute(sql`
          insert into auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change
          )
          values (
            '00000000-0000-4000-8000-000000000000',
            ${targetIdentity.id},
            'authenticated',
            'authenticated',
            ${targetIdentity.email},
            extensions.crypt('LocalTest123!', extensions.gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"fixture":true}'::jsonb,
            now(),
            now(),
            '',
            '',
            '',
            ''
          )
        `);
        await applyVerifiedAuditContext(transaction, {
          actorAccountId: null,
          actorRole: null,
          actorType: "SYSTEM",
          reason: "Synthetic production admin promotion setup",
          requestId: "admin-production-setup",
          source: "SCRIPT",
        });
        await transaction.insert(accounts).values({
          approvedAt: new Date(),
          authUserId: targetIdentity.id,
          completionPercentage: 100,
          id: targetAccountId,
          operationalEmail: targetIdentity.email,
          role: "INFLUENCER",
          status: "APPROVED",
          submittedAt: new Date(),
        });
        const repository = createDrizzleAdminProvisioningRepository({
          database: transaction,
          runBootstrapTransaction: async (context, work) => {
            await applyVerifiedAuditContext(transaction, context);
            return work(transaction);
          },
        });
        const input = {
          allowExistingAdmins: true,
          approvalReference: "CLIENTE-ADMIN-PRODUCTION-2026-07-31",
          email: targetIdentity.email,
          identityId: targetIdentity.id,
          requestId: "admin-production-integration",
        };
        const first = await repository.bootstrapInitialAdmin(input);
        const repeated = await repository.bootstrapInitialAdmin(input);

        if (first.kind === "rejected" || repeated.kind === "rejected") {
          throw new Error(
            "Expected idempotent approved production admin provisioning.",
          );
        }

        const [account] = await transaction
          .select({
            authUserId: accounts.authUserId,
            role: accounts.role,
            status: accounts.status,
          })
          .from(accounts)
          .where(eq(accounts.authUserId, targetIdentity.id));
        const auditRows = await transaction
          .select({
            actorType: auditRevisions.actorType,
            operation: auditRevisions.operation,
            reason: auditRevisions.reason,
            source: auditRevisions.source,
          })
          .from(auditRevisions)
          .where(eq(auditRevisions.requestId, "admin-production-integration"));

        result = {
          account: account!,
          auditRows,
          first,
          repeated,
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(result).toEqual({
      account: {
        authUserId: targetIdentity.id,
        role: "ADMIN",
        status: "APPROVED",
      },
      auditRows: [
        {
          actorType: "SYSTEM",
          operation: "UPDATE",
          reason:
            "Approved production administrator bootstrap: CLIENTE-ADMIN-PRODUCTION-2026-07-31",
          source: "SCRIPT",
        },
      ],
      first: {
        accountId: expect.any(String),
        kind: "provisioned",
      },
      repeated: {
        accountId: expect.any(String),
        kind: "already_provisioned",
      },
    });
    expect(result?.first.accountId).toBe(result?.repeated.accountId);
  });

  it("lets a verified admin provision another identity once with attributed audit", async () => {
    let result:
      | {
          account: {
            authUserId: string;
            role: string | null;
            status: string;
          };
          auditRows: {
            actorAccountId: string | null;
            actorType: string;
            operation: string;
            reason: string | null;
            source: string;
          }[];
          first: {
            accountId: string;
            kind: string;
          };
          repeated: {
            accountId: string;
            kind: string;
          };
        }
      | undefined;

    try {
      await drizzleClient.database.transaction(async (transaction) => {
        await transaction.execute(sql`
          insert into auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change
          )
          values (
            '00000000-0000-4000-8000-000000000000',
            ${targetIdentity.id},
            'authenticated',
            'authenticated',
            ${targetIdentity.email},
            extensions.crypt('LocalTest123!', extensions.gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"fixture":true}'::jsonb,
            now(),
            now(),
            '',
            '',
            '',
            ''
          )
        `);
        const adminContext: VerifiedAccountContext = {
          accountId: seedAdmin.accountId,
          authUserId: seedAdmin.authUserId,
          role: "ADMIN",
          status: "APPROVED",
        };
        const runVerifiedAccountTransaction: VerifiedAccountTransactionRunner =
          async (_input, work) => {
            await transaction.execute(sql`
              select
                set_config('app.jwt.auth_user_id', ${adminContext.authUserId}, true),
                set_config('app.jwt.account_id', ${adminContext.accountId}, true),
                set_config('app.jwt.account_role', ${adminContext.role}, true),
                set_config('app.jwt.account_status', ${adminContext.status}, true)
            `);
            await transaction.execute(
              sql.raw("set local role contente_app_user"),
            );

            return work(transaction, adminContext);
          };
        const repository = createDrizzleAdminProvisioningRepository({
          database: transaction,
          runVerifiedAccountTransaction,
        });
        const input = {
          email: targetIdentity.email,
          identityId: targetIdentity.id,
          reason: "Segundo administrador aprovado",
          requestId: "admin-additional-integration",
        };
        const first = await repository.provisionAdditionalAdmin(input);
        const repeated = await repository.provisionAdditionalAdmin(input);

        if (first.kind === "rejected" || repeated.kind === "rejected") {
          throw new Error("Expected idempotent additional admin provisioning.");
        }

        await transaction.execute(sql.raw("reset role"));
        const [account] = await transaction
          .select({
            authUserId: accounts.authUserId,
            role: accounts.role,
            status: accounts.status,
          })
          .from(accounts)
          .where(eq(accounts.authUserId, targetIdentity.id));
        const auditRows = await transaction
          .select({
            actorAccountId: auditRevisions.actorAccountId,
            actorType: auditRevisions.actorType,
            operation: auditRevisions.operation,
            reason: auditRevisions.reason,
            source: auditRevisions.source,
          })
          .from(auditRevisions)
          .where(eq(auditRevisions.requestId, "admin-additional-integration"));

        result = {
          account: account!,
          auditRows,
          first,
          repeated,
        };
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) {
        throw error;
      }
    }

    expect(result).toEqual({
      account: {
        authUserId: targetIdentity.id,
        role: "ADMIN",
        status: "APPROVED",
      },
      auditRows: [
        {
          actorAccountId: seedAdmin.accountId,
          actorType: "ADMIN",
          operation: "INSERT",
          reason: "Segundo administrador aprovado",
          source: "BACKOFFICE",
        },
      ],
      first: {
        accountId: expect.any(String),
        kind: "provisioned",
      },
      repeated: {
        accountId: expect.any(String),
        kind: "already_provisioned",
      },
    });
    expect(result?.first.accountId).toBe(result?.repeated.accountId);
  });
});
