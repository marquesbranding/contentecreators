import "server-only";
import {
  consumeRegistrationLimit,
  createRegistrationIdentityRepository,
  sendRegistrationCode,
} from "@/features/identity/server";
import { createRegistrationStartService } from "./registration-start.service";

export function createServerRegistrationStartService(checkOnly = false) {
  return createRegistrationStartService({
    consume: (email) =>
      consumeRegistrationLimit(
        email,
        checkOnly ? "registrationEmailCheck" : "signUp",
      ),
    lookup: createRegistrationIdentityRepository().lookup,
    send: sendRegistrationCode,
  });
}
