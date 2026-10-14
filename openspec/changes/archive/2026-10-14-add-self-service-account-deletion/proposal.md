## Why

Determinação jurídica: a plataforma precisa dar ao usuário um caminho para excluir a própria conta. A Política de Privacidade v1.0 (caps. 8, 9 e 10) e os Termos (8.5) já prometem: "excluir a conta na própria plataforma", perfil da vitrine retirado após a exclusão, dados eliminados em até 120 dias (salvo guardas legais) e revogação de autorizações. Hoje só existe tratamento manual por pedido (`docs/operations/data-subject-requests.md`), sem opção no produto.

## What Changes

- Ação "Excluir minha conta" na área autenticada (`/app/profile`, zona de risco), para creators e empresas, com explicação do que acontece, reautenticação e confirmação explícita.
- Efeito imediato: conta entra em estado de exclusão solicitada, perfil some do catálogo, da vitrine da página inicial e de buscas; contatos deixam de ser visíveis; autorizações (contato) revogadas; sessões encerradas e novo login bloqueado; e-mail de confirmação enviado.
- Janela de recuperação de 30 dias: administradores podem recuperar a conta pelo backoffice (motivo obrigatório, auditado); a autorização de contato permanece revogada até o usuário autorizar de novo.
- Eliminação definitiva após a janela e dentro do prazo da Política (até 120 dias): rotina diária no Vercel Cron já usado pelo projeto, auditada que aplica a matriz de disposição por classe de dado (apagar, anonimizar ou reter o mínimo exigido por lei), inclusive mídia no Storage e identidade no Auth.
- Retenções mantidas conforme a Política: registros de acesso (6 meses, Marco Civil), comprovação de aceites e defesa em processos (mínimo restrito), proteção contra reingresso de identidade banida.
- Backoffice vê contas com exclusão solicitada, data limite e fim da janela de recuperação, e pode recuperar a conta com trilha auditada.
- Documentação: runbook e matriz de disposição; `docs/launch-blockers.md` atualizado.

## Capabilities

### New Capabilities

- `account-self-deletion`: solicitação pelo usuário, reautenticação, efeitos imediatos, notificação.
- `account-data-elimination`: rotina de eliminação/anonimização até o prazo, matriz por classe de dado, retenções e auditoria.

### Modified Capabilities

<!-- Nenhum requisito de spec existente muda; visibilidade de catálogo/vitrine já exclui contas não aprovadas. -->

## Impact

- Banco: nova migration (estado/colunas de exclusão em `accounts`, funções de transição auditadas, política RLS para conta em exclusão, rotina de eliminação), seeds e testes de integração/RLS.
- Backend: nova ação no módulo de identity/onboarding, serviço de eliminação, gateway Supabase Admin (ban/delete do usuário), limpeza de Storage, e-mails transacionais.
- UI: seção em `/app/profile`, diálogo de confirmação, mensagens pt-BR, página de confirmação pós-exclusão.
- Operação: `/api/cron/account-elimination` no `vercel.json` (mesmo padrão de `/api/cron/email-outbox`, `CRON_SECRET`) e runbook; monitoramento de contas vencidas.
- Docs: `docs/operations/data-subject-requests.md`, `docs/architecture/moderation-state-machine.md`, `docs/launch-blockers.md`.
- Fora de escopo: exclusão por administrador em nome do usuário (segue o fluxo manual), exportação de dados (portabilidade).
