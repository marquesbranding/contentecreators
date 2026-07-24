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
      additionalLocations: [
        {
          city: "Curitiba",
          complement: "",
          label: "Filial Sul",
          neighborhood: "Centro",
          number: "120",
          postalCode: "80010000",
          state: "PR",
          street: "Rua das Flores",
        },
        {
          city: "Recife",
          complement: "Sala 4",
          label: "Filial Nordeste",
          neighborhood: "Boa Viagem",
          number: "800",
          postalCode: "51020000",
          state: "PE",
          street: "Avenida Conselheiro Aguiar",
        },
      ],
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
      socialPlatform: "LINKEDIN",
      socialUrl: "https://linkedin.com/company/combined-company",
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
        completion_percentage: number;
        completion_version: number;
        location_count: number;
        moderation_count: number;
        primary_location_count: number;
        role: string;
        social_count: number;
        status: string;
      }[]
    >`
      select
        account.role::text,
        account.status::text,
        account.completion_percentage,
        account.completion_version,
        profile.cnpj,
        (
          select count(*)::integer
          from public.social_profiles social
          where social.owner_account_id = account.id
            and social.platform = 'LINKEDIN'
            and social.normalized_url = 'https://linkedin.com/company/combined-company'
        ) as social_count,
        (
          select count(*)::integer
          from public.company_locations location
          where location.company_profile_id = profile.id
        ) as location_count,
        (
          select count(*)::integer
          from public.company_locations location
          where location.company_profile_id = profile.id
            and location.is_primary
            and location.archived_at is null
        ) as primary_location_count,
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
      completion_percentage: 80,
      completion_version: 1,
      location_count: 3,
      moderation_count: 1,
      primary_location_count: 1,
      role: "COMPANY",
      social_count: 1,
      status: "PENDING_REVIEW",
    });
  });

  it("persists a role selected after Google before submitting the creator profile", async () => {
    const identityId = "91000000-0000-4000-8000-000000000002";
    const email = "google-creator@contentecreators.test";
    await insertConfirmedIdentity(identityId, email);
    const roleSelection = await roleRepository.selectInitialRole({
      email,
      identityId,
      requestId: "google-role-selection",
      role: "INFLUENCER",
    });
    const avatarAssetId = "79000000-0000-4000-8000-000000000011";
    const coverAssetId = "79000000-0000-4000-8000-000000000012";
    await sqlClient`
      insert into public.media_assets (
        id,
        owner_account_id,
        bucket_name,
        object_path,
        kind,
        mime_type,
        size_bytes,
        status
      )
      values
        (
          ${avatarAssetId},
          ${roleSelection.account.id},
          'profile-media',
          ${`${roleSelection.account.id}/avatar/${avatarAssetId}.png`},
          'AVATAR',
          'image/png',
          2048,
          'PENDING'
        ),
        (
          ${coverAssetId},
          ${roleSelection.account.id},
          'profile-media',
          ${`${roleSelection.account.id}/cover/${coverAssetId}.png`},
          'COVER',
          'image/png',
          4096,
          'PENDING'
        )
    `;
    const input = {
      avatarAssetId,
      bio: "Crio conteúdo de tecnologia e produtividade para a internet.",
      city: "Curitiba",
      contactVisibilityAccepted: true,
      coverAssetId,
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
        avatar_asset_id: string | null;
        contact_consent_count: number;
        cover_asset_id: string | null;
        email_visible: boolean;
        metric_count: number;
        media_active_count: number;
        role: string;
        social_visible: boolean;
        status: string;
        whatsapp_visible: boolean;
      }[]
    >`
      select
        account.role::text,
        account.status::text,
        profile.avatar_asset_id,
        profile.cover_asset_id,
        preference.email_visible_to_approved_companies as email_visible,
        preference.social_visible_to_approved_companies as social_visible,
        preference.whatsapp_visible_to_approved_companies as whatsapp_visible,
        (
          select count(*)::integer
          from public.creator_metric_snapshots metric
          where metric.creator_profile_id = profile.id
        ) as metric_count,
        (
          select count(*)::integer
          from public.account_consents consent
          join public.legal_documents document
            on document.id = consent.legal_document_id
          where consent.account_id = account.id
            and document.document_type = 'CONTACT_VISIBILITY'
        ) as contact_consent_count,
        (
          select count(*)::integer
          from public.media_assets media
          where media.id in (${avatarAssetId}, ${coverAssetId})
            and media.status = 'ACTIVE'
            and media.archived_at is null
        ) as media_active_count
      from public.accounts account
      join public.creator_profiles profile on profile.account_id = account.id
      join public.account_contact_preferences preference
        on preference.account_id = account.id
       and preference.archived_at is null
      where account.auth_user_id = ${identityId}
    `;

    expect(result).toEqual({
      avatar_asset_id: avatarAssetId,
      contact_consent_count: 1,
      cover_asset_id: coverAssetId,
      email_visible: true,
      media_active_count: 2,
      metric_count: 1,
      role: "INFLUENCER",
      social_visible: true,
      status: "PENDING_REVIEW",
      whatsapp_visible: true,
    });
  });

  it("activates owned company logo and cover in the Google profile transaction", async () => {
    const identityId = "91000000-0000-4000-8000-000000000004";
    const email = "google-company-media@contentecreators.test";
    await insertConfirmedIdentity(identityId, email);
    const roleSelection = await roleRepository.selectInitialRole({
      email,
      identityId,
      requestId: "google-company-media-role",
      role: "COMPANY",
    });
    const logoAssetId = "79000000-0000-4000-8000-000000000021";
    const coverAssetId = "79000000-0000-4000-8000-000000000022";
    await sqlClient`
      insert into public.media_assets (
        id,
        owner_account_id,
        bucket_name,
        object_path,
        kind,
        mime_type,
        size_bytes,
        status
      )
      values
        (
          ${logoAssetId},
          ${roleSelection.account.id},
          'profile-media',
          ${`${roleSelection.account.id}/logo/${logoAssetId}.png`},
          'LOGO',
          'image/png',
          2048,
          'PENDING'
        ),
        (
          ${coverAssetId},
          ${roleSelection.account.id},
          'profile-media',
          ${`${roleSelection.account.id}/cover/${coverAssetId}.png`},
          'COVER',
          'image/png',
          4096,
          'PENDING'
        )
    `;
    const input = {
      additionalLocations: [],
      city: "São Paulo",
      cnpj: "45723174000110",
      complement: "",
      coverAssetId,
      description:
        "Empresa de tecnologia que busca creators para campanhas institucionais.",
      employeeRange: "11_TO_50",
      legalName: "Google Company Media Ltda.",
      logoAssetId,
      neighborhood: "Centro",
      number: "100",
      postalCode: "01001000",
      privacyAccepted: true,
      role: "COMPANY",
      segment: "Tecnologia",
      state: "SP",
      street: "Praça da Sé",
      termsAccepted: true,
      tradeName: "Google Company Media",
      websiteUrl: "https://company-media.example/",
      whatsapp: "(11) 99999-9999",
    } satisfies GoogleProfileInput;

    await expect(
      repository.submitGoogleProfile({
        email,
        identityId,
        input,
        requestId: "google-company-media-submit",
      }),
    ).resolves.toEqual({ kind: "submitted" });

    const [result] = await sqlClient<
      {
        cover_asset_id: string | null;
        logo_asset_id: string | null;
        media_active_count: number;
        status: string;
      }[]
    >`
      select
        account.status::text,
        profile.logo_asset_id,
        profile.cover_asset_id,
        (
          select count(*)::integer
          from public.media_assets media
          where media.id in (${logoAssetId}, ${coverAssetId})
            and media.status = 'ACTIVE'
            and media.archived_at is null
        ) as media_active_count
      from public.accounts account
      join public.company_profiles profile on profile.account_id = account.id
      where account.auth_user_id = ${identityId}
    `;

    expect(result).toEqual({
      cover_asset_id: coverAssetId,
      logo_asset_id: logoAssetId,
      media_active_count: 2,
      status: "PENDING_REVIEW",
    });
  });

  it("rejects a creator media asset owned by another account", async () => {
    const identityId = "91000000-0000-4000-8000-000000000003";
    const email = "google-foreign-media@contentecreators.test";
    const foreignAssetId = "79000000-0000-4000-8000-000000000013";
    const foreignOwnerAccountId = "b0000000-0000-4000-8000-000000000001";
    await insertConfirmedIdentity(identityId, email);
    const roleSelection = await roleRepository.selectInitialRole({
      email,
      identityId,
      requestId: "google-foreign-media-role",
      role: "INFLUENCER",
    });
    await sqlClient`
      insert into public.media_assets (
        id,
        owner_account_id,
        bucket_name,
        object_path,
        kind,
        mime_type,
        size_bytes,
        status
      )
      values (
        ${foreignAssetId},
        ${foreignOwnerAccountId},
        'profile-media',
        ${`${foreignOwnerAccountId}/avatar/${foreignAssetId}.png`},
        'AVATAR',
        'image/png',
        2048,
        'PENDING'
      )
      on conflict (id) do nothing
    `;
    const input = {
      avatarAssetId: foreignAssetId,
      bio: "Crio conteúdo de tecnologia e produtividade para a internet.",
      city: "Curitiba",
      contactVisibilityAccepted: false,
      creatorType: "INFLUENCER",
      displayName: "Creator sem acesso",
      engagementRate: 4.5,
      followers: 25_000,
      legalName: "Creator sem acesso",
      nicheSlugs: ["tecnologia"],
      privacyAccepted: true,
      role: "INFLUENCER",
      socialPlatform: "INSTAGRAM",
      socialUrl: "https://instagram.com/creator_sem_acesso",
      state: "PR",
      termsAccepted: true,
      whatsapp: "(41) 99999-9999",
    } satisfies GoogleProfileInput;

    await expect(
      repository.submitGoogleProfile({
        email,
        identityId,
        input,
        requestId: "google-foreign-media-submit",
      }),
    ).rejects.toThrow("Profile media is unavailable");

    const [result] = await sqlClient<
      { profile_count: number; status: string }[]
    >`
      select
        (
          select count(*)::integer
          from public.creator_profiles profile
          where profile.account_id = ${roleSelection.account.id}
        ) as profile_count,
        media.status::text
      from public.media_assets media
      where media.id = ${foreignAssetId}
    `;

    expect(result).toEqual({
      profile_count: 0,
      status: "PENDING",
    });
  });
});
