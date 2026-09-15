import postgres from "postgres";
import { test, expect, type Page } from "@playwright/test";
import {
  acceptanceEmail,
  seedAcceptanceAccount,
  cleanupAcceptanceIdentity,
  signInAcceptanceUser,
} from "../support/local-acceptance";

test("mobile-first sponsorship wizard previews each placement and saves an unfinished draft", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const email = acceptanceEmail("sponsorship-wizard");
  await seedAcceptanceAccount({ email, role: "ADMIN" });
  let placementId: string | undefined;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await signInAcceptanceUser(page, {
      email,
      backoffice: true,
      nextPath: "/backoffice/sponsorships",
    });
    const dialog = await openNewPlacementDialog(page);
    await expect(dialog.getByRole("radio")).toHaveCount(6);
    await page.screenshot({ path: testInfo.outputPath("01-slots.png") });
    if (testInfo.project.name.startsWith("mobile")) {
      const size = page.viewportSize()!;
      await page.setViewportSize({ width: 320, height: 740 });
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
      await expect(
        dialog.getByRole("button", { name: "Salvar rascunho" }),
      ).toBeVisible();
      expect(
        await dialog
          .getByRole("button", { name: "Salvar rascunho" })
          .evaluate(
            (element) => element.scrollWidth <= element.clientWidth + 1,
          ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("07-narrow-mobile.png"),
      });
      await page.setViewportSize(size);
    }
    const slots = [
      "Banner no topo do catálogo",
      "Banner na página inicial pública",
      "Carrossel do catálogo",
      "Anúncios no meio da listagem",
      "Barra lateral do catálogo",
      "Criador em destaque",
    ];
    for (const name of slots) {
      await dialog.getByText(name, { exact: true }).click();
      if (testInfo.project.name.startsWith("mobile"))
        await dialog
          .getByRole("button", { name: "Ver prévia ao vivo" })
          .click();
      const preview = page.frameLocator(
        'iframe[title="Prévia do patrocínio no site"]',
      );
      await expect(preview.getByText(name, { exact: true })).toBeVisible();
      await expect(
        preview.getByText("Conteúdo patrocinado", { exact: true }),
      ).toBeVisible();
      for (const viewport of ["Desktop", "Tablet", "Mobile"])
        await dialog
          .getByRole("button", { name: viewport, exact: true })
          .click();
      if (testInfo.project.name.startsWith("mobile"))
        await dialog.getByRole("button", { name: "Voltar à edição" }).click();
    }
    await dialog.getByRole("button", { name: "Continuar" }).click();
    await expect(
      dialog.getByLabel("Criador em destaque", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /Enviar imagem/ }),
    ).toHaveCount(0);
    await expect(dialog.getByText("Botão de ação (opcional)")).toHaveCount(0);
    await expect(
      dialog.getByText("Somente criadores aprovados com perfil 100% completo."),
    ).toBeVisible();
    await dialog
      .getByLabel("Criador em destaque", { exact: true })
      .fill("Diego");
    await page.getByRole("option", { name: /Diego Aprova/ }).click();
    if (testInfo.project.name.startsWith("mobile"))
      await dialog.getByRole("button", { name: "Ver prévia ao vivo" }).click();
    await expect(
      page
        .frameLocator("iframe")
        .getByRole("heading", { name: "Diego Aprova" }),
    ).toBeVisible();
    if (testInfo.project.name.startsWith("mobile"))
      await dialog.getByRole("button", { name: "Voltar à edição" }).click();
    await dialog.getByRole("button", { name: "1 Posição" }).click();
    await dialog
      .getByText("Banner no topo do catálogo", { exact: true })
      .click();
    await dialog.getByRole("button", { name: "Continuar" }).click();
    await dialog
      .getByLabel("Título", { exact: true })
      .fill(
        "Uma campanha para conectar marcas e criadores com novas oportunidades. "
          .repeat(3)
          .slice(0, 160),
      );
    await dialog
      .getByLabel("Marca patrocinadora (opcional)")
      .fill(
        "Uma marca com um nome muito longo para validar a legibilidade no celular "
          .repeat(3)
          .slice(0, 160),
      );
    if (testInfo.project.name.startsWith("mobile"))
      await dialog.getByRole("button", { name: "Ver prévia ao vivo" }).click();
    const hero = page
      .frameLocator("iframe")
      .locator('[data-slot="sponsorship-hero-banner"]');
    await expect(hero).toBeVisible();
    expect(
      await hero.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const title = element.querySelector("h2")!.getBoundingClientRect();
        return title.top >= bounds.top && title.bottom <= bounds.bottom;
      }),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("08-long-copy.png") });
    if (testInfo.project.name.startsWith("mobile"))
      await dialog.getByRole("button", { name: "Voltar à edição" }).click();
    await dialog.getByRole("button", { name: "1 Posição" }).click();
    await dialog
      .getByText("Banner na página inicial pública", { exact: true })
      .click();
    await dialog.getByRole("button", { name: "Continuar" }).click();
    const title = `Campanha visual ${Date.now()}`;
    await dialog.getByLabel("Título", { exact: true }).fill(title);
    await dialog
      .getByLabel("Marca patrocinadora (opcional)")
      .fill("Marca Aurora");
    await page.screenshot({ path: testInfo.outputPath("02-content.png") });
    await dialog.getByRole("button", { name: "Continuar" }).click();
    await expect(dialog.getByLabel("Audiência")).toBeDisabled();
    await expect(
      dialog.getByText("Horário de Brasília (UTC−03:00)"),
    ).toBeVisible();
    await dialog.getByLabel("Início (opcional)").fill("2027-01-15T10:00");
    await page.screenshot({ path: testInfo.outputPath("03-agenda.png") });
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/backoffice/sponsorships") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Salvar rascunho" }).click();
    const response = await responsePromise;
    expect(response.status(), await response.text()).toBe(201);
    const result = await response.json();
    placementId = result.placement.id;
    expect(result.placement.startsAt).toBe("2027-01-15T13:00:00.000Z");
    await expect(dialog).not.toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await cleanupPlacement(placementId);
    await cleanupAcceptanceIdentity(email);
  }
});

async function cleanupPlacement(id?: string) {
  if (!id) return;
  const sql = postgres(
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    { max: 1 },
  );
  try {
    await sql`delete from public.sponsorship_placements where id = ${id}::uuid`;
  } finally {
    await sql.end();
  }
}

test("uploads a 5:4 creative, validates its CTA and edits without a required note", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  const email = acceptanceEmail("sponsorship-upload");
  await seedAcceptanceAccount({ email, role: "ADMIN" });
  let placementId: string | undefined;
  try {
    await signInAcceptanceUser(page, {
      email,
      backoffice: true,
      nextPath: "/backoffice/sponsorships",
    });
    const dialog = await openNewPlacementDialog(page);
    await dialog
      .getByText("Anúncios no meio da listagem", { exact: true })
      .click();
    await dialog.getByRole("button", { name: "Continuar" }).click();
    await expect(dialog.getByText("Opções avançadas de imagem")).toHaveCount(0);
    await dialog
      .getByLabel("Imagem desktop", { exact: true })
      .setInputFiles("public/brand/official/contente-creators-blue.png");
    const crop = page.getByRole("dialog", { name: "Ajustar imagem desktop" });
    await expect(crop).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("05-crop.png") });
    await crop.getByRole("button", { name: "Salvar imagem" }).click();
    await expect(crop).not.toBeVisible({ timeout: 20000 });
    await expect(
      dialog.getByRole("button", { name: "Remover imagem desktop" }),
    ).toBeVisible();
    const title = `Patrocínio com imagem ${Date.now()}`;
    await dialog.getByLabel("Título", { exact: true }).fill(title);
    await dialog
      .getByLabel("Para onde leva (URL)")
      .fill("https://example.com/oferta");
    await dialog.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(
      dialog.getByText("Preencha o texto do botão e o endereço em conjunto."),
    ).toBeVisible();
    await dialog
      .getByLabel("Texto do botão", { exact: true })
      .fill("Conhecer oferta");
    await dialog.getByLabel("Marca patrocinadora (opcional)").fill("Aurora");
    if (testInfo.project.name.startsWith("mobile"))
      await dialog.getByRole("button", { name: "Ver prévia ao vivo" }).click();
    await expect(
      page.frameLocator("iframe").getByText("Patrocinado por Aurora"),
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("06-creative.png") });
    const created = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/backoffice/sponsorships") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Salvar rascunho" }).click();
    const response = await created;
    expect(response.status(), await response.text()).toBe(201);
    const { placement } = await response.json();
    placementId = placement.id;
    expect(placement.creative.width / placement.creative.height).toBeCloseTo(
      1.25,
      2,
    );
    const endpoint = `/api/backoffice/sponsorships/${placement.id}/commands`;
    const denied = await page.request.post(endpoint, {
      headers: { Origin: new URL(page.url()).origin },
      data: {
        action: "ACTIVATE",
        expectedVersion: placement.version,
        reason: "",
      },
    });
    expect(denied.status()).toBe(422);
    const activated = await page.request.post(endpoint, {
      headers: { Origin: new URL(page.url()).origin },
      data: {
        action: "ACTIVATE",
        expectedVersion: placement.version,
        reason: "Ativar campanha sintética para teste local",
      },
    });
    expect(activated.status(), await activated.text()).toBe(200);
    await page.getByLabel("Buscar patrocínio").fill(title);
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await page
      .getByRole("button", { name: "Editar", exact: true })
      .first()
      .click();
    const editing = page.getByRole("dialog", { name: "Editar patrocínio" });
    await editing.getByRole("button", { name: /Público e agenda/ }).click();
    await expect(editing.getByLabel("Nota interna (opcional)")).toBeVisible();
    const updated = page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().includes(placement.id),
    );
    await editing.getByRole("button", { name: "Salvar alterações" }).click();
    expect((await updated).status()).toBe(200);
  } finally {
    await cleanupPlacement(placementId);
    await cleanupAcceptanceIdentity(email);
  }
});

async function openNewPlacementDialog(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Novo patrocínio" });
  // The trigger is server-rendered, so a click can land before hydration.
  await expect(async () => {
    await page.getByRole("button", { name: "Novo patrocínio" }).click();
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });
  return dialog;
}
