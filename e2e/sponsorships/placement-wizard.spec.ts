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
      "Card patrocinado no catálogo",
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
    await expect(dialog.getByText("Link do anúncio (opcional)")).toHaveCount(0);
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
      .getByLabel("Título (opcional)", { exact: true })
      .fill(
        "Uma campanha para conectar marcas e criadores com novas oportunidades. "
          .repeat(3)
          .slice(0, 160),
      );
    await dialog
      .getByRole("checkbox", { name: "Exibir empresa patrocinadora" })
      .check();
    await dialog
      .getByLabel("Nome da empresa")
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
    await dialog.getByLabel("Título (opcional)", { exact: true }).fill(title);
    await dialog.getByLabel("Nome da empresa").fill("Marca Aurora");
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

test("uploads a portrait creative, validates its CTA and edits without a required note", async ({
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
      .getByText("Card patrocinado no catálogo", { exact: true })
      .click();
    await dialog.getByRole("button", { name: "Continuar" }).click();
    await expect(dialog.getByText("Opções avançadas de imagem")).toHaveCount(0);
    await dialog
      .getByLabel("Imagem desktop", { exact: true })
      .setInputFiles("public/brand/official/contente-creators-blue.png");
    const crop = page.getByRole("dialog", { name: "Ajustar imagem desktop" });
    await expect(crop).toBeVisible();
    await expect(
      crop.getByRole("button", { name: "Salvar imagem" }),
    ).toBeInViewport();
    await crop.screenshot({
      path: testInfo.outputPath("05-crop.png"),
      animations: "disabled",
    });
    await crop.getByRole("button", { name: "Salvar imagem" }).click();
    await expect(crop).not.toBeVisible({ timeout: 20000 });
    await expect(
      dialog.getByRole("button", { name: "Remover imagem desktop" }),
    ).toBeVisible();
    const title = `Patrocínio com imagem ${Date.now()}`;
    await dialog.getByLabel("Título (opcional)", { exact: true }).fill(title);
    await dialog
      .getByLabel("Texto do botão (opcional)", { exact: true })
      .fill("Conhecer oferta");
    await dialog.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(
      dialog.getByText("Informe o endereço para o botão.").first(),
    ).toBeVisible();
    await dialog
      .getByLabel("Para onde leva (URL)")
      .fill("https://example.com/oferta");
    await dialog.getByRole("checkbox", { name: /Banner clicável/ }).check();
    await dialog
      .getByRole("checkbox", { name: "Exibir empresa patrocinadora" })
      .check();
    await dialog.getByLabel("Nome da empresa").fill("Aurora");
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
      0.75,
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
    // Activation above bypasses the UI mutation hook and its query invalidation.
    await page.reload();
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

test("publishes image-only and styled banners and equal-sized catalog cards", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(180000);
  const adminEmail = acceptanceEmail("creative-options-admin");
  const viewerEmail = acceptanceEmail("creative-options-viewer");
  const profileEmails = Array.from({ length: 9 }, () =>
    acceptanceEmail("creative-options-profile"),
  );
  const placementIds: string[] = [];
  await seedAcceptanceAccount({ email: adminEmail, role: "ADMIN" });
  const publicContext = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
  });
  const viewerContext = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
  });
  const origin = new URL(testInfo.project.use.baseURL!).origin;
  const publicPage = await publicContext.newPage();
  const viewerPage = await viewerContext.newPage();
  try {
    await signInAcceptanceUser(page, {
      email: adminEmail,
      backoffice: true,
      nextPath: "/backoffice/sponsorships",
    });
    const dialog = await openNewPlacementDialog(page);
    await dialog
      .getByText("Banner na página inicial pública", { exact: true })
      .click();
    await dialog.getByRole("button", { name: "Continuar" }).click();
    await dialog
      .getByLabel("Imagem desktop", { exact: true })
      .setInputFiles("public/brand/official/contente-creators-blue.png");
    const crop = page.getByRole("dialog", { name: "Ajustar imagem desktop" });
    await crop.getByRole("button", { name: "Salvar imagem" }).click();
    await expect(crop).not.toBeVisible({ timeout: 20000 });
    await dialog
      .getByRole("checkbox", { name: /Exibir “Conteúdo patrocinado”/ })
      .uncheck();
    const imageAlt = `Campanha somente imagem ${testInfo.project.name}`;
    await dialog
      .getByLabel("Texto alternativo da imagem (opcional)")
      .fill(imageAlt);
    const created = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/backoffice/sponsorships") &&
        response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Salvar rascunho" }).click();
    const response = await created;
    expect(response.status(), await response.text()).toBe(201);
    const { placement } = await response.json();
    placementIds.push(placement.id);
    const activate = async (id: string, version: number) => {
      const result = await page.request.post(
        `${origin}/api/backoffice/sponsorships/${id}/commands`,
        {
          headers: { Origin: origin },
          data: {
            action: "ACTIVATE",
            expectedVersion: version,
            reason: "Validar publicação e aparência em ambiente local",
          },
        },
      );
      expect(result.status(), await result.text()).toBe(200);
    };
    await activate(placement.id, placement.version);
    expect(placement.title).toBeNull();
    await publicPage.goto(`${origin}/`);
    const landing = publicPage.locator('[data-slot="sponsorship-hero-banner"]');
    await expect(landing.getByRole("img", { name: imageAlt })).toBeVisible();
    await expect(landing.getByText("Conteúdo patrocinado")).toHaveCount(0);
    await expect(landing.getByRole("heading")).toHaveCount(0);
    await expect(
      publicPage.locator('head meta[name="facebook-domain-verification"]'),
    ).toHaveAttribute("content", "r89ugiw0uurxqmq9ttdfy2xjwhzyod");
    for (const width of [1440, 768, 375]) {
      await publicPage.setViewportSize({ width, height: 1000 });
      await landing.scrollIntoViewIfNeeded();
      await expect(landing.locator("img")).toHaveJSProperty("complete", true);
      expect(
        await publicPage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await publicPage.screenshot({
        path: testInfo.outputPath(`landing-${width}.png`),
      });
    }
    await publicPage.goto(`${origin}/privacy`);
    await expect(
      publicPage.locator('head meta[name="facebook-domain-verification"]'),
    ).toHaveAttribute("content", "r89ugiw0uurxqmq9ttdfy2xjwhzyod");
    const editing = await openNewPlacementDialog(page);
    await editing.getByRole("button", { name: "Continuar" }).click();
    await editing
      .getByLabel("Imagem desktop", { exact: true })
      .setInputFiles("public/brand/official/contente-creators-blue.png");
    const topCrop = page.getByRole("dialog", {
      name: "Ajustar imagem desktop",
    });
    await topCrop.getByRole("button", { name: "Salvar imagem" }).click();
    await expect(topCrop).not.toBeVisible({ timeout: 20000 });
    await editing
      .getByLabel("Título (opcional)", { exact: true })
      .fill("Campanha com aparência");
    await editing
      .getByLabel("Para onde leva (URL)")
      .fill("https://example.com/oferta");
    await editing
      .getByLabel("Texto do botão (opcional)", { exact: true })
      .fill("Conheça a oferta");
    await editing.getByText("Aparência (opcional)", { exact: true }).click();
    await editing.getByLabel("Cor do texto", { exact: true }).fill("#111111");
    await editing
      .getByLabel("Cor de fundo do botão", { exact: true })
      .fill("#FF5500");
    await editing
      .getByLabel("Cor do texto do botão", { exact: true })
      .fill("#FFFFFF");
    await editing.getByRole("combobox", { name: "Fonte", exact: true }).click();
    await page
      .getByRole("option", { name: "Playfair Display", exact: true })
      .click();
    for (const width of [1440, 768, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.screenshot({
        path: testInfo.outputPath(`backoffice-${width}.png`),
      });
      expect(
        await editing.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
    }
    const topSavedResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/backoffice/sponsorships") &&
        response.request().method() === "POST",
    );
    await editing.getByRole("button", { name: "Salvar rascunho" }).click();
    const topResponse = await topSavedResponse;
    expect(topResponse.status(), await topResponse.text()).toBe(201);
    const { placement: styled } = await topResponse.json();
    placementIds.push(styled.id);
    expect(styled).toMatchObject({
      textColor: "#111111",
      buttonBackgroundColor: "#FF5500",
      buttonTextColor: "#FFFFFF",
      fontFamily: "serif",
      linkOnCreative: false,
    });
    const first = await page.request.post(
      `${origin}/api/backoffice/sponsorships/${styled.id}/commands`,
      {
        headers: { Origin: origin },
        data: {
          action: "REORDER",
          expectedVersion: styled.version,
          sortOrder: 0,
          reason: "Priorizar campanha sintética para validação",
        },
      },
    );
    expect(first.status(), await first.text()).toBe(200);
    await activate(styled.id, (await first.json()).placement.version);
    // Create additional placements through the same validated HTTP boundary.
    const write = {
      advertiserLabel: "Contente Creators",
      audience: "ALL",
      body: null,
      creativeAssetId: placement.creativeAssetId,
      creativeAssetMobileId: null,
      creativeAssetTabletId: null,
      endsAt: null,
      featuredCreatorProfileId: null,
      isActive: false,
      linkLabel: "Conheça a oferta",
      linkUrl: "https://example.com/oferta",
      linkOnCreative: false,
      showSponsoredBadge: true,
      showAdvertiserLabel: true,
      textColor: "#111111",
      buttonBackgroundColor: "#FF5500",
      buttonTextColor: "#FFFFFF",
      fontFamily: "serif",
      imageAlt,
      placementType: "TOP_BANNER",
      reason: "",
      slotKey: "catalog-top",
      sortOrder: 0,
      startsAt: null,
      title: "Campanha com aparência",
    };
    for (const data of [
      { ...write, placementType: "CAROUSEL", slotKey: "catalog-carousel" },
      {
        ...write,
        title: null,
        linkLabel: null,
        linkOnCreative: true,
        placementType: "CAROUSEL",
        slotKey: "catalog-midlist",
      },
    ]) {
      const result = await page.request.post(
        `${origin}/api/backoffice/sponsorships`,
        { headers: { Origin: origin }, data },
      );
      expect(result.status(), await result.text()).toBe(201);
      const { placement: saved } = await result.json();
      placementIds.push(saved.id);
      const reordered = await page.request.post(
        `${origin}/api/backoffice/sponsorships/${saved.id}/commands`,
        {
          headers: { Origin: origin },
          data: {
            action: "REORDER",
            expectedVersion: saved.version,
            sortOrder: 0,
            reason: "Priorizar campanha sintética para validação",
          },
        },
      );
      expect(reordered.status(), await reordered.text()).toBe(200);
      await activate(saved.id, (await reordered.json()).placement.version);
    }
    await seedAcceptanceAccount({ email: viewerEmail });
    for (const email of profileEmails) await seedAcceptanceAccount({ email });
    await viewerPage.goto(origin);
    await signInAcceptanceUser(viewerPage, {
      email: viewerEmail,
      nextPath: "/app/catalog",
    });
    const top = viewerPage.locator('[data-slot="sponsorship-hero-banner"]');
    await expect(
      top.getByRole("heading", { name: "Campanha com aparência" }),
    ).toBeVisible();
    await expect(top.getByRole("link", { name: "Conheça a oferta" })).toHaveCSS(
      "background-color",
      "rgb(255, 85, 0)",
    );
    await expect(top.getByRole("heading")).toHaveCSS(
      "color",
      "rgb(17, 17, 17)",
    );
    expect(
      await top
        .locator("h2")
        .evaluate((element) => getComputedStyle(element).fontFamily),
    ).toContain("Playfair");
    await expect(
      viewerPage.locator('head meta[name="facebook-domain-verification"]'),
    ).toHaveAttribute("content", "r89ugiw0uurxqmq9ttdfy2xjwhzyod");
    const list = viewerPage.getByRole("list", {
      name: "Lista do catálogo",
      exact: true,
    });
    const card = list.locator(":scope > li").nth(8);
    await expect(card).toHaveAttribute("aria-label", "Patrocínio");
    for (const width of [1440, 768, 375]) {
      await viewerPage.setViewportSize({ width, height: 1000 });
      await card.scrollIntoViewIfNeeded();
      const sizes = await list.evaluate((element) =>
        Array.from(element.children)
          .slice(8, 10)
          .map((li) => {
            const rect = li
              .querySelector("article, [role=article]")!
              .getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          }),
      );
      expect(Math.abs(sizes[0].width - sizes[1].width)).toBeLessThanOrEqual(1);
      const carouselCard = viewerPage
        .getByRole("list", { name: "Lista de patrocínios", exact: true })
        .locator("article")
        .first();
      const carouselWidth = await carouselCard.evaluate(
        (element) => element.getBoundingClientRect().width,
      );
      expect(Math.abs(carouselWidth - sizes[0].width)).toBeLessThanOrEqual(1);
      expect(Math.abs(sizes[0].height - sizes[1].height)).toBeLessThanOrEqual(
        1,
      );
      await testInfo.attach(`catalog-measures-${width}`, {
        body: JSON.stringify(sizes),
        contentType: "application/json",
      });
      await viewerPage.screenshot({
        path: testInfo.outputPath(`catalog-${width}.png`),
      });
      expect(
        await viewerPage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect(await viewerPage.locator("a a").count()).toBe(0);
    const popupPromise = viewerPage.waitForEvent("popup");
    await card.getByRole("link").click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL("https://example.com/oferta");
    await popup.close();
  } finally {
    await publicContext.close();
    await viewerContext.close();
    for (const id of placementIds) await cleanupPlacement(id);
    for (const email of [...profileEmails, viewerEmail, adminEmail])
      await cleanupAcceptanceIdentity(email);
  }
});
