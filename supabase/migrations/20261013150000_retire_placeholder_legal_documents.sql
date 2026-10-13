begin;

-- The init migration seeded BETA-PLACEHOLDER-v1 documents. Now that the official
-- versions exist, no placeholder may stay active in any environment.
update public.legal_documents
set retired_at = greatest(now(), active_from + interval '1 second')
where version_label like '%PLACEHOLDER%'
  and retired_at is null;

commit;
