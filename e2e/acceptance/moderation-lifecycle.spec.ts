import { expect, test, type Page, type TestInfo } from "@playwright/test";

import {
  acceptanceEmail,
  cleanupAcceptanceIdentity,
  confirmOnboardingSubmission,
  fillCreatorProfileForm,
  readAcceptanceAccount,
  readAcceptanceAudit,
  readAcceptanceIdentityState,
  readAcceptanceOutbox,
  seedAcceptanceAccount,
  seedAcceptanceDeadLetterEmail,
  setAcceptanceAccountStatus,
  signInAcceptanceUser,
} from "../support/local-acceptance";

const LOCAL_ADMIN_EMAIL = "admin@contentecreators.test";
const LOCAL_ADMIN_PASSWORD = "ContenteCreators@01";

function runOnce(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "Database-backed moderation acceptance journeys run once in Chromium.",
  );
}

async function signInAsLocalAdmin(
  page: Page,
  nextPath: string,
  credentials: {
    email?: string;
    password?: string;
  } = {},
) {
  await signInAcceptanceUser(page, {
    backoffice: true,
    email: credentials.email ?? LOCAL_ADMIN_EMAIL,
    nextPath,
    password: credentials.password ?? LOCAL_ADMIN_PASSWORD,
  });
}

async function applyModerationDecision(
  page: Page,
  input: {
    action: string;
    reason?: string;
    reasonLabel?: string;
    submit: string;
  },
) {
  await page.getByRole("button", { name: input.action }).click();
  await expect(page.getByRole("dialog", { name: input.action })).toBeVisible();

  if (input.reason && input.reasonLabel) {
    await page.getByLabel(input.reasonLabel).fill(input.reason);
  }

  await page
    .getByRole("checkbox", {
      name: /confirmo que revisei o cadastro/iu,
    })
    .check();
  await page.getByRole("button", { name: input.submit }).click();
}

test.describe("moderation lifecycle acceptance journeys", () => {
  test("reviews a full submission, requests corrections, accepts resubmission, approves it and enqueues both emails", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);
    const email = acceptanceEmail("moderation-cycle");
    const correctionReason =
      "Atualize o nome de exibição e confirme novamente os dados declarados.";
    const adminEmail = acceptanceEmail("moderation-admin");
    await seedAcceptanceAccount({ email: adminEmail, role: "ADMIN" });
    const fixture = await seedAcceptanceAccount({
      email,
      status: "PENDING_REVIEW",
    });

    try {
      const reviewPath = `/backoffice/moderation/${fixture.accountId}`;
      await signInAsLocalAdmin(page, reviewPath, {
        email: adminEmail,
        password: "LocalTest123!",
      });
      await expect(
        page.getByRole("heading", { name: "Creator Aceite", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Perfil do influenciador", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Consentimentos", { exact: true }),
      ).toBeVisible();

      await applyModerationDecision(page, {
        action: "Solicitar correções",
        reason: correctionReason,
        reasonLabel: "Motivo para solicitar correções",
        submit: "Enviar solicitação",
      });
      await expect
        .poll(async () => (await readAcceptanceAccount(email))?.status, {
          timeout: 20_000,
        })
        .toBe("CHANGES_REQUESTED");

      await page.context().clearCookies();
      await signInAcceptanceUser(page, {
        email,
        nextPath: "/onboarding/influencer?corrections=requested",
      });
      await expect(
        page.getByText("Correções solicitadas", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText(correctionReason)).toBeVisible();
      await fillCreatorProfileForm(page);
      await page
        .getByLabel("Nome de creator")
        .fill("Creator Jornada Corrigido");
      await confirmOnboardingSubmission(page);
      await expect(page).toHaveURL(/\/app\/status\/analysis$/u, {
        timeout: 20_000,
      });
      await expect
        .poll(async () => (await readAcceptanceAccount(email))?.status, {
          timeout: 20_000,
        })
        .toBe("PENDING_REVIEW");

      await page.context().clearCookies();
      await signInAsLocalAdmin(page, reviewPath, {
        email: adminEmail,
        password: "LocalTest123!",
      });
      await expect(
        page.getByRole("heading", {
          name: "Creator Jornada Corrigido",
          exact: true,
        }),
      ).toBeVisible();
      await applyModerationDecision(page, {
        action: "Aprovar cadastro",
        submit: "Confirmar aprovação",
      });
      await expect
        .poll(async () => (await readAcceptanceAccount(email))?.status, {
          timeout: 20_000,
        })
        .toBe("APPROVED");

      const templates = (await readAcceptanceOutbox(fixture.accountId)).map(
        (message) => message.template,
      );
      expect(templates).toEqual(
        expect.arrayContaining([
          "APPROVED",
          "CHANGES_REQUESTED",
          "ONBOARDING_RECEIVED",
        ]),
      );
    } finally {
      await cleanupAcceptanceIdentity(email);
      await cleanupAcceptanceIdentity(adminEmail);
    }
  });

  test("publishes an approved creator edit immediately without losing approval and records the revision", async ({
    page,
  }, testInfo) => {
    runOnce(testInfo);
    const email = acceptanceEmail("approved-profile-edit");
    const updatedDisplayName = `Creator Atualizado ${crypto
      .randomUUID()
      .slice(0, 8)}`;
    const fixture = await seedAcceptanceAccount({
      email,
      status: "APPROVED",
    });

    try {
      await signInAcceptanceUser(page, {
        email,
        nextPath: "/app/profile",
      });
      await page.getByLabel("Nome de creator").fill(updatedDisplayName);
      await page.getByRole("button", { name: "Salvar alterações" }).click();
      await expect(
        page.getByText("Alterações publicadas", { exact: true }).first(),
      ).toBeVisible({ timeout: 20_000 });

      expect((await readAcceptanceAccount(email))?.status).toBe("APPROVED");
      await expect
        .poll(
          async () => {
            const revisions = await readAcceptanceAudit({
              accountId: fixture.accountId,
              entityName: "creator_profiles",
            });

            return revisions.some(
              (revision) =>
                revision.action === "UPDATE" &&
                revision.changedFields.includes("display_name"),
            );
          },
          { timeout: 10_000 },
        )
        .toBe(true);

      await page.context().clearCookies();
      await signInAcceptanceUser(page, {
        email: "company-approved@contentecreators.test",
        nextPath: "/app/catalog",
      });
      const catalogResponse = await page.request.get("/api/catalog/creators");
      expect(catalogResponse.status()).toBe(200);
      expect(JSON.stringify(await catalogResponse.json())).toContain(
        updatedDisplayName,
      );
    } finally {
      await cleanupAcceptanceIdentity(email);
    }
  });

  test("removes suspended and banned creators immediately, blocks recreation and supports audited recovery", async ({
    browser,
    page: adminPage,
  }, testInfo) => {
    runOnce(testInfo);
    test.setTimeout(120_000);
    const email = acceptanceEmail("access-lifecycle");
    const adminEmail = acceptanceEmail("access-admin");
    await seedAcceptanceAccount({ email: adminEmail, role: "ADMIN" });
    const fixture = await seedAcceptanceAccount({
      email,
      status: "APPROVED",
    });
    const userContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
    });
    const companyContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
    });
    const userPage = await userContext.newPage();
    const companyPage = await companyContext.newPage();

    try {
      const reviewPath = `/backoffice/moderation/${fixture.accountId}`;
      await signInAcceptanceUser(userPage, {
        email,
        nextPath: "/app/catalog",
      });
      await signInAcceptanceUser(companyPage, {
        email: "company-approved@contentecreators.test",
        nextPath: "/app/catalog",
      });
      await signInAsLocalAdmin(adminPage, reviewPath, {
        email: adminEmail,
        password: "LocalTest123!",
      });

      await applyModerationDecision(adminPage, {
        action: "Suspender cadastro",
        reason: "Suspensão temporária validada pela jornada de aceite.",
        reasonLabel: "Motivo para suspender",
        submit: "Confirmar suspensão",
      });
      await expect
        .poll(async () => (await readAcceptanceAccount(email))?.status, {
          timeout: 20_000,
        })
        .toBe("SUSPENDED");
      await userPage.goto("/app/catalog");
      await expect(
        userPage.getByRole("heading", { name: "Seu acesso está suspenso" }),
      ).toBeVisible();
      expect(
        (await userPage.request.get("/api/catalog/creators")).status(),
      ).toBe(403);
      expect(
        JSON.stringify(
          await (await companyPage.request.get("/api/catalog/creators")).json(),
        ),
      ).not.toContain("Creator Aceite");

      await adminPage.goto(reviewPath);
      await applyModerationDecision(adminPage, {
        action: "Restaurar acesso",
        reason: "Condição temporária resolvida e acesso validado novamente.",
        reasonLabel: "Motivo para restaurar",
        submit: "Confirmar restauração",
      });
      await expect
        .poll(async () => (await readAcceptanceAccount(email))?.status, {
          timeout: 20_000,
        })
        .toBe("APPROVED");
      expect(
        JSON.stringify(
          await (await companyPage.request.get("/api/catalog/creators")).json(),
        ),
      ).toContain("Creator Aceite");

      await adminPage.goto(reviewPath);
      await applyModerationDecision(adminPage, {
        action: "Banir cadastro",
        reason: "Banimento controlado para validar identidade e sessões.",
        reasonLabel: "Motivo para banir",
        submit: "Confirmar banimento",
      });
      await expect
        .poll(async () => (await readAcceptanceAccount(email))?.status, {
          timeout: 20_000,
        })
        .toBe("BANNED");
      await expect
        .poll(
          async () =>
            (await readAcceptanceIdentityState(email)).activeBlockCount,
          { timeout: 20_000 },
        )
        .toBe(1);
      await userPage.goto("/app/catalog");
      await expect(
        userPage.getByRole("heading", {
          name: "Esta conta está bloqueada",
        }),
      ).toBeVisible();
      expect([401, 403]).toContain(
        (await userPage.request.get("/api/catalog/creators")).status(),
      );
      expect(
        JSON.stringify(
          await (await companyPage.request.get("/api/catalog/creators")).json(),
        ),
      ).not.toContain("Creator Aceite");

      await userContext.clearCookies();
      await userPage.goto("/sign-up?intent=influencer");
      await userPage.getByLabel("E-mail").fill(email);
      await userPage.getByLabel("Senha", { exact: true }).fill("LocalTest123!");
      await userPage.getByLabel("Confirmar senha").fill("LocalTest123!");
      await fillCreatorProfileForm(userPage);
      await confirmOnboardingSubmission(userPage);
      await expect(
        userPage.getByText("Revise seu cadastro", { exact: true }),
      ).toBeVisible({ timeout: 20_000 });
      const deniedState = await readAcceptanceIdentityState(email);
      expect(deniedState.accountCount).toBe(1);
      expect(deniedState.authUserCount).toBe(1);

      await adminPage.goto(reviewPath);
      await applyModerationDecision(adminPage, {
        action: "Remover banimento",
        reason:
          "Recuperação excepcional aprovada e registrada pela jornada de aceite.",
        reasonLabel: "Motivo para remover o banimento",
        submit: "Confirmar recuperação",
      });
      await expect
        .poll(async () => (await readAcceptanceAccount(email))?.status, {
          timeout: 20_000,
        })
        .toBe("APPROVED");
      const recoveredState = await readAcceptanceIdentityState(email);
      expect(recoveredState.activeBlockCount).toBe(0);
      expect(recoveredState.moderationActions).toEqual(
        expect.arrayContaining(["BAN", "RESTORE", "SUSPEND", "UNBAN"]),
      );
    } finally {
      await userContext.close();
      await companyContext.close();
      await cleanupAcceptanceIdentity(email);
      await cleanupAcceptanceIdentity(adminEmail);
    }
  });

  test("creates, schedules, reorders, renders and expires a sponsored creator while suppressing an ineligible reference", async ({
    browser,
    page: adminPage,
  }, testInfo) => {
    runOnce(testInfo);
    test.setTimeout(120_000);
    const creatorEmail = acceptanceEmail("sponsorship-creator");
    const adminEmail = acceptanceEmail("sponsorship-admin");
    const title = `Destaque de aceite ${crypto.randomUUID().slice(0, 8)}`;
    await seedAcceptanceAccount({ email: adminEmail, role: "ADMIN" });
    const creator = await seedAcceptanceAccount({
      email: creatorEmail,
      status: "APPROVED",
    });
    const companyContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
    });
    const companyPage = await companyContext.newPage();
    const originHeaders = { Origin: "http://127.0.0.1:3000" };
    const scheduledStart = new Date(Date.now() + 60 * 60 * 1000);
    const scheduledEnd = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const activeStart = new Date(Date.now() - 60 * 60 * 1000);
    const activeEnd = new Date(Date.now() + 60 * 60 * 1000);

    const writePayload = {
      advertiserLabel: "Contente Creators",
      audience: "COMPANY",
      body: null,
      creativeAssetId: null,
      endsAt: scheduledEnd.toISOString(),
      featuredCreatorProfileId: creator.profileId ?? null,
      isActive: false,
      linkLabel: null,
      linkUrl: null,
      placementType: "FEATURED_CREATOR",
      reason: "Jornada de aceite de patrocínio do catálogo.",
      slotKey: "catalog-featured",
      sortOrder: 4,
      startsAt: scheduledStart.toISOString(),
      title,
    } as const;

    async function expectPlacementMutation(
      response: Awaited<ReturnType<typeof adminPage.request.post>>,
    ) {
      const responseBody = await response.json();
      expect(response.status(), JSON.stringify(responseBody)).toBeLessThan(300);

      return responseBody.placement as {
        id: string;
        sortOrder: number;
        state: string;
        version: number;
      };
    }

    try {
      await signInAsLocalAdmin(adminPage, "/backoffice/sponsorships", {
        email: adminEmail,
        password: "LocalTest123!",
      });
      await signInAcceptanceUser(companyPage, {
        email: "company-approved@contentecreators.test",
        nextPath: "/app/catalog",
      });

      let placement = await expectPlacementMutation(
        await adminPage.request.post("/api/backoffice/sponsorships", {
          data: writePayload,
          headers: originHeaders,
        }),
      );
      expect(placement.state).toBe("DRAFT");

      placement = await expectPlacementMutation(
        await adminPage.request.post(
          `/api/backoffice/sponsorships/${placement.id}/commands`,
          {
            data: {
              action: "ACTIVATE",
              expectedVersion: placement.version,
              reason: "Ativação agendada validada pela jornada de aceite.",
            },
            headers: originHeaders,
          },
        ),
      );
      expect(placement.state).toBe("SCHEDULED");

      placement = await expectPlacementMutation(
        await adminPage.request.patch(
          `/api/backoffice/sponsorships/${placement.id}`,
          {
            data: {
              ...writePayload,
              endsAt: activeEnd.toISOString(),
              expectedVersion: placement.version,
              reason: "Antecipação controlada para validar a renderização.",
              startsAt: activeStart.toISOString(),
            },
            headers: originHeaders,
          },
        ),
      );
      expect(placement.state).toBe("ACTIVE");

      placement = await expectPlacementMutation(
        await adminPage.request.post(
          `/api/backoffice/sponsorships/${placement.id}/commands`,
          {
            data: {
              action: "REORDER",
              expectedVersion: placement.version,
              reason: "Reordenação validada pela jornada de aceite.",
              sortOrder: 1,
            },
            headers: originHeaders,
          },
        ),
      );
      expect(placement.sortOrder).toBe(1);

      await companyPage.reload();
      await expect(
        companyPage.getByRole("article", {
          name: "Creator em destaque: Creator Aceite",
        }),
      ).toBeVisible();
      await expect(
        companyPage.getByText(/pagamento|comissão|preço/iu),
      ).toHaveCount(0);

      const reviewPath = `/backoffice/moderation/${creator.accountId}`;
      await adminPage.goto(reviewPath);
      await applyModerationDecision(adminPage, {
        action: "Suspender cadastro",
        reason: "Supressão de referência validada pela jornada de aceite.",
        reasonLabel: "Motivo para suspender",
        submit: "Confirmar suspensão",
      });
      await expect
        .poll(async () => (await readAcceptanceAccount(creatorEmail))?.status, {
          timeout: 20_000,
        })
        .toBe("SUSPENDED");
      await companyPage.reload();
      await expect(
        companyPage.getByRole("article", {
          name: "Creator em destaque: Creator Aceite",
        }),
      ).toHaveCount(0);

      await adminPage.goto(reviewPath);
      await applyModerationDecision(adminPage, {
        action: "Restaurar acesso",
        reason: "Referência restaurada após a validação de supressão.",
        reasonLabel: "Motivo para restaurar",
        submit: "Confirmar restauração",
      });
      await expect
        .poll(async () => (await readAcceptanceAccount(creatorEmail))?.status, {
          timeout: 20_000,
        })
        .toBe("APPROVED");
      await companyPage.reload();
      await expect(
        companyPage.getByRole("article", {
          name: "Creator em destaque: Creator Aceite",
        }),
      ).toBeVisible();

      placement = await expectPlacementMutation(
        await adminPage.request.patch(
          `/api/backoffice/sponsorships/${placement.id}`,
          {
            data: {
              ...writePayload,
              endsAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
              expectedVersion: placement.version,
              reason: "Expiração controlada validada pela jornada de aceite.",
              startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            },
            headers: originHeaders,
          },
        ),
      );
      expect(placement.state).toBe("EXPIRED");
      await companyPage.reload();
      await expect(
        companyPage.getByRole("article", {
          name: "Creator em destaque: Creator Aceite",
        }),
      ).toHaveCount(0);
    } finally {
      await companyContext.close();
      await cleanupAcceptanceIdentity(creatorEmail);
      await cleanupAcceptanceIdentity(adminEmail);
    }
  });

  test("supports multiple admins, revokes access, archives accounts, filters audit, reports metrics and retries failed email", async ({
    browser,
    page: primaryAdminPage,
  }, testInfo) => {
    runOnce(testInfo);
    test.setTimeout(120_000);
    const primaryAdminEmail = acceptanceEmail("operations-primary-admin");
    const secondaryAdminEmail = acceptanceEmail("operations-secondary-admin");
    const targetEmail = acceptanceEmail("operations-target");
    const primaryAdmin = await seedAcceptanceAccount({
      email: primaryAdminEmail,
      role: "ADMIN",
    });
    await seedAcceptanceAccount({
      email: secondaryAdminEmail,
      role: "ADMIN",
    });
    const target = await seedAcceptanceAccount({
      email: targetEmail,
      status: "APPROVED",
    });
    const outboxId = await seedAcceptanceDeadLetterEmail({
      accountId: target.accountId,
      recipientEmail: targetEmail,
    });
    const secondaryContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
    });
    const secondaryAdminPage = await secondaryContext.newPage();

    try {
      await signInAsLocalAdmin(primaryAdminPage, "/backoffice", {
        email: primaryAdminEmail,
        password: "LocalTest123!",
      });
      await signInAsLocalAdmin(secondaryAdminPage, "/backoffice", {
        email: secondaryAdminEmail,
        password: "LocalTest123!",
      });
      await expect(
        primaryAdminPage.getByRole("heading", { name: "Visão geral" }),
      ).toBeVisible();
      await expect(
        secondaryAdminPage.getByRole("heading", { name: "Visão geral" }),
      ).toBeVisible();

      await setAcceptanceAccountStatus(secondaryAdminEmail, "SUSPENDED");
      await secondaryAdminPage.goto("/backoffice");
      await expect(secondaryAdminPage).toHaveURL(
        /\/backoffice\/login\?error=unauthorized$/u,
      );
      await expect(
        primaryAdminPage.getByRole("heading", { name: "Visão geral" }),
      ).toBeVisible();

      const reviewPath = `/backoffice/moderation/${target.accountId}`;
      await primaryAdminPage.goto(reviewPath);
      await applyModerationDecision(primaryAdminPage, {
        action: "Arquivar cadastro",
        reason:
          "Arquivamento operacional validado pela jornada de aceite completa.",
        reasonLabel: "Motivo para arquivar",
        submit: "Confirmar arquivamento",
      });
      await expect
        .poll(
          async () => (await readAcceptanceAccount(targetEmail))?.archivedAt,
          { timeout: 20_000 },
        )
        .not.toBeNull();
      const archiveRevision = (
        await readAcceptanceAudit({
          accountId: primaryAdmin.accountId,
          entityName: "accounts",
        })
      ).find((revision) => revision.recordId === target.accountId);
      expect(archiveRevision).toMatchObject({
        action: "ARCHIVE",
        actorAccountId: primaryAdmin.accountId,
        source: "BACKOFFICE",
      });

      await primaryAdminPage.goto("/backoffice/audit");
      await primaryAdminPage.getByLabel("Entidade").fill("accounts");
      await primaryAdminPage
        .getByRole("combobox", { name: "Ação", exact: true })
        .click();
      await primaryAdminPage
        .getByRole("option", { name: "Arquivamento" })
        .click();
      await primaryAdminPage
        .getByRole("combobox", { name: "Origem", exact: true })
        .click();
      await primaryAdminPage
        .getByRole("option", { name: "Backoffice" })
        .click();
      await primaryAdminPage
        .getByRole("button", { name: "Aplicar filtros" })
        .click();
      await expect(primaryAdminPage).toHaveURL(
        new RegExp(
          "\\/backoffice\\/audit\\?.*entity=accounts.*action=ARCHIVE.*source=BACKOFFICE",
          "u",
        ),
      );
      await expect(
        primaryAdminPage
          .getByRole("region", { name: "Histórico de auditoria em tabela" })
          .getByText("Arquivamento")
          .first(),
      ).toBeVisible();

      await primaryAdminPage.goto("/backoffice");
      const summary = primaryAdminPage.getByRole("region", {
        name: "Resumo operacional",
      });
      await expect(
        summary.getByText("Influenciadores", { exact: true }),
      ).toBeVisible();
      await expect(
        summary.getByText("Empresas", { exact: true }),
      ).toBeVisible();
      await expect(
        summary.getByText("Aguardando análise", { exact: true }),
      ).toBeVisible();
      await expect(
        summary.getByText("Novos cadastros", { exact: true }),
      ).toBeVisible();

      await primaryAdminPage.goto(
        "/backoffice/emails?status=DEAD_LETTER&order=ATTENTION_FIRST&page=1&pageSize=20",
      );
      const reference = `E-mail #${outboxId.slice(0, 8).toLowerCase()}`;
      const emailTable = primaryAdminPage.getByRole("region", {
        name: "E-mails operacionais em tabela",
      });
      await expect(emailTable.getByText(reference)).toBeVisible();
      await emailTable
        .getByRole("button", {
          name: `Tentar novamente ${reference}`,
        })
        .click();
      await primaryAdminPage
        .getByLabel("Motivo do reenvio")
        .fill(
          "Falha sintética investigada; nova tentativa autorizada no aceite.",
        );
      await primaryAdminPage
        .getByRole("checkbox", {
          name: /Confirmo que investiguei a falha/iu,
        })
        .check();
      await primaryAdminPage
        .getByRole("button", { name: "Confirmar nova tentativa" })
        .click();
      await expect(
        primaryAdminPage.getByText("Nova tentativa programada").first(),
      ).toBeVisible({ timeout: 20_000 });
      await expect
        .poll(
          async () =>
            (await readAcceptanceOutbox(target.accountId)).find(
              (message) => message.id === outboxId,
            ),
          { timeout: 20_000 },
        )
        .toMatchObject({
          maxAttempts: 6,
        });
    } finally {
      await setAcceptanceAccountStatus(secondaryAdminEmail, "APPROVED");
      await secondaryContext.close();
      await cleanupAcceptanceIdentity(targetEmail);
      await cleanupAcceptanceIdentity(secondaryAdminEmail);
      await cleanupAcceptanceIdentity(primaryAdminEmail);
    }
  });
});
