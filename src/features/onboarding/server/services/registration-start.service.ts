import "server-only";

import { z } from "zod";
import type { RegistrationIdentityAvailability } from "@/features/identity/server";

export const registrationEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um e-mail válido.").max(320));

export function createRegistrationStartService(dependencies: {
  consume(email: string): Promise<boolean>;
  lookup(email: string): Promise<RegistrationIdentityAvailability>;
  send(email: string): Promise<void>;
}) {
  return {
    async start(value: unknown, checkOnly = false) {
      const parsed = registrationEmailSchema.safeParse(value);
      if (!parsed.success)
        return {
          status: "error" as const,
          message: "Informe um e-mail válido.",
        };
      const email = parsed.data;
      if (!(await dependencies.consume(email)))
        return {
          status: "error" as const,
          message: "Muitas tentativas. Aguarde antes de tentar novamente.",
        };
      const availability = await dependencies.lookup(email);
      if (availability.status === "blocked")
        return {
          status: "error" as const,
          message:
            "Não foi possível continuar com este e-mail. Fale com o suporte.",
        };
      if (availability.status === "registered")
        return { ...availability, status: "account_exists" as const, email };
      if (!checkOnly) await dependencies.send(email);
      return { status: "success" as const, email };
    },
  };
}
