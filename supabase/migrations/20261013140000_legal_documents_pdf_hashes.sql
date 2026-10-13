begin;

-- The official Terms and Privacy Policy are published as the signed PDFs in
-- public/legal; content_hash is the SHA-256 of each file's bytes
-- (`node --import tsx scripts/legal-hash.ts`). Replaces the hashes registered
-- by 20261013120000_official_legal_documents.sql, which no consent references yet.
update public.legal_documents
set content_hash = 'e2481649ff4b5c9c600a35db92ca344e8bb3391fbd7a1fd36409fdfd13ef704b'
where document_type = 'TERMS'
  and version_label = '1.0';

update public.legal_documents
set content_hash = 'b46c4d360f13a9c026f651d408da5be7fe6d4e041b55d9d00cc4e2bb0f64df80'
where document_type = 'PRIVACY'
  and version_label = '1.0';

commit;
