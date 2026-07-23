insert into public.niches (slug, name, sort_order)
values
  ('beleza', 'Beleza', 10),
  ('gastronomia', 'Gastronomia', 20),
  ('moda', 'Moda', 30),
  ('tecnologia', 'Tecnologia', 40),
  ('viagem', 'Viagem', 50)
on conflict (slug) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into public.legal_documents (
  document_type,
  version_label,
  content_hash,
  document_url,
  published_at,
  active_from
)
values
  (
    'TERMS',
    'BETA-PLACEHOLDER-v1',
    encode(extensions.digest('beta terms placeholder', 'sha256'), 'hex'),
    null,
    now(),
    now()
  ),
  (
    'PRIVACY',
    'BETA-PLACEHOLDER-v1',
    encode(extensions.digest('beta privacy placeholder', 'sha256'), 'hex'),
    null,
    now(),
    now()
  ),
  (
    'CONTACT_VISIBILITY',
    'BETA-PLACEHOLDER-v1',
    encode(extensions.digest('beta contact visibility placeholder', 'sha256'), 'hex'),
    null,
    now(),
    now()
  )
on conflict (document_type, version_label) do nothing;
