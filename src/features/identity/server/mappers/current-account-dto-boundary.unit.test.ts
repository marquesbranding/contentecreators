import { describe, expect, it } from "vitest";

import type { VerifiedAccountContext } from "../services/verified-account-transaction";
import { toCurrentAccountDto } from "./current-account.mapper";

describe("Server Component current-account DTO boundary", () => {
  it("projects an explicit safe shape instead of serializing the Auth context or account row", () => {
    const serverRecord = {
      accountId: "c0000000-0000-4000-8000-000000000004",
      archivedAt: null,
      authUserId: "30000000-0000-4000-8000-000000000004",
      completionPercentage: 100,
      operationalEmail: "private@company.test",
      providerAccessToken: "provider-secret",
      role: "COMPANY",
      status: "APPROVED",
      storagePath: "private/company/logo.webp",
      version: 7,
    } as const;

    const dto = toCurrentAccountDto(serverRecord as VerifiedAccountContext);
    const serializedDto = JSON.stringify(dto);

    expect(dto).toEqual({
      id: serverRecord.accountId,
      role: "COMPANY",
      status: "APPROVED",
    });
    expect(serializedDto).not.toContain(serverRecord.authUserId);
    expect(serializedDto).not.toContain(serverRecord.operationalEmail);
    expect(serializedDto).not.toContain(serverRecord.providerAccessToken);
    expect(serializedDto).not.toContain(serverRecord.storagePath);
    expect(serializedDto).not.toContain("completionPercentage");
    expect(serializedDto).not.toContain("version");
  });
});
