## Context

`account_status`: ONBOARDING, PENDING_REVIEW, CHANGES_REQUESTED, APPROVED, SUSPENDED, BANNED. Contas e perfis têm `archived_at` (arquivamento lógico; consultas de catálogo filtram `archived_at is null`). Auditoria (`capture_audit_revision`) e moderação são append-only. Consentimentos (`account_consents`) e `account_contact_preferences` referenciam a conta com `ON DELETE RESTRICT`. Há `blocked_identities` (hash) para banidos. Identidade vive no Supabase Auth; mídia no Storage privado com `media_assets` e rotina de limpeza com dry-run. O runbook atual exige decisão por classe de dado e proíbe hard delete ad hoc.

A Política fixa: eliminação em até 120 dias; vitrine retirada após a exclusão; registros de acesso 6 meses; cadastros recusados 90 dias (outra change).

## Goals / Non-Goals

**Goals:**

- Usuário exclui a conta sozinho, com efeito imediato visível e prazo de eliminação cumprido por rotina automática.
- Respeitar imutabilidade da auditoria: eliminar/anonimizar por operação própria, autorizada e auditável, nunca por update direto.
- Evitar contornar banimento por exclusão e recadastro.

**Non-Goals:**

- Exportação de dados / portabilidade.
- Exclusão iniciada por admin em nome do usuário.
- Eliminação de cadastros recusados em 90 dias (change própria, pode reaproveitar a rotina).
- Remoção em backups (segue ciclo normal de substituição da Política).

## Decisions

1. **Duas fases**. Fase 1 (imediata): `deletion_requested_at` e `deletion_due_at = requested + 120 dias` em `accounts`, mais status lógico via nova função `app_request_account_deletion()` (SECURITY DEFINER, audited, verifica `auth_user_id` do chamador). Efeitos: `archived_at` no perfil se ainda nulo, com `deletion_archived_profile` registrando que foi a solicitação que arquivou (some do catálogo/vitrine reaproveitando filtros existentes e permite restaurar sem perder arquivamentos anteriores), preferências de contato arquivadas e visibilidades `false`, sessões revogadas e usuário Auth banido (`ban_duration` longo) para impedir login. Fase 2 (≤120 dias): rotina de eliminação. Alternativa de exclusão síncrona total: rejeitada (auditoria imutável, FKs RESTRICT, necessidade de guardas legais e de revisão).
2. **Matriz de disposição por classe** (aprovada pelo cliente em 2026-10-13):
   - Conta/perfil/canais/métricas/localização/niches: **DELETE** (ou anonimizar o que FKs de histórico exigirem: nome → "Conta excluída", e-mail/telefone/documento nulos).
   - Identidade Auth e identidades vinculadas (Google): **DELETE** (`auth.admin.deleteUser`), após rotina confirmar o resto.
   - Mídia (avatar/capa/logo, versões arquivadas): **DELETE** no Storage via API e `media_assets` marcado removido.
   - Consentimentos e eventos de moderação/auditoria: **ANONYMIZE** dados pessoais dentro de snapshots por operação própria e auditável, retendo o mínimo para comprovar aceite (versão, hash do documento, data, id interno sem PII).
   - Registros de acesso (IP/data/hora): **RETAIN** 6 meses.
   - `blocked_identities` de banidos: **RETAIN** hash (legítimo interesse/exercício de direitos).
   - Outbox de e-mail (destinatário/payload): **DELETE** payloads; manter apenas metadados sem PII.
3. **Reautenticação**: senha para contas e-mail/senha; para Google, login recente (≤5 min) via re-OAuth. Confirmação por digitação de "EXCLUIR" e checkbox de ciência. Alternativa só confirmação por clique: rejeitada (ação irreversível).
4. **Janela de recuperação de 30 dias**: a eliminação definitiva só é elegível 30 dias após `deletion_requested_at` (`elimination_eligible_at`). Nesse período a conta pode ser recuperada **somente por administrador**, na tela da conta no backoffice ("Recuperar conta", motivo obrigatório, ação auditada). O usuário pede pelo canal de contato citado no e-mail. A recuperação: limpa `deletion_*`, restaura `archived_at` do perfil só se `deletion_archived_profile` for verdadeiro, desbane a identidade no Auth, reabilita o login e notifica o usuário por e-mail. A autorização de contato **continua revogada** (visibilidades falsas); o usuário precisa autorizar de novo pelo perfil. Após 30 dias a conta não é recuperável.
5. **Rotina via Vercel Cron já usado no projeto** (`vercel.json` tem `/api/cron/email-outbox` diário, `CRON_SECRET`, plano Hobby limita a execução a 1 vez ao dia). Next.js não traz agendador próprio; ele só expõe o Route Handler que o cron chama. Adicionar `/api/cron/account-elimination` ao `vercel.json`, aceitando só `Authorization: Bearer $CRON_SECRET`, no mesmo padrão do handler do outbox. Execução diária basta: janela de recuperação de 30 dias + prazo máximo de 120. Processa contas com `elimination_eligible_at <= now()` em lotes pequenos, idempotente, dry-run por padrão fora de produção, relatório com fingerprint como `media-cleanup`. Ordem: Storage → dados do banco → anonimização → Auth. Falha em etapa deixa conta em `DELETION_FAILED` com alerta e retry; nunca estoura o prazo silenciosamente (alerta quando faltam 15 dias). Alternativas: GitHub Actions agendado ou `pg_cron` no Supabase; descartadas por já existir o cron da Vercel.
6. **UI**: seção "Excluir conta" em `/app/profile`, diálogo com lista do que será removido/retido, pt-BR; tela `/conta-excluida` pública após sair. E-mail de confirmação informando que a conta pode ser recuperada em até 30 dias pelo canal de contato e a data limite de eliminação.
7. **RLS**: conta com `deletion_requested_at` é tratada como não aprovada para leitura por terceiros (policies de catálogo e contato) — testes de RLS cobrindo catálogo, detalhe, contato, vitrine.

## Risks / Trade-offs

- [Bug expõe perfil de conta em exclusão] → reaproveitar `archived_at` + policy explícita + testes RLS/e2e.
- [FKs RESTRICT impedem apagar] → matriz define DELETE vs ANONYMIZE por tabela; teste de integração percorre todas as tabelas com FK para `accounts`.
- [Operação de anonimização de auditoria viola imutabilidade] → função dedicada, autorizada, que só redige campos PII listados e registra a si mesma.
- [Banimento contornado por exclusão] → `blocked_identities` retido; rotina nunca remove.
- [Prazo de 120 dias estourado por falha] → alerta em 105 dias, estado `DELETION_FAILED`, runbook.
- [Usuário exclui por engano] → confirmação forte, e-mail e janela de recuperação de 30 dias pelo backoffice.

## Migration Plan

1. Migration (colunas, funções, policies) sem rotina ativa; deploy em DEV; testes RLS/integração.
2. Lançar UI atrás de flag de ambiente até a matriz ser aprovada.
3. Ativar cron em DEV em dry-run, depois real em DEV; validar relatório.
4. PRD: ativar UI e cron no go-live. Rollback: desativar flag e cron; contas já em exclusão permanecem ocultas.

## Open Questions

- Comportamento para conta PENDING_REVIEW/CHANGES_REQUESTED/SUSPENDED/BANNED: pode excluir? (assumido: todas, exceto BANNED que só restringe e retém.)
- Empresas: exclusão do representante apaga a empresa e seus dados também? (assumido: sim, conta é única por usuário.)
- Registro de acesso e logs de plataforma (Vercel/Supabase) fora do banco: confirmar retenção do provedor.

Decididas: matriz de disposição aprovada; janela de recuperação de 30 dias com recuperação feita no backoffice; agendador é o Vercel Cron já em uso.
