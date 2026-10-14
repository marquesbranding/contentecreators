import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import postgres from "postgres";

import {
  acceptanceEmail,
  cleanupAcceptanceIdentity,
  readAcceptanceAccount,
  seedAcceptanceAccount,
  signInAcceptanceUser,
} from "../support/local-acceptance";

const DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const evidenceDirectory = join(
  process.cwd(),
  "evidencias-reaceite-e-patrocinios",
);
const dialogName = "Aceite os documentos para continuar";

test("pending creator accepts the latest legal documents once and is not asked again", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  mkdirSync(evidenceDirectory, { recursive: true });
  const email = acceptanceEmail("legal-reacceptance");
  await seedAcceptanceAccount({
    email,
    role: "INFLUENCER",
    status: "APPROVED",
  });
  const database = postgres(DATABASE_URL, { connect_timeout: 5, max: 1 });

  try {
    const account = await readAcceptanceAccount(email);
    expect(account).not.toBeNull();

    // The fixture accepts every active document; remove the 1.0 consents so the
    // account is pending exactly as it would be after a new publication.
    await database`
      delete from public.account_consents
      where account_id = ${account!.id}::uuid
        and legal_document_id in (
          select id from public.legal_documents
          where document_type in ('TERMS', 'PRIVACY') and version_label = '1.0'
        )
    `;

    await signInAcceptanceUser(page, { email, nextPath: "/app" });

    const dialog = page.getByRole("dialog", { name: dialogName });
    await expect(dialog).toBeVisible();
    await page.screenshot({
      path: join(
        evidenceDirectory,
        `01-modal-reaceite-${testInfo.project.name}.png`,
      ),
    });

    const openLink = dialog.getByRole("link", {
      name: "Abrir Termos de Uso em nova aba",
    });
    await expect(openLink).toHaveAttribute(
      "href",
      "/legal/termos-de-uso-v1.0.pdf",
    );
    // Headless Chromium may hand PDFs to a download instead of rendering them,
    // so the new tab is asserted to open and the file itself is fetched.
    const pdfResponse = await page.request.get("/legal/termos-de-uso-v1.0.pdf");
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      openLink.click(),
    ]);
    await popup.close();
    await expect(dialog).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      dialog.getByRole("link", { name: "Baixar PDF de Termos de Uso" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe(
      "Contente Creators - Termos de Uso.pdf",
    );

    const accept = dialog.getByRole("button", { name: "Aceitar e continuar" });
    await expect(accept).toBeDisabled();
    await dialog
      .getByRole("checkbox", { name: "Li e aceito os documentos acima" })
      .click();
    await expect(accept).toBeEnabled();
    await page.screenshot({
      path: join(
        evidenceDirectory,
        `02-checkbox-marcado-${testInfo.project.name}.png`,
      ),
    });

    await accept.click();
    await expect(dialog).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("dialog", { name: dialogName })).toHaveCount(0);
    await page.screenshot({
      path: join(evidenceDirectory, "05-apos-aceite-catalogo.png"),
    });

    const [{ count }] = await database<{ count: number }[]>`
      select count(*)::int as count
      from public.account_consents
      where account_id = ${account!.id}::uuid
        and context->>'flow' = 'reacceptance'
    `;
    expect(count).toBe(2);
  } finally {
    await database.end();
    await cleanupAcceptanceIdentity(email);
  }
});
