import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../../../../");
const templateNames = [
  "confirmation",
  "magic_link",
  "recovery",
  "invite",
  "email-change",
] as const;

describe("local Supabase Auth email templates", () => {
  it.each(templateNames)(
    "keeps the %s template branded, responsive and data-minimized",
    async (templateName) => {
      const html = await readFile(
        resolve(projectRoot, `supabase/templates/${templateName}.html`),
        "utf8",
      );

      expect(html).toContain('lang="pt-BR"');
      expect(html).toContain('name="viewport"');
      expect(html).toContain('alt="Contente Creators"');
      expect(html).toMatch(
        /{{\s*\.SiteURL\s*}}\/brand\/official\/contente-creators-(?:black|white)\.png/,
      );
      if (templateName === "recovery") {
        expect(html).toContain(
          "{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&amp;type=recovery",
        );
        expect(html).not.toContain("{{ .ConfirmationURL }}");
      } else if (
        templateName === "confirmation" ||
        templateName === "magic_link"
      ) {
        expect(html).toContain("{{ .Token }}");
        expect(html).toContain("token_hash={{ .TokenHash }}&amp;type=email");
      } else {
        expect(html).toContain("{{ .ConfirmationURL }}");
      }
      expect(html).not.toMatch(/{{\s*\.(?:Data|Email|NewEmail|OldEmail)\s*}}/);
      if (!["recovery", "confirmation", "magic_link"].includes(templateName)) {
        expect(html).not.toContain("{{ .TokenHash }}");
      }
      expect(html).not.toMatch(
        /{{\s*\.(?:Password|AccessToken|RefreshToken)\s*}}/,
      );
    },
  );

  it("connects every supported template from the local Supabase configuration", async () => {
    const configuration = await readFile(
      resolve(projectRoot, "supabase/config.toml"),
      "utf8",
    );

    expect(configuration).toContain("[auth.email.template.confirmation]");
    expect(configuration).toContain("[auth.email.template.recovery]");
    expect(configuration).toContain("[auth.email.template.invite]");
    expect(configuration).toContain("[auth.email.template.email_change]");
    expect(configuration).toContain(
      'content_path = "./supabase/templates/confirmation.html"',
    );
    expect(configuration).toContain(
      'content_path = "./supabase/templates/recovery.html"',
    );
    expect(configuration).toContain(
      'content_path = "./supabase/templates/invite.html"',
    );
    expect(configuration).toContain(
      'content_path = "./supabase/templates/email-change.html"',
    );
  });
});
