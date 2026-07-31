import { expect, type Page } from "@playwright/test";
import postgres, { type Sql } from "postgres";

const LOCAL_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const LOCAL_PASSWORD = "LocalTest123!";
const LOCAL_DOMAIN = "contentecreators.test";
const LOCAL_AUTH_INBOX_URL =
  process.env.LOCAL_AUTH_MAILPIT_URL ?? "http://127.0.0.1:54324";

interface MailpitMessageSummary {
  ID: string;
  To: Array<{ Address: string }>;
}

interface MailpitSearchResponse {
  messages: MailpitMessageSummary[];
}

export interface SeededAcceptanceAccount {
  accountId: string;
  authUserId: string;
  email: string;
  profileId?: string;
}

function assertLocalAcceptanceTarget() {
  const database = new URL(LOCAL_DATABASE_URL);

  if (
    !["127.0.0.1", "localhost", "::1"].includes(database.hostname) ||
    database.port !== "54322"
  ) {
    throw new Error(
      "Acceptance fixtures may only target the local Supabase database.",
    );
  }
}

async function withLocalDatabase<T>(operation: (sql: Sql) => Promise<T>) {
  assertLocalAcceptanceTarget();
  const sql = postgres(LOCAL_DATABASE_URL, {
    max: 1,
    prepare: false,
  });

  try {
    return await operation(sql);
  } finally {
    await sql.end();
  }
}

export function acceptanceEmail(label: string) {
  return `${label}-${crypto.randomUUID()}@${LOCAL_DOMAIN}`;
}

export function makeValidCnpj(seed = Date.now()) {
  const base = String(seed).replace(/\D/gu, "").padStart(12, "0").slice(-12);
  const digits = base.split("").map(Number);
  const calculateDigit = (values: number[], weights: number[]) => {
    const sum = values.reduce(
      (total, value, index) => total + value * (weights[index] ?? 0),
      0,
    );
    const remainder = sum % 11;

    return remainder < 2 ? 0 : 11 - remainder;
  };
  const firstDigit = calculateDigit(
    digits,
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const secondDigit = calculateDigit(
    [...digits, firstDigit],
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return `${base}${firstDigit}${secondDigit}`;
}

export async function seedRolelessAcceptanceIdentity(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail.endsWith(`@${LOCAL_DOMAIN}`)) {
    throw new Error(
      "Acceptance identities must use the synthetic .test domain.",
    );
  }

  await cleanupAcceptanceIdentity(normalizedEmail);
  const authUserId = crypto.randomUUID();

  await withLocalDatabase(async (sql) => {
    await sql`
      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
      )
      values (
        '00000000-0000-0000-0000-000000000000'::uuid,
        ${authUserId}::uuid,
        'authenticated',
        'authenticated',
        ${normalizedEmail},
        extensions.crypt(${LOCAL_PASSWORD}, extensions.gen_salt('bf')),
        now(),
        '{"provider":"google","providers":["google","email"]}'::jsonb,
        '{"fixture":true,"source":"acceptance-google-substitute"}'::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        ''
      )
    `;
    await sql`
      insert into auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      )
      values (
        ${authUserId}::text,
        ${authUserId}::uuid,
        jsonb_build_object(
          'sub', ${authUserId}::text,
          'email', ${normalizedEmail}::text,
          'email_verified', true,
          'phone_verified', false
        ),
        'email',
        now(),
        now(),
        now()
      )
    `;
  });

  return { authUserId, email: normalizedEmail };
}

export async function seedAcceptanceAccount(input: {
  email: string;
  role?: "ADMIN" | "INFLUENCER";
  status?: "APPROVED" | "CHANGES_REQUESTED" | "PENDING_REVIEW";
}) {
  const role = input.role ?? "INFLUENCER";
  const status = input.status ?? "APPROVED";
  const identity = await seedRolelessAcceptanceIdentity(input.email);
  const accountId = crypto.randomUUID();
  const profileId = role === "INFLUENCER" ? crypto.randomUUID() : undefined;
  const avatarAssetId = role === "INFLUENCER" ? crypto.randomUUID() : undefined;
  const coverAssetId = role === "INFLUENCER" ? crypto.randomUUID() : undefined;
  const moderationCaseId =
    role === "INFLUENCER" ? crypto.randomUUID() : undefined;

  await withLocalDatabase(async (sql) => {
    await sql`
      insert into public.accounts (
        id,
        auth_user_id,
        role,
        status,
        operational_email,
        submitted_at,
        approved_at,
        completion_percentage
      )
      values (
        ${accountId}::uuid,
        ${identity.authUserId}::uuid,
        ${role}::public.account_role,
        ${status}::public.account_status,
        ${identity.email},
        case when ${role} = 'ADMIN' then now() - interval '30 days' else now() - interval '2 days' end,
        case when ${status} = 'APPROVED' then now() - interval '1 day' else null end,
        100
      )
    `;

    if (
      role !== "INFLUENCER" ||
      !profileId ||
      !avatarAssetId ||
      !coverAssetId ||
      !moderationCaseId
    ) {
      return;
    }

    await sql`
      insert into public.media_assets (
        id,
        owner_account_id,
        bucket_name,
        object_path,
        kind,
        mime_type,
        size_bytes,
        width,
        height,
        status
      )
      values
        (
          ${avatarAssetId}::uuid,
          ${accountId}::uuid,
          'profile-media',
          ${`${accountId}/acceptance-avatar.webp`},
          'AVATAR',
          'image/webp',
          1024,
          640,
          640,
          'ACTIVE'
        ),
        (
          ${coverAssetId}::uuid,
          ${accountId}::uuid,
          'profile-media',
          ${`${accountId}/acceptance-cover.webp`},
          'COVER',
          'image/webp',
          2048,
          1280,
          720,
          'ACTIVE'
        )
    `;
    await sql`
      insert into public.creator_profiles (
        id,
        account_id,
        legal_name,
        display_name,
        whatsapp_e164,
        bio,
        creator_type,
        city,
        state,
        avatar_asset_id,
        cover_asset_id
      )
      values (
        ${profileId}::uuid,
        ${accountId}::uuid,
        'Creator de Aceite',
        'Creator Aceite',
        '+5511999999999',
        'Perfil sintético criado exclusivamente para a jornada de aceite.',
        'INFLUENCER',
        'São Paulo',
        'SP',
        ${avatarAssetId}::uuid,
        ${coverAssetId}::uuid
      )
    `;
    const [social] = await sql<{ id: string }[]>`
      insert into public.social_profiles (
        owner_account_id,
        platform,
        handle,
        normalized_url,
        sort_order
      )
      values (
        ${accountId}::uuid,
        'INSTAGRAM',
        '@creator_aceite',
        'https://instagram.com/creator_aceite',
        0
      )
      returning id
    `;
    await sql`
      insert into public.creator_metric_snapshots (
        creator_profile_id,
        social_profile_id,
        platform,
        follower_count,
        engagement_rate,
        observed_on
      )
      values (
        ${profileId}::uuid,
        ${social?.id ?? null}::uuid,
        'INSTAGRAM',
        12000,
        4.75,
        current_date
      )
    `;
    await sql`
      insert into public.creator_niches (creator_profile_id, niche_id)
      select ${profileId}::uuid, id
      from public.niches
      where slug = 'tecnologia'
      limit 1
    `;
    await sql`
      insert into public.account_consents (
        account_id,
        legal_document_id,
        request_id,
        context
      )
      select
        ${accountId}::uuid,
        id,
        'acceptance-fixture',
        '{"fixture":true}'::jsonb
      from public.legal_documents
      where retired_at is null
    `;
    await sql`
      insert into public.account_contact_preferences (
        account_id,
        consent_document_id,
        email_visible_to_approved_companies,
        whatsapp_visible_to_approved_companies,
        social_visible_to_approved_companies
      )
      select
        ${accountId}::uuid,
        id,
        true,
        true,
        true
      from public.legal_documents
      where document_type = 'CONTACT_VISIBILITY'
        and retired_at is null
      order by active_from desc
      limit 1
    `;
    await sql`
      insert into public.moderation_cases (
        id,
        account_id,
        current_submission_sequence,
        submitted_at,
        resolved_at
      )
      values (
        ${moderationCaseId}::uuid,
        ${accountId}::uuid,
        1,
        now() - interval '2 days',
        case when ${status} = 'APPROVED' then now() - interval '1 day' else null end
      )
    `;
    await sql`
      insert into public.moderation_events (
        moderation_case_id,
        submission_sequence,
        from_status,
        to_status,
        action,
        reason,
        actor_account_id,
        idempotency_key,
        occurred_at
      )
      values (
        ${moderationCaseId}::uuid,
        1,
        case
          when ${status} = 'PENDING_REVIEW' then 'ONBOARDING'::public.account_status
          else 'PENDING_REVIEW'::public.account_status
        end,
        ${status}::public.account_status,
        case
          when ${status} = 'APPROVED' then 'APPROVE'::public.moderation_action
          when ${status} = 'CHANGES_REQUESTED' then 'REQUEST_CHANGES'::public.moderation_action
          else 'SUBMIT'::public.moderation_action
        end,
        case when ${status} = 'CHANGES_REQUESTED' then 'Revise os dados do perfil sintético.' else null end,
        case when ${status} = 'PENDING_REVIEW' then ${accountId}::uuid else 'a0000000-0000-4000-8000-000000000001'::uuid end,
        ${`acceptance-fixture:${accountId}:${status.toLowerCase()}`},
        now() - interval '1 day'
      )
    `;
  });

  return {
    accountId,
    authUserId: identity.authUserId,
    email: identity.email,
    profileId,
  } satisfies SeededAcceptanceAccount;
}

export async function cleanupAcceptanceIdentity(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail.endsWith(`@${LOCAL_DOMAIN}`)) {
    throw new Error(
      "Acceptance cleanup only accepts synthetic .test identities.",
    );
  }

  await withLocalDatabase(async (sql) => {
    await sql.begin(async (transaction) => {
      await transaction.unsafe("set local session_replication_role = replica");
      const accounts = await transaction<{ id: string }[]>`
        select id
        from public.accounts
        where operational_email = ${normalizedEmail}
      `;
      const accountIds = accounts.map((account) => account.id);

      if (accountIds.length > 0) {
        const profiles = await transaction<{ id: string }[]>`
          select id from public.creator_profiles where account_id = any(${accountIds}::uuid[])
        `;
        const companyProfiles = await transaction<{ id: string }[]>`
          select id from public.company_profiles where account_id = any(${accountIds}::uuid[])
        `;
        const cases = await transaction<{ id: string }[]>`
          select id from public.moderation_cases where account_id = any(${accountIds}::uuid[])
        `;
        const outbox = await transaction<{ id: string }[]>`
          select id from public.email_outbox where account_id = any(${accountIds}::uuid[])
        `;
        const profileIds = profiles.map((profile) => profile.id);
        const companyProfileIds = companyProfiles.map((profile) => profile.id);
        const caseIds = cases.map((moderationCase) => moderationCase.id);
        const outboxIds = outbox.map((item) => item.id);

        if (outboxIds.length > 0) {
          await transaction`
            delete from public.email_attempts where outbox_id = any(${outboxIds}::uuid[])
          `;
        }
        await transaction`
          delete from public.identity_auth_effects where account_id = any(${accountIds}::uuid[])
        `;
        await transaction`
          delete from public.blocked_identities
          where originating_account_id = any(${accountIds}::uuid[])
             or blocked_by_account_id = any(${accountIds}::uuid[])
             or unblocked_by_account_id = any(${accountIds}::uuid[])
        `;
        await transaction`
          delete from public.sponsorship_placements
          where advertiser_account_id = any(${accountIds}::uuid[])
             or featured_creator_profile_id = any(${profileIds}::uuid[])
        `;
        await transaction`
          delete from public.audit_revisions
          where actor_account_id = any(${accountIds}::uuid[])
             or entity_id = any(${[...accountIds, ...profileIds, ...companyProfileIds]}::text[])
        `;
        if (caseIds.length > 0) {
          await transaction`
            delete from public.moderation_events where moderation_case_id = any(${caseIds}::uuid[])
          `;
        }
        await transaction`
          delete from public.email_outbox where account_id = any(${accountIds}::uuid[])
        `;
        await transaction`
          delete from public.account_consents where account_id = any(${accountIds}::uuid[])
        `;
        await transaction`
          delete from public.account_contact_preferences where account_id = any(${accountIds}::uuid[])
        `;
        await transaction`
          delete from public.onboarding_drafts where account_id = any(${accountIds}::uuid[])
        `;
        await transaction`
          delete from public.creator_metric_snapshots where creator_profile_id = any(${profileIds}::uuid[])
        `;
        await transaction`
          delete from public.creator_niches where creator_profile_id = any(${profileIds}::uuid[])
        `;
        await transaction`
          delete from public.company_locations where company_profile_id = any(${companyProfileIds}::uuid[])
        `;
        await transaction`
          delete from public.social_profiles where owner_account_id = any(${accountIds}::uuid[])
        `;
        await transaction`
          delete from public.moderation_cases where account_id = any(${accountIds}::uuid[])
        `;
        await transaction`
          delete from public.creator_profiles where account_id = any(${accountIds}::uuid[])
        `;
        await transaction`
          delete from public.company_profiles where account_id = any(${accountIds}::uuid[])
        `;
        await transaction`
          delete from public.media_assets where owner_account_id = any(${accountIds}::uuid[])
        `;
        await transaction`
          delete from public.accounts where id = any(${accountIds}::uuid[])
        `;
      }

      const authUsers = await transaction<{ id: string }[]>`
        select id from auth.users where lower(email) = ${normalizedEmail}
      `;
      const authUserIds = authUsers.map((user) => user.id);

      if (authUserIds.length > 0) {
        await transaction`
          delete from auth.identities where user_id = any(${authUserIds}::uuid[])
        `;
        await transaction`
          delete from auth.sessions where user_id = any(${authUserIds}::uuid[])
        `;
        await transaction`
          delete from auth.refresh_tokens where user_id = any(${authUserIds}::text[])
        `;
        await transaction`
          delete from auth.users where id = any(${authUserIds}::uuid[])
        `;
      }
    });
  });
}

export async function readAcceptanceAccount(email: string) {
  return withLocalDatabase(async (sql) => {
    const [account] = await sql<
      Array<{
        archivedAt: string | null;
        id: string;
        role: string;
        status: string;
        version: number;
      }>
    >`
      select
        archived_at::text as "archivedAt",
        id,
        role::text,
        status::text,
        version
      from public.accounts
      where operational_email = ${email.trim().toLowerCase()}
      limit 1
    `;

    return account ?? null;
  });
}

export async function readAcceptanceAudit(input: {
  accountId: string;
  entityName?: string;
}) {
  return withLocalDatabase(async (sql) => {
    return sql<
      Array<{
        action: string;
        actorAccountId: string | null;
        changedFields: string[];
        entityName: string;
        recordId: string;
        source: string;
      }>
    >`
      select
        operation::text as action,
        actor_account_id::text as "actorAccountId",
        changed_fields as "changedFields",
        entity_table as "entityName",
        entity_id as "recordId",
        source::text
      from public.audit_revisions
      where (
        actor_account_id = ${input.accountId}::uuid
        or entity_id = ${input.accountId}
      )
      and (${input.entityName ?? null}::text is null or entity_table = ${input.entityName ?? null})
      order by revision desc
    `;
  });
}

export async function readAcceptanceOutbox(accountId: string) {
  return withLocalDatabase(async (sql) => {
    return sql<
      Array<{
        id: string;
        maxAttempts: number;
        recipientEmail: string;
        status: string;
        template: string;
      }>
    >`
      select
        id,
        max_attempts as "maxAttempts",
        recipient_email as "recipientEmail",
        status::text,
        template::text
      from public.email_outbox
      where account_id = ${accountId}::uuid
      order by created_at, id
    `;
  });
}

export async function setAcceptanceAccountStatus(
  email: string,
  status: "APPROVED" | "SUSPENDED",
) {
  await withLocalDatabase(async (sql) => {
    await sql`
      update public.accounts
      set status = ${status}::public.account_status
      where operational_email = ${email.trim().toLowerCase()}
    `;
  });
}

export async function seedAcceptanceDeadLetterEmail(input: {
  accountId: string;
  recipientEmail: string;
}) {
  return withLocalDatabase(async (sql) => {
    const outboxId = crypto.randomUUID();

    await sql`
      insert into public.email_outbox (
        id,
        account_id,
        template,
        recipient_email,
        payload,
        status,
        idempotency_key,
        attempt_count,
        max_attempts,
        last_error_category,
        last_error_code
      )
      values (
        ${outboxId}::uuid,
        ${input.accountId}::uuid,
        'APPROVED',
        ${input.recipientEmail.trim().toLowerCase()},
        '{}'::jsonb,
        'DEAD_LETTER',
        ${`acceptance-dead-letter:${outboxId}`},
        5,
        5,
        'SMTP',
        'ACCEPTANCE_FAILURE'
      )
    `;

    return outboxId;
  });
}

export async function readAcceptanceIdentityState(email: string) {
  return withLocalDatabase(async (sql) => {
    const [state] = await sql<
      Array<{
        accountCount: number;
        activeBlockCount: number;
        authUserCount: number;
        moderationActions: string[];
      }>
    >`
      select
        (
          select count(*)::integer
          from public.accounts
          where lower(operational_email) = ${email.trim().toLowerCase()}
        ) as "accountCount",
        (
          select count(*)::integer
          from auth.users
          where lower(email) = ${email.trim().toLowerCase()}
        ) as "authUserCount",
        (
          select count(*)::integer
          from public.blocked_identities blocked
          inner join public.accounts account
            on account.id = blocked.originating_account_id
          where lower(account.operational_email) = ${email.trim().toLowerCase()}
            and blocked.unblocked_at is null
            and blocked.archived_at is null
        ) as "activeBlockCount",
        coalesce(
          (
            select array_agg(event.action::text order by event.occurred_at, event.id)
            from public.moderation_events event
            inner join public.moderation_cases moderation_case
              on moderation_case.id = event.moderation_case_id
            inner join public.accounts account
              on account.id = moderation_case.account_id
            where lower(account.operational_email) = ${email.trim().toLowerCase()}
          ),
          array[]::text[]
        ) as "moderationActions"
    `;

    return state;
  });
}

export async function signInAcceptanceUser(
  page: Page,
  input: {
    backoffice?: boolean;
    email: string;
    nextPath: string;
    password?: string;
  },
) {
  const loginPath = input.backoffice ? "/backoffice/login" : "/login";

  await page.goto(`${loginPath}?next=${encodeURIComponent(input.nextPath)}`);
  await page.getByLabel("E-mail").fill(input.email);
  await page
    .getByLabel("Senha", { exact: true })
    .fill(input.password ?? LOCAL_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();

  try {
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 5_000 })
      .toBe(new URL(input.nextPath, "http://localhost").pathname);
  } catch {
    await page.goto(input.nextPath);
  }

  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
    .toBe(new URL(input.nextPath, "http://localhost").pathname);
}

export async function waitForConfirmationLink(email: string) {
  const deadline = Date.now() + 15_000;
  const query = encodeURIComponent(`to:${email}`);

  while (Date.now() < deadline) {
    const response = await fetch(
      `${LOCAL_AUTH_INBOX_URL}/api/v1/search?query=${query}`,
      { signal: AbortSignal.timeout(2_000) },
    );

    if (response.ok) {
      const inbox = (await response.json()) as MailpitSearchResponse;
      const message = inbox.messages.find((candidate) =>
        candidate.To.some(
          (address) => address.Address.toLowerCase() === email.toLowerCase(),
        ),
      );

      if (message) {
        const rawResponse = await fetch(
          `${LOCAL_AUTH_INBOX_URL}/api/v1/message/${message.ID}/raw`,
          { signal: AbortSignal.timeout(2_000) },
        );
        const decoded = (await rawResponse.text())
          .replace(/=\r?\n/gu, "")
          .replace(/=3D/gu, "=")
          .replace(/&amp;/gu, "&");
        const link = decoded.match(
          /https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]+/u,
        )?.[0];

        if (link) {
          return link;
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(`No local confirmation link was captured for ${email}.`);
}

export async function fillCreatorProfileForm(page: Page) {
  await page.getByLabel("Nome completo").fill("Creator Jornada Aceite");
  await page.getByLabel("Nome de creator").fill("Creator Jornada");
  await page.getByLabel("Tipo de atuação").click();
  await page.getByRole("option", { name: "Influencer", exact: true }).click();
  await page.getByLabel("Número de seguidores").fill("15000");
  await page.getByLabel("Taxa de engajamento (%)").fill("5");
  await page.getByLabel("WhatsApp com DDD").fill("(11) 99999-9999");
  await page
    .getByLabel("Conte sobre seu conteúdo")
    .fill("Crio conteúdo sobre tecnologia, cultura e negócios locais.");
  await page.getByLabel("Canal principal").click();
  await page.getByRole("option", { name: "Instagram", exact: true }).click();
  await page
    .getByLabel("Link do perfil")
    .fill("https://instagram.com/creator_jornada");
  await page.getByRole("checkbox", { name: "Tecnologia" }).check();
  await page.getByLabel("Cidade", { exact: true }).fill("São Paulo");
  await page.getByLabel("UF", { exact: true }).click();
  await page.getByRole("option", { name: "SP", exact: true }).click();
  await page
    .getByRole("checkbox", { name: /Li e aceito os Termos de Uso/iu })
    .check();
  await page
    .getByRole("checkbox", { name: /Li e aceito a Política de Privacidade/iu })
    .check();
}

export async function fillCompanyProfileForm(
  page: Page,
  input: {
    cnpj: string;
    legalName?: string;
    tradeName?: string;
  },
) {
  await page
    .getByLabel("Razão social")
    .fill(input.legalName ?? "Empresa Jornada de Aceite Ltda.");
  await page
    .getByLabel("Nome fantasia")
    .fill(input.tradeName ?? "Empresa Jornada");
  await page.getByLabel("CNPJ").fill(input.cnpj);
  await page.getByLabel("Segmento").click();
  await page.getByRole("option", { name: "Tecnologia", exact: true }).click();
  await page.getByLabel("Tamanho da empresa").click();
  await page
    .getByRole("option", { name: "11 a 50 pessoas", exact: true })
    .click();
  await page.getByLabel("WhatsApp com DDD").fill("(11) 98888-7777");
  await page
    .getByLabel("Apresente a empresa")
    .fill("Empresa sintética para validar o fluxo completo de aceite.");
  await page.getByLabel("CEP").fill("01001-000");
  await page.getByLabel("Logradouro").fill("Praça da Sé");
  await page.getByLabel("Número").fill("100");
  await page.getByLabel("Bairro").fill("Sé");
  await page.getByLabel("Cidade", { exact: true }).fill("São Paulo");
  await page.getByLabel("UF", { exact: true }).click();
  await page.getByRole("option", { name: "SP", exact: true }).click();
  await page
    .getByRole("checkbox", { name: /Li e aceito os Termos de Uso/iu })
    .check();
  await page
    .getByRole("checkbox", { name: /Li e aceito a Política de Privacidade/iu })
    .check();
}

export async function confirmOnboardingSubmission(page: Page) {
  await page
    .getByRole("button", {
      name: /enviar perfil para análise|criar conta e enviar perfil/iu,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Enviar cadastro para análise?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirmar envio" }).click();
}
