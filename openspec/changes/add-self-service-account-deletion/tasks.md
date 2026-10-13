## 1. Decisões e matriz de disposição

- [x] 1.1 Registrar a matriz de disposição aprovada (cliente, 2026-10-13) em `docs/operations/account-deletion.md`
- [x] 1.2 Inventariar todas as tabelas com FK para `accounts` e classificar cada uma (DELETE, ANONYMIZE, RETAIN)

## 2. Banco

- [x] 2.1 Migration: `deletion_requested_at`, `elimination_eligible_at` (+30 dias), `deletion_due_at` (+120 dias), `deletion_archived_profile`, estado da rotina (`PENDING`, `FAILED`, `ELIMINATED`) e constraints
- [x] 2.2 Funções `app_request_account_deletion()` e `app_recover_account()` auditadas (recuperação só admin, motivo obrigatório, só dentro de 30 dias)
- [x] 2.3 Policies RLS/catálogo/vitrine tratando conta em exclusão como não visível; testes de RLS
- [x] 2.4 Funções da rotina: apagar dados, operação própria de anonimização de auditoria/moderação, preservação de `blocked_identities`
- [x] 2.5 Testes de integração percorrendo todas as tabelas com FK para `accounts`

## 3. Backend

- [x] 3.1 Ação de servidor de solicitação: reautenticação (senha ou Google recente), confirmação, chamada da função, ban Auth, revogação de sessões
- [x] 3.2 E-mail transacional de confirmação com prazo e canal de contato
- [x] 3.3 Serviço e rota `/api/cron/account-elimination` (padrão de `/api/cron/email-outbox`, `Bearer $CRON_SECRET`), dry-run por padrão fora de produção, lotes, idempotência, relatório com fingerprint
- [x] 3.4 Remoção de mídia no Storage e exclusão da identidade no Auth, na ordem definida
- [x] 3.5 Alertas: `DELETION_FAILED` e prazo ≤ 15 dias; adicionar a rota ao `vercel.json` (execução diária) e documentar em `docs/operations/environment-provisioning.md`

## 4. UI

- [x] 4.1 Seção "Excluir conta" em `/app/profile` com explicação, retenções e prazo
- [x] 4.2 Diálogo de confirmação (reautenticação, digitar EXCLUIR, ciência), acessível e responsivo
- [x] 4.3 Página pública `/conta-excluida` pós-saída
- [x] 4.4 Backoffice: filtro "Exclusão solicitada", detalhe com datas e estado, botão "Recuperar conta" com motivo obrigatório (visível só na janela de 30 dias) e e-mail de recuperação

## 5. Verificação e documentação

- [ ] 5.1 e2e: creator e empresa excluem, somem do catálogo/vitrine, não logam; admin recupera dentro da janela e contato segue revogado; rotina elimina só após 30 dias em ambiente de teste
- [x] 5.2 Atualizar `docs/operations/data-subject-requests.md`, `docs/architecture/moderation-state-machine.md` e `docs/launch-blockers.md`
- [x] 5.3 Rodar lint, typecheck, unit, component, integration e e2e relevantes
