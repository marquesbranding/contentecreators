import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

import { createDatabaseClient } from "@/db/client";
import { createAuditedTransactionRunner } from "@/features/audit/server";
import { createDrizzleRoleSelectionRepository } from "@/features/identity/server/repositories/drizzle-role-selection.repository";

import type {
  EmailRegistrationInput,
  GoogleProfileInput,
} from "../../schemas/onboarding-form-schema";
import { createDrizzleOnboardingRegistrationRepository } from "./drizzle-onboarding-registration.repository";

const localStackEnabled = process.env.RUN_LOCAL_STACK_TESTS === "true";
const describeLocalStack = localStackEnabled ? describe : describe.skip;
const databaseUrl = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sqlClient = postgres(databaseUrl, {
  connect_timeout: 5,
  idle_timeout: 1,
  max: 1,
});
const drizzleClient = createDatabaseClient(databaseUrl);
const runAuditedTransaction = createAuditedTransactionRunner(
  drizzleClient.database,
);
const repository = createDrizzleOnboardingRegistrationRepository({
  database: drizzleClient.database,
  runAuditedTransaction,
});
const roleRepository = createDrizzleRoleSelectionRepository({
  database: drizzleClient.database,
  runAuditedTransaction,
});

async function insertConfirmedIdentity(identityId: string, email: string) {
  await sqlClient`
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
      '00000000-0000-4000-8000-000000000000',
      ${identityId},
      'authenticated',
      'authenticated',
      ${email},
      extensions.crypt('LocalTest123!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"fixture":true}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    on conflict (id) do nothing
  `;
}

describeLocalStack("onboarding registration repository", () => {
  afterAll(async () => {
    await sqlClient.end({ timeout: 2 });
    await drizzleClient.client.end({ timeout: 2 });
  });

  it("persists one combined email/company registration and submits it after verification", async () => {
    const identityId = "91000000-0000-4000-8000-000000000001";
    const email = "combined-company@contentecreators.test";
    await insertConfirmedIdentity(identityId, email);
    const input = {
      city: "São Paulo",
      cnpj: "11222333000181",
      complement: "",
      description:
        "Empresa de tecnologia que busca creators para campanhas institucionais.",
      email,
      employeeRange: "11_TO_50",
      legalName: "Combined Company Ltda.",
      neighborhood: "Centro",
      number: "100",
      password: "LocalTest123!",
      passwordConfirmation: "LocalTest123!",
      postalCode: "01001000",
      privacyAccepted: true,
      role: "COMPANY",
      segment: "Tecnologia",
      state: "SP",
      street: "Praça da Sé",
      termsAccepted: true,
      tradeName: "Combined Company",
      websiteUrl: "https://example.com",
      whatsapp: "(11) 99999-9999",
    } satisfies EmailRegistrationInput;

    await repository.prepareEmailRegistration({
      identityId,
      input,
      requestId: "combined-email-prepare",
    });
    await expect(
      repository.finalizePreparedRegistration(identityId),
    ).resolves.toEqual({ kind: "submitted" });

    const [result] = await sqlClient<
      {
        cnpj: string;
        location_count: number;
        moderation_count: number;
        role: string;
        status: string;
      }[]
    >`
      select
        account.role::text,
        account.status::text,
        profile.cnpj,
        (
          select count(*)::integer
          from public.company_locations location
          where location.company_profile_id = profile.id
        ) as location_count,
        (
          select count(*)::integer
          from public.moderation_events event
          join public.moderation_cases moderation_case
            on moderation_case.id = event.moderation_case_id
          where moderation_case.account_id = account.id
            and event.action = 'SUBMIT'
        ) as moderation_count
      from public.accounts account
      join public.company_profiles profile on profile.account_id = account.id
      where account.auth_user_id = ${identityId}
    `;

    expect(result).toEqual({
      cnpj: "11222333000181",
      location_count: 1,
      moderation_count: 1,
      role: "COMPANY",
      status: "PENDING_REVIEW",
    });
  });

  it("persists a role selected after Google before submitting the creator profile", async () => {
    const identityId = "91000000-0000-4000-8000-000000000002";
    const email = "google-creator@contentecreators.test";
    await insertConfirmedIdentity(identityId, email);
    await roleRepository.selectInitialRole({
      email,
      identityId,
      requestId: "google-role-selection",
      role: "INFLUENCER",
    });
    const input = {
      bio: "Crio conteúdo de tecnologia e produtividade para a internet.",
      city: "Curitiba",
      creatorType: "INFLUENCER",
      displayName: "Creator Google",
      engagementRate: 4.5,
      followers: 25_000,
      legalName: "Creator de Teste",
      nicheSlugs: ["tecnologia"],
      privacyAccepted: true,
      role: "INFLUENCER",
      socialPlatform: "INSTAGRAM",
      socialUrl: "https://instagram.com/creator_google",
      state: "PR",
      termsAccepted: true,
      whatsapp: "(41) 99999-9999",
    } satisfies GoogleProfileInput;

    await expect(
      repository.submitGoogleProfile({
        email,
        identityId,
        input,
        requestId: "google-profile-submit",
      }),
    ).resolves.toEqual({ kind: "submitted" });

    const [result] = await sqlClient<
      {
        metric_count: number;
        role: string;
        status: string;
      }[]
    >`
      select
        account.role::text,
        account.status::text,
        (
          select count(*)::integer
          from public.creator_metric_snapshots metric
          where metric.creator_profile_id = profile.id
        ) as metric_count
      from public.accounts account
      join public.creator_profiles profile on profile.account_id = account.id
      where account.auth_user_id = ${identityId}
    `;

    expect(result).toEqual({
      metric_count: 1,
      role: "INFLUENCER",
      status: "PENDING_REVIEW",
    });
  });
});
