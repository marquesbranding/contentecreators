-- Higienização de e-mails com falha definitiva (DEAD_LETTER) registrados
-- durante a configuração de SMTP em PRD. Rode no SQL Editor do Supabase de
-- PRD, como postgres. NÃO é uma migration: não altera schema, só remove linhas.
--
-- Ordem de uso:
--   1. Rode a PARTE 1 (somente leitura) e confira as contagens.
--   2. Ajuste o CUTOFF se necessário (padrão: antes da correção do SMTP,
--      commit 8ebcabd em 2026-09-21 09:36 -03).
--   3. Rode a PARTE 2 com ROLLBACK no final (padrão). Confira os números.
--   4. Se estiver tudo certo, troque o ROLLBACK por COMMIT e rode de novo.
--
-- A exclusão também grava auditoria (audit_revisions) com o destinatário no
-- before_state. Por isso a PARTE 2 redige esse snapshot dentro da mesma
-- transação, usando o mesmo caminho controlado que a exclusão de conta usa.

-- ============================================================
-- PARTE 1 — somente leitura
-- ============================================================

-- Resumo do que será removido
select
  template,
  last_error_category,
  last_error_code,
  count(*)                    as total,
  min(created_at)             as primeira_falha,
  max(created_at)             as ultima_falha
from public.email_outbox
where status = 'DEAD_LETTER'
  and created_at < timestamptz '2026-09-21 09:36:26-03'  -- CUTOFF
group by template, last_error_category, last_error_code
order by total desc;

-- Quantos DEAD_LETTER existem no total, para comparar
select status, count(*) from public.email_outbox group by status order by status;

-- ============================================================
-- PARTE 2 — remoção (transação; ROLLBACK por padrão)
-- ============================================================

begin;

-- Caminho controlado de auditoria, válido só nesta transação.
select set_config('app.anonymization_operation', 'on', true);

create temporary table smtp_failed_ids on commit drop as
select id
from public.email_outbox
where status = 'DEAD_LETTER'
  and created_at < timestamptz '2026-09-21 09:36:26-03';  -- CUTOFF

-- Redige o snapshot de auditoria das linhas que serão apagadas.
update public.audit_revisions
set before_state = '{"redacted": true}'::jsonb
where entity_table = 'email_outbox'
  and entity_id in (select id::text from smtp_failed_ids)
  and before_state is not null;

-- Remove as linhas.
delete from public.email_outbox
where id in (select id from smtp_failed_ids);

-- Conferência: deve bater com a contagem da PARTE 1.
select
  (select count(*) from smtp_failed_ids)                         as removidos,
  (select count(*) from public.email_outbox where status = 'DEAD_LETTER') as dead_letter_restantes;

select set_config('app.anonymization_operation', 'off', true);

rollback;  -- trocar por COMMIT somente depois de conferir os números
