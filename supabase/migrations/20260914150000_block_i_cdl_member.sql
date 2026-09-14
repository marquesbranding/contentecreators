-- Revisão 03, bloco I: selo de associado da CDL (Câmara de Dirigentes
-- Lojistas) — autodeclaração opcional, disponível para creators e empresas.
alter table public.creator_profiles
  add column is_cdl_member boolean not null default false;
alter table public.company_profiles
  add column is_cdl_member boolean not null default false;

comment on column public.creator_profiles.is_cdl_member is
  'Autodeclaração: associado da CDL (Câmara de Dirigentes Lojistas).';
comment on column public.company_profiles.is_cdl_member is
  'Autodeclaração: associado da CDL (Câmara de Dirigentes Lojistas).';
