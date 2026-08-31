import "server-only";

import type { CurrentSessionDto } from "../../types/current-account.types";
import type { AccountRolePreference } from "./verified-account-transaction";

interface BannedAccountDefenseDependencies {
  banIdentity(identityId: string): Promise<boolean>;
  getCurrentAccessToken(): Promise<string | null>;
  resolveCurrentIdentityId(): Promise<string | null>;
  resolveCurrentSession(
    requestId: string,
    preferredRole?: AccountRolePreference,
  ): Promise<CurrentSessionDto>;
  revokeAccessToken(accessToken: string): Promise<boolean>;
  signOut(): Promise<unknown>;
}

export function createBannedAccountDefenseService(
  dependencies: BannedAccountDefenseDependencies,
) {
  return {
    async enforce(requestId: string, preferredRole?: AccountRolePreference) {
      const session = await dependencies.resolveCurrentSession(
        requestId,
        preferredRole,
      );

      if (session.account?.status !== "BANNED") {
        return { kind: "allowed" as const };
      }

      const [accessTokenResult, identityIdResult] = await Promise.allSettled([
        dependencies.getCurrentAccessToken(),
        dependencies.resolveCurrentIdentityId(),
      ]);
      const revocations: Promise<unknown>[] = [];

      if (accessTokenResult.status === "fulfilled" && accessTokenResult.value) {
        revocations.push(
          dependencies.revokeAccessToken(accessTokenResult.value),
        );
      }

      if (identityIdResult.status === "fulfilled" && identityIdResult.value) {
        revocations.push(dependencies.banIdentity(identityIdResult.value));
      }

      await Promise.allSettled(revocations);
      await Promise.resolve(dependencies.signOut()).catch(() => undefined);

      return {
        destination: "/app/status/blocked" as const,
        kind: "blocked" as const,
      };
    },
  };
}
