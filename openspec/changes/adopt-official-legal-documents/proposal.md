## Why

Termos de Uso e Política de Privacidade oficiais (v1.0, 01/10/2026, elaboração Candeia & Leorato Advogados, assinados por Pedro Henrique Costa Coppini, OAB/SC 78.001) foram entregues. Hoje `/terms` e `/privacy` mostram placeholder "lançamento bloqueado", o seed grava versão `LOCAL-PLACEHOLDER-v1` e todo consentimento é gravado com `legalCopyApproved: false`. Sem trocar isso, o aceite do cadastro não tem validade jurídica e o blocker de lançamento (`docs/launch-blockers.md`, PRD 23.1 / 27.7) segue aberto.

## What Changes

- Publicar o texto integral dos dois documentos oficiais em `/terms` e `/privacy` (páginas públicas, indexáveis), com versão, data de atualização, sumário por capítulo e bloco final de autoria/assinatura.
- Versionar os documentos como fonte única no repositório; derivar `content_hash` (SHA-256) do conteúdo canônico e registrar as versões `1.0` em `legal_documents` (TERMS, PRIVACY) via migration, `published_at`/`active_from` configurados.
- Registrar nova versão do documento `CONTACT_VISIBILITY` cujo texto é a autorização opcional de contato (Privacidade 5.3 / Termos 4.3, 11.1), com hash do texto exibido no checkbox.
- Cadastro: aceite grava a versão/hash vigentes; `legalCopyApproved` passa a `true` para documentos oficiais; checkboxes continuam desmarcados e separados (Termos, Privacidade, contato opcional).
- Ajustar copy do cadastro para refletir os documentos: maioridade 18+ (Termos 2.2), links abrindo versão vigente.
- Remover `LegalPlaceholderPage`, `ptBR.legal.launchBlocker/pendingItems` e atualizar `docs/launch-blockers.md`; atualizar seed local para documentos reais.
- Exibir no backoffice (revisão/detalhe de conta) a versão aceita de cada documento (já lê `legal_documents`; só validar rótulo).
- **BREAKING**: seed/fixtures e testes que usam `LOCAL-PLACEHOLDER-v1` e `legalCopyApproved:false` passam a usar `1.0`.

## Capabilities

### New Capabilities

- `legal-documents`: páginas públicas dos Termos e da Política, conteúdo versionado, hash, registro em `legal_documents`, regras de publicação de nova versão.
- `registration-legal-consent`: aceite de Termos/Privacidade e autorização opcional de contato no cadastro, vinculados à versão vigente e comprovados por registro.

### Modified Capabilities

<!-- app-footer já exige links para /terms e /privacy; sem mudança de requisito. -->

## Impact

- UI: `src/app/(marketing)/terms|privacy/page.tsx`, `src/features/marketing/components/legal-placeholder-page.tsx` (removido/substituído), novo módulo de conteúdo legal, `profile-form-fields.client.tsx` (copy do aceite).
- Copy: `src/shared/copy/pt-BR.ts` (`legal`).
- Dados: nova migration em `supabase/migrations/` inserindo versões 1.0; `supabase/seed.sql`; `e2e/support/local-acceptance.ts`.
- Backend: `drizzle-onboarding-registration.repository.ts`, `drizzle-corrected-profile-resubmission.repository.ts` (flag `legalCopyApproved`).
- Docs: `docs/launch-blockers.md`, `docs/operations/data-subject-requests.md`, PRD 23.1/27.7.
- Fora de escopo: banner de cookies Google Ads/Meta Pixel (Privacidade cap. 11), fluxo de exclusão de conta em até 120 dias, retenção de 90 dias de cadastros recusados — documentos prometem, mas implementação é outra change (ver design, Open Questions).
