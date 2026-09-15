import { describe, expect, it, vi } from "vitest";
import { createRegistrationStartService } from "./registration-start.service";

describe("registration start", () => {
  it.each(["available", "unconfirmed"] as const)(
    "sends a code for %s identities",
    async (status) => {
      const send = vi.fn();
      const lookup = vi.fn().mockResolvedValue({ status });
      const service = createRegistrationStartService({
        consume: async () => true,
        lookup,
        send,
      });
      expect(await service.start("  Pessoa@Example.com ")).toEqual({
        status: "success",
        email: "pessoa@example.com",
      });
      expect(send).toHaveBeenCalledWith("pessoa@example.com");
    },
  );
  it("returns existing account access methods without sending another signup code", async () => {
    const send = vi.fn();
    const service = createRegistrationStartService({
      consume: async () => true,
      lookup: async () => ({
        status: "registered",
        providers: ["google"],
        hasPassword: false,
      }),
      send,
    });
    expect(await service.start("person@example.com")).toMatchObject({
      status: "account_exists",
      providers: ["google"],
      hasPassword: false,
    });
    expect(send).not.toHaveBeenCalled();
  });
  it("does not disclose bans and rejects exhausted limits before lookup", async () => {
    const send = vi.fn();
    const lookup = vi.fn().mockResolvedValue({ status: "blocked" });
    expect(
      await createRegistrationStartService({
        consume: async () => true,
        lookup,
        send,
      }).start("person@example.com"),
    ).toEqual({
      status: "error",
      message:
        "Não foi possível continuar com este e-mail. Fale com o suporte.",
    });
    lookup.mockClear();
    expect(
      (
        await createRegistrationStartService({
          consume: async () => false,
          lookup,
          send,
        }).start("person@example.com")
      ).status,
    ).toBe("error");
    expect(lookup).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it("validates before lookup and never sends on blur", async () => {
    const send = vi.fn();
    const lookup = vi.fn().mockResolvedValue({ status: "available" });
    const service = createRegistrationStartService({
      consume: async () => true,
      lookup,
      send,
    });
    expect((await service.start("invalid")).status).toBe("error");
    expect(lookup).not.toHaveBeenCalled();
    await service.start("person@example.com", true);
    expect(send).not.toHaveBeenCalled();
  });
});
