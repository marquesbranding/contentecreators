import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import { createSupabaseAuthGateway } from "./supabase-auth.gateway";

it("marks a recovered password as user-defined so unfinished signup can continue", async () => {
  const updateUser = vi.fn().mockResolvedValue({ error: null });
  const client = { auth: { updateUser } } as unknown as SupabaseClient;
  expect(
    await createSupabaseAuthGateway(client).updatePassword("NovaSenha123!"),
  ).toEqual({ kind: "success" });
  expect(updateUser).toHaveBeenCalledWith({
    password: "NovaSenha123!",
    data: { registration_password_pending: false },
  });
});
