begin;

-- Official legal documents v1.0 (published 2026-10-01). content_hash is the
-- SHA-256 of the canonical content in src/features/legal/content; the unit test
-- legal-documents.unit.test.ts keeps both in sync (`node --import tsx scripts/legal-hash.ts`).
insert into public.legal_documents (
  id,
  document_type,
  version_label,
  content_hash,
  published_at,
  active_from
)
values
  ('f5000000-0000-4000-8000-000000000001', 'TERMS', '1.0', '35926be8dc25db04d14f6db75fe76f8d063d180051d2b92134ba9927f1e7b310', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z'),
  ('f5000000-0000-4000-8000-000000000002', 'PRIVACY', '1.0', '04457202fc9ea23e1723f6f6b21c1e0bd33e54440605a6d4dd1b8f34c4b1dc35', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z'),
  ('f5000000-0000-4000-8000-000000000003', 'CONTACT_VISIBILITY', '1.0', '3d3fae5e285e9a697bac1cf9f475c65b072e98d848e212629f6e83bfce640887', '2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z')
on conflict (document_type, version_label) do nothing;

-- Placeholder versions must never stay active once the official ones exist.
update public.legal_documents
set retired_at = greatest(now(), active_from + interval '1 second')
where version_label like 'LOCAL-PLACEHOLDER%'
  and retired_at is null;

commit;
