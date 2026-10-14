-- Revisão 04: selo "Jornada do Influenciador" (autodeclaração opcional, ao lado
-- do selo da CDL) e "Conteúdo que você compartilhou" como número inteiro nas
-- métricas do Instagram. Migration aditiva: sem dado destrutivo, código antigo
-- ignora as colunas novas.
alter table public.creator_profiles
  add column is_influencer_journey_participant boolean not null default false;
alter table public.company_profiles
  add column is_influencer_journey_participant boolean not null default false;

comment on column public.creator_profiles.is_influencer_journey_participant is
  'Autodeclaração: participou da Jornada do Influenciador.';
comment on column public.company_profiles.is_influencer_journey_participant is
  'Autodeclaração: participou da Jornada do Influenciador.';

-- Nova coluna numérica; shared_content_description fica apenas como histórico
-- (o app deixa de escrevê-la). O texto legado não é convertido para número.
alter table public.creator_metric_snapshots
  add column shared_content_count integer,
  add constraint creator_metric_snapshots_shared_content_count_check
    check (shared_content_count is null or shared_content_count >= 0);

comment on column public.creator_metric_snapshots.shared_content_count is
  'Quantidade de conteúdos compartilhados (Instagram). Substitui shared_content_description, mantida só como histórico.';

-- Revisão das funções SQL existentes (nenhuma precisou de create or replace):
-- capture_audit_revision / audit_changed_fields / redact_audit_snapshot operam
-- sobre to_jsonb(row) e capturam colunas novas automaticamente; app_resubmit_*,
-- app_apply_admin_moderation, app_set_profile_completion e
-- app_eliminate_account_data só leem version/chaves de perfil ou apagam linhas
-- inteiras, sem enumerar colunas de perfil ou de métricas.
