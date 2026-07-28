import { describe, expect, it } from "vitest";

import { parsePublicSupportContact } from "./public-support-contact";

describe("public support contact", () => {
  it("accepts a configured approved email", () => {
    expect(
      parsePublicSupportContact({
        SUPPORT_CONTACT_EMAIL: "privacidade@contentecreators.test",
      }),
    ).toBe("privacidade@contentecreators.test");
  });

  it("keeps the launch placeholder absent until it is configured", () => {
    expect(parsePublicSupportContact({})).toBeNull();
  });

  it("rejects an invalid configured contact", () => {
    expect(() =>
      parsePublicSupportContact({ SUPPORT_CONTACT_EMAIL: "not-an-email" }),
    ).toThrowError(
      "Invalid server environment variables: SUPPORT_CONTACT_EMAIL",
    );
  });
});
