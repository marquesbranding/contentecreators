import "server-only";

import { resolveFreshServerCurrentSession } from "../dal/current-account";
import { createBackofficeAuthService } from "./backoffice-auth.service";
import { createServerIdentityAuthService } from "./server-identity-auth.service";

export async function createServerBackofficeAuthService() {
  const authentication = await createServerIdentityAuthService();

  return createBackofficeAuthService({
    beginGoogleSignIn: (destination) =>
      authentication.beginGoogleSignInAt(destination),
    resolveCurrentSession: (requestId) =>
      resolveFreshServerCurrentSession(requestId, "ADMIN"),
    signIn: (input) => authentication.signIn(input),
    signOut: () => authentication.signOut(),
  });
}
