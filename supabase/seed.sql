-- Synthetic local-only fixtures. Never copy these identities, passwords, legal
-- placeholders, or moderation records to a hosted environment.

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
select
  -- GoTrue's local default instance is the nil UUID. Using a synthetic
  -- versioned UUID here makes otherwise valid fixtures invisible to Auth.
  '00000000-0000-0000-0000-000000000000'::uuid,
  fixture.id,
  'authenticated',
  'authenticated',
  fixture.email,
  extensions.crypt(
    case
      when fixture.email = 'admin@contentecreators.test'
        then 'ContenteCreators@01'
      else 'LocalTest123!'
    end,
    extensions.gen_salt('bf')
  ),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', fixture.display_name, 'fixture', true),
  now(),
  now(),
  '',
  '',
  '',
  ''
from (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'admin@contentecreators.test', 'Admin Local'),
    ('20000000-0000-4000-8000-000000000001'::uuid, 'creator-onboarding@contentecreators.test', 'Criadora Onboarding'),
    ('20000000-0000-4000-8000-000000000002'::uuid, 'creator-pending@contentecreators.test', 'Criador Pendente'),
    ('20000000-0000-4000-8000-000000000003'::uuid, 'creator-changes@contentecreators.test', 'Criadora Correções'),
    ('20000000-0000-4000-8000-000000000004'::uuid, 'creator-approved@contentecreators.test', 'Criador Aprovado'),
    ('20000000-0000-4000-8000-000000000005'::uuid, 'creator-suspended@contentecreators.test', 'Criadora Suspensa'),
    ('20000000-0000-4000-8000-000000000006'::uuid, 'ugc-banned@contentecreators.test', 'UGC Banido'),
    ('20000000-0000-4000-8000-000000000007'::uuid, 'creator-approved-private@contentecreators.test', 'Creator Aprovada sem contato'),
    ('30000000-0000-4000-8000-000000000001'::uuid, 'company-onboarding@contentecreators.test', 'Empresa Onboarding'),
    ('30000000-0000-4000-8000-000000000002'::uuid, 'company-pending@contentecreators.test', 'Empresa Pendente'),
    ('30000000-0000-4000-8000-000000000003'::uuid, 'company-changes@contentecreators.test', 'Empresa Correções'),
    ('30000000-0000-4000-8000-000000000004'::uuid, 'company-approved@contentecreators.test', 'Empresa Aprovada'),
    ('30000000-0000-4000-8000-000000000005'::uuid, 'company-suspended@contentecreators.test', 'Empresa Suspensa'),
    ('30000000-0000-4000-8000-000000000006'::uuid, 'company-banned@contentecreators.test', 'Empresa Banida'),
    ('40000000-0000-4000-8000-000000000001'::uuid, 'role-choice-e2e@contentecreators.test', 'Perfil sem papel')
) as fixture(id, email, display_name);

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  id::text,
  id,
  jsonb_build_object(
    'sub', id::text,
    'email', email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
from auth.users
where email like '%@contentecreators.test';

insert into public.accounts (
  id,
  auth_user_id,
  role,
  status,
  operational_email,
  submitted_at,
  approved_at,
  suspended_at,
  banned_at,
  completion_percentage
)
values
  ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'ADMIN', 'APPROVED', 'admin@contentecreators.test', now() - interval '90 days', now() - interval '89 days', null, null, 100),
  ('b0000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'INFLUENCER', 'ONBOARDING', 'creator-onboarding@contentecreators.test', null, null, null, null, 30),
  ('b0000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'INFLUENCER', 'PENDING_REVIEW', 'creator-pending@contentecreators.test', now() - interval '2 days', null, null, null, 80),
  ('b0000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'INFLUENCER', 'CHANGES_REQUESTED', 'creator-changes@contentecreators.test', now() - interval '5 days', null, null, null, 75),
  ('b0000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', 'INFLUENCER', 'APPROVED', 'creator-approved@contentecreators.test', now() - interval '20 days', now() - interval '19 days', null, null, 100),
  ('b0000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000005', 'INFLUENCER', 'SUSPENDED', 'creator-suspended@contentecreators.test', now() - interval '30 days', now() - interval '29 days', now() - interval '1 day', null, 95),
  ('b0000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000006', 'INFLUENCER', 'BANNED', 'ugc-banned@contentecreators.test', now() - interval '12 days', null, null, now() - interval '10 days', 85),
  ('b0000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000007', 'INFLUENCER', 'APPROVED', 'creator-approved-private@contentecreators.test', now() - interval '18 days', now() - interval '17 days', null, null, 100),
  ('c0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'COMPANY', 'ONBOARDING', 'company-onboarding@contentecreators.test', null, null, null, null, 25),
  ('c0000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'COMPANY', 'PENDING_REVIEW', 'company-pending@contentecreators.test', now() - interval '3 days', null, null, null, 80),
  ('c0000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'COMPANY', 'CHANGES_REQUESTED', 'company-changes@contentecreators.test', now() - interval '7 days', null, null, null, 70),
  ('c0000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'COMPANY', 'APPROVED', 'company-approved@contentecreators.test', now() - interval '40 days', now() - interval '39 days', null, null, 100),
  ('c0000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'COMPANY', 'SUSPENDED', 'company-suspended@contentecreators.test', now() - interval '50 days', now() - interval '49 days', now() - interval '2 days', null, 90),
  ('c0000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000006', 'COMPANY', 'BANNED', 'company-banned@contentecreators.test', now() - interval '14 days', null, null, now() - interval '13 days', 75);

insert into public.creator_profiles (
  id,
  account_id,
  legal_name,
  display_name,
  whatsapp_e164,
  bio,
  creator_type,
  city,
  state
)
select
  ('d0000000-0000-4000-8000-' || right(account.id::text, 12))::uuid,
  account.id,
  fixture.legal_name,
  fixture.display_name,
  '+551199999' || right(account.id::text, 4),
  fixture.bio,
  fixture.creator_type::public.creator_type,
  fixture.city,
  fixture.state
from public.accounts account
join (
  values
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'Ana Exemplo', 'Ana Cria', 'Perfil sintético em preenchimento.', 'INFLUENCER', 'São Paulo', 'SP'),
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'Bruno Exemplo', 'Bruno Conteúdo', 'Perfil sintético aguardando análise.', 'INFLUENCER', 'Campinas', 'SP'),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'Carla Exemplo', 'Carla em Cena', 'Perfil sintético com correções solicitadas.', 'INFLUENCER', 'Curitiba', 'PR'),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'Diego Exemplo', 'Diego Aprova', 'Perfil sintético aprovado para testes do catálogo.', 'INFLUENCER', 'Rio de Janeiro', 'RJ'),
    ('b0000000-0000-4000-8000-000000000005'::uuid, 'Elisa Exemplo', 'Elisa Pausada', 'Perfil sintético suspenso.', 'INFLUENCER', 'Belo Horizonte', 'MG'),
    ('b0000000-0000-4000-8000-000000000006'::uuid, 'Fábio Exemplo', 'Fábio UGC', 'Perfil UGC sintético e bloqueado.', 'UGC', 'Salvador', 'BA'),
    ('b0000000-0000-4000-8000-000000000007'::uuid, 'Gabriela Exemplo', 'Gabi Conecta', 'Perfil sintético aprovado sem compartilhamento de contato.', 'UGC', 'Florianópolis', 'SC')
) as fixture(account_id, legal_name, display_name, bio, creator_type, city, state)
  on fixture.account_id = account.id;

insert into public.company_profiles (
  id,
  account_id,
  legal_name,
  trade_name,
  cnpj,
  employee_range,
  segment,
  whatsapp_e164,
  description,
  website_url
)
select
  ('e0000000-0000-4000-8000-' || right(account.id::text, 12))::uuid,
  account.id,
  fixture.legal_name,
  fixture.trade_name,
  fixture.cnpj,
  fixture.employee_range,
  fixture.segment,
  '+551188888' || right(account.id::text, 4),
  fixture.description,
  fixture.website_url
from public.accounts account
join (
  values
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'Empresa Um Exemplo Ltda', 'Empresa Um', '12345678000195', 'UP_TO_10', 'Varejo', 'Empresa sintética em preenchimento.', 'https://example.test/empresa-um'),
    ('c0000000-0000-4000-8000-000000000002'::uuid, 'Empresa Dois Exemplo Ltda', 'Empresa Dois', '12345678000276', '11_TO_50', 'Tecnologia', 'Empresa sintética aguardando análise.', 'https://example.test/empresa-dois'),
    ('c0000000-0000-4000-8000-000000000003'::uuid, 'Empresa Três Exemplo Ltda', 'Empresa Três', '12345678000357', '11_TO_50', 'Moda', 'Empresa sintética com correções.', 'https://example.test/empresa-tres'),
    ('c0000000-0000-4000-8000-000000000004'::uuid, 'Empresa Quatro Exemplo Ltda', 'Empresa Quatro', '12345678000438', '51_TO_200', 'Alimentação', 'Empresa sintética aprovada.', 'https://example.test/empresa-quatro'),
    ('c0000000-0000-4000-8000-000000000005'::uuid, 'Empresa Cinco Exemplo Ltda', 'Empresa Cinco', '12345678000519', '51_TO_200', 'Turismo', 'Empresa sintética suspensa.', 'https://example.test/empresa-cinco'),
    ('c0000000-0000-4000-8000-000000000006'::uuid, 'Empresa Seis Exemplo Ltda', 'Empresa Seis', '12345678000608', '201_TO_500', 'Serviços', 'Empresa sintética banida.', 'https://example.test/empresa-seis')
) as fixture(account_id, legal_name, trade_name, cnpj, employee_range, segment, description, website_url)
  on fixture.account_id = account.id;

insert into public.company_locations (
  id,
  company_profile_id,
  label,
  postal_code,
  street,
  number,
  neighborhood,
  city,
  state,
  is_primary
)
select
  ('e1000000-0000-4000-8000-' || right(profile.id::text, 12))::uuid,
  profile.id,
  'Sede local',
  '01001000',
  'Rua de Teste',
  right(profile.id::text, 3),
  'Centro',
  'São Paulo',
  'SP',
  true
from public.company_profiles profile;

insert into public.niches (id, slug, name, sort_order)
values
  ('f0000000-0000-4000-8000-000000000001', 'beleza', 'Beleza', 10),
  ('f0000000-0000-4000-8000-000000000002', 'gastronomia', 'Gastronomia', 20),
  ('f0000000-0000-4000-8000-000000000003', 'moda', 'Moda', 30),
  ('f0000000-0000-4000-8000-000000000004', 'tecnologia', 'Tecnologia', 40),
  ('f0000000-0000-4000-8000-000000000005', 'viagem', 'Viagem', 50)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into public.creator_niches (creator_profile_id, niche_id)
select
  profile.id,
  niche.id
from public.creator_profiles profile
join public.niches niche
  on niche.slug = case
    when right(profile.id::text, 1) in ('1', '3') then 'beleza'
    when right(profile.id::text, 1) in ('2', '4') then 'tecnologia'
    else 'viagem'
  end;

insert into public.social_profiles (
  id,
  owner_account_id,
  platform,
  handle,
  normalized_url,
  sort_order
)
select
  ('f1000000-0000-4000-8000-' || right(account.id::text, 12))::uuid,
  account.id,
  'INSTAGRAM',
  '@fixture_' || right(account.id::text, 4),
  'https://instagram.com/fixture_' || right(account.id::text, 4),
  0
from public.accounts account
where account.role = 'INFLUENCER';

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
values (
  '72000000-0000-4000-8000-000000000004',
  'c0000000-0000-4000-8000-000000000004',
  'profile-media',
  'c0000000-0000-4000-8000-000000000004/logo/72000000-0000-4000-8000-000000000004.png',
  'LOGO',
  'image/png',
  1024,
  256,
  256,
  'ACTIVE'
);

update public.company_profiles
set logo_asset_id = '72000000-0000-4000-8000-000000000004'
where account_id = 'c0000000-0000-4000-8000-000000000004';

-- Creative for the catalog hero banner. The bytes are uploaded to Storage by
-- scripts/seed-local-storage.ts, which must keep this object path in sync.
-- Sponsorship creatives must be owned by an ADMIN account and live in the
-- sponsorship-media bucket, otherwise the placement policy rejects them.
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
values (
  '72000000-0000-4000-8000-000000000010',
  'a0000000-0000-4000-8000-000000000001',
  'sponsorship-media',
  'a0000000-0000-4000-8000-000000000001/sponsorship/72000000-0000-4000-8000-000000000010.png',
  'SPONSORSHIP_CREATIVE',
  'image/png',
  77860,
  1600,
  600,
  'ACTIVE'
);

insert into public.creator_metric_snapshots (
  id,
  creator_profile_id,
  social_profile_id,
  platform,
  follower_count,
  view_count,
  interaction_count,
  engagement_rate,
  observed_on
)
select
  ('f2000000-0000-4000-8000-' || right(profile.id::text, 12))::uuid,
  profile.id,
  social.id,
  'INSTAGRAM',
  10000 + (right(profile.id::text, 2)::integer * 500),
  -- Views and interactions are shown on the catalog card alongside followers,
  -- so the fixtures carry plausible ratios instead of nulls.
  (10000 + (right(profile.id::text, 2)::integer * 500)) * 12,
  (10000 + (right(profile.id::text, 2)::integer * 500)) / 4,
  4.2500,
  current_date
from public.creator_profiles profile
join public.social_profiles social on social.owner_account_id = profile.account_id;

insert into public.moderation_cases (
  id,
  account_id,
  current_submission_sequence,
  assigned_admin_account_id,
  submitted_at,
  resolved_at
)
select
  (
    case
      when account.role = 'INFLUENCER' then 'f3000000'
      else 'f3100000'
    end ||
    '-0000-4000-8000-' ||
    right(account.id::text, 12)
  )::uuid,
  account.id,
  1,
  'a0000000-0000-4000-8000-000000000001',
  account.submitted_at,
  case when account.status in ('PENDING_REVIEW', 'CHANGES_REQUESTED') then null else coalesce(account.approved_at, account.suspended_at, account.banned_at) end
from public.accounts account
where account.role <> 'ADMIN'
  and account.status <> 'ONBOARDING';

insert into public.moderation_events (
  id,
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
select
  (
    case
      when account.role = 'INFLUENCER' then 'f4000000'
      else 'f4100000'
    end ||
    '-0000-4000-8000-' ||
    right(moderation_case.id::text, 12)
  )::uuid,
  moderation_case.id,
  1,
  case
    when account.status in ('APPROVED', 'CHANGES_REQUESTED', 'BANNED') then 'PENDING_REVIEW'::public.account_status
    when account.status = 'SUSPENDED' then 'APPROVED'::public.account_status
    else 'ONBOARDING'::public.account_status
  end,
  account.status,
  case account.status
    when 'PENDING_REVIEW' then 'SUBMIT'::public.moderation_action
    when 'CHANGES_REQUESTED' then 'REQUEST_CHANGES'::public.moderation_action
    when 'APPROVED' then 'APPROVE'::public.moderation_action
    when 'SUSPENDED' then 'SUSPEND'::public.moderation_action
    when 'BANNED' then 'BAN'::public.moderation_action
    else 'SUBMIT'::public.moderation_action
  end,
  case
    when account.status = 'CHANGES_REQUESTED' then 'Ajustar dados sintéticos para o cenário de teste.'
    when account.status = 'SUSPENDED' then 'Suspensão sintética para validar o fallback.'
    when account.status = 'BANNED' then 'Bloqueio sintético para validar a defesa de identidade.'
    else null
  end,
  case when account.status = 'PENDING_REVIEW' then account.id else 'a0000000-0000-4000-8000-000000000001'::uuid end,
  'local-seed:' || account.id::text || ':' || lower(account.status::text),
  coalesce(account.banned_at, account.suspended_at, account.approved_at, account.submitted_at, now())
from public.moderation_cases moderation_case
join public.accounts account on account.id = moderation_case.account_id;

insert into public.legal_documents (
  id,
  document_type,
  version_label,
  content_hash,
  published_at,
  active_from
)
values
  ('f5000000-0000-4000-8000-000000000001', 'TERMS', 'LOCAL-PLACEHOLDER-v1', encode(extensions.digest('local terms placeholder', 'sha256'), 'hex'), now(), now()),
  ('f5000000-0000-4000-8000-000000000002', 'PRIVACY', 'LOCAL-PLACEHOLDER-v1', encode(extensions.digest('local privacy placeholder', 'sha256'), 'hex'), now(), now()),
  ('f5000000-0000-4000-8000-000000000003', 'CONTACT_VISIBILITY', 'LOCAL-PLACEHOLDER-v1', encode(extensions.digest('local contact visibility placeholder', 'sha256'), 'hex'), now(), now());

insert into public.account_consents (
  id,
  account_id,
  legal_document_id,
  request_id,
  context
)
select
  gen_random_uuid(),
  account.id,
  document.id,
  'local-seed',
  '{"fixture":true,"legalCopyApproved":false}'::jsonb
from public.accounts account
cross join public.legal_documents document
where account.status <> 'ONBOARDING';

insert into public.account_contact_preferences (
  id,
  account_id,
  consent_document_id,
  email_visible_to_approved_companies,
  whatsapp_visible_to_approved_companies,
  social_visible_to_approved_companies
)
select
  gen_random_uuid(),
  account.id,
  'f5000000-0000-4000-8000-000000000003',
  account.status = 'APPROVED'
    and account.id <> 'b0000000-0000-4000-8000-000000000007',
  account.status = 'APPROVED'
    and account.id <> 'b0000000-0000-4000-8000-000000000007',
  account.status = 'APPROVED'
    and account.id <> 'b0000000-0000-4000-8000-000000000007'
from public.accounts account
where account.role = 'INFLUENCER'
  and account.id <> 'b0000000-0000-4000-8000-000000000007';

insert into public.blocked_identities (
  id,
  provider,
  identity_key_hash,
  originating_account_id,
  reason,
  blocked_by_account_id,
  blocked_at
)
select
  gen_random_uuid(),
  'EMAIL',
  encode(extensions.digest(lower(operational_email), 'sha256'), 'hex'),
  id,
  'Identidade sintética bloqueada para teste local.',
  'a0000000-0000-4000-8000-000000000001',
  banned_at
from public.accounts
where status = 'BANNED';

insert into public.identity_auth_effects (
  id,
  moderation_event_id,
  account_id,
  auth_user_id,
  action,
  status,
  attempt_count,
  idempotency_key
)
values (
  'f9000000-0000-4000-8000-000000000001',
  'f4000000-0000-4000-8000-000000000006',
  'b0000000-0000-4000-8000-000000000006',
  '20000000-0000-4000-8000-000000000006',
  'BAN',
  'PENDING',
  0,
  'local-seed:identity-auth-ban'
);

insert into public.sponsorship_placements (
  id,
  placement_type,
  audience,
  slot_key,
  advertiser_account_id,
  advertiser_label,
  featured_creator_profile_id,
  title,
  body,
  starts_at,
  ends_at,
  is_active,
  sort_order
)
values
  (
    'f6000000-0000-4000-8000-000000000001',
    'FEATURED_CREATOR',
    'COMPANY',
    'catalog-featured',
    'c0000000-0000-4000-8000-000000000004',
    'Anunciante sintético',
    'd0000000-0000-4000-8000-000000000004',
    'Criador em destaque — fixture',
    'Posicionamento ativo apenas para desenvolvimento local.',
    now() - interval '1 day',
    now() + interval '365 days',
    true,
    10
  ),
  (
    'f6000000-0000-4000-8000-000000000002',
    'TOP_BANNER',
    'ALL',
    'catalog-top',
    null,
    'Rascunho sintético',
    null,
    'Banner em rascunho',
    'Sem mídia e inativo intencionalmente.',
    null,
    null,
    false,
    20
  );

-- Active hero banner so the catalog renders a real example locally. Kept
-- separate from the draft above, which exists to exercise the inactive state
-- in the backoffice.
insert into public.sponsorship_placements (
  id,
  placement_type,
  audience,
  slot_key,
  creative_asset_id,
  advertiser_label,
  title,
  body,
  link_url,
  link_label,
  starts_at,
  ends_at,
  is_active,
  sort_order
)
values (
  'f6000000-0000-4000-8000-000000000003',
  'TOP_BANNER',
  'ALL',
  'catalog-top',
  '72000000-0000-4000-8000-000000000010',
  'Espaço publicitário',
  'Sua marca em destaque aqui',
  'Este é um banner de exemplo para desenvolvimento local. Anuncie para creators e empresas aprovadas da Contente Creators.',
  'https://contentecreators.com.br',
  'Quero anunciar',
  now() - interval '1 day',
  now() + interval '365 days',
  true,
  10
);

insert into public.email_outbox (
  id,
  account_id,
  template,
  recipient_email,
  payload,
  status,
  idempotency_key,
  due_at
)
values (
  'f7000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000003',
  'CHANGES_REQUESTED',
  'creator-changes@contentecreators.test',
  '{"fixture":true,"reasonKey":"profile-correction"}'::jsonb,
  'PENDING',
  'local-seed:changes-requested-email',
  now()
);

insert into public.email_attempts (
  id,
  outbox_id,
  attempt_number,
  status,
  error_category,
  error_code,
  latency_ms
)
values (
  'f7100000-0000-4000-8000-000000000001',
  'f7000000-0000-4000-8000-000000000001',
  1,
  'FAILED',
  'LOCAL_FIXTURE',
  'SMTP_UNAVAILABLE',
  25
);

insert into public.audit_revisions (
  entity_table,
  entity_id,
  operation,
  actor_account_id,
  actor_type,
  actor_role,
  source,
  request_id,
  reason,
  changed_fields,
  before_state,
  after_state,
  occurred_at
)
select
  'accounts',
  account.id::text,
  'UPDATE',
  'a0000000-0000-4000-8000-000000000001',
  'ADMIN',
  'ADMIN',
  'SCRIPT',
  'local-seed',
  'Revisão sintética de moderação.',
  array['status'],
  jsonb_build_object('status', 'PENDING_REVIEW', 'operational_email', '[REDACTED]'),
  jsonb_build_object('status', account.status, 'operational_email', '[REDACTED]'),
  coalesce(account.approved_at, account.suspended_at, account.banned_at, now())
from public.accounts account
where account.status in ('APPROVED', 'SUSPENDED', 'BANNED');
