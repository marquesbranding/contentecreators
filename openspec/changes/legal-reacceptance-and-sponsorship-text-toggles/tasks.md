> Leia antes: `AGENTS.md` (Next.js deste repo tem breaking changes — consulte `node_modules/next/dist/docs/` antes de mexer em layouts/actions), `docs/architecture/database-migrations.md`, `docs/architecture/slices.md`, `docs/testing/tdd-workflow.md`. Siga TDD: escreva o teste, veja falhar, implemente. Comentários e textos de UI em português (pt-BR); código em inglês. Nunca edite migrations antigas. Não rode `drizzle-kit push`.

## 1. Banco — re-aceite legal (migration `supabase/migrations/20261014180000_legal_reacceptance.sql`)

- [x] 1.1 Ler `supabase/migrations/20261013120000_official_legal_documents.sql` e a função `app_confirm_whatsapp_contact` em `20260911130000_v1_init_database.sql` (~l.1010) como modelo de estilo (`begin; … commit;`, `SECURITY DEFINER`, `SET search_path TO ''`, grants).
- [x] 1.2 Criar `public.app_list_pending_legal_documents()` conforme design (decisão 2): retorna `id, document_type, version_label, published_at`; vazia para ADMIN, ONBOARDING, SUSPENDED, BANNED, role nulo ou contexto não verificado.
- [x] 1.3 Criar `public.app_accept_legal_documents(document_ids uuid[], request_id text) returns integer` conforme design: confere conjunto exato, erro `22023 legal_documents_not_current`, `ON CONFLICT DO NOTHING`, `context = {"flow":"reacceptance","legalCopyApproved":true}`, idempotente (retorna 0 sem pendentes).
- [x] 1.4 `REVOKE ALL … FROM PUBLIC; GRANT EXECUTE … TO contente_app_user;` para as duas funções.
- [x] 1.5 Adicionar bloco `DO $$` que (a) levanta exceção se não existirem `TERMS 1.0` e `PRIVACY 1.0` ativos (`retired_at is null`), e (b) dá `RAISE NOTICE 'accounts pending legal reacceptance: %', n` contando contas INFLUENCER/COMPANY elegíveis sem consentimento nos documentos ativos. Não deletar nem alterar `account_consents`.
- [x] 1.6 Teste de integração `src/features/legal-acceptance/server/repositories/drizzle-legal-acceptance.repository.integration.test.ts` (copiar o padrão de `drizzle-onboarding-registration.repository.integration.test.ts` e `src/test/builders/business-builders.ts`): cobrir (a) conta APPROVED com consentimentos só de documento aposentado → 2 pendentes; (b) conta PENDING_REVIEW consegue aceitar; (c) aceitar 2x não duplica e não erra; (d) ids defasados → erro `legal_documents_not_current` e nada gravado; (e) ADMIN e ONBOARDING → lista vazia; (f) publicar `TERMS 1.1` ativo faz só ele voltar a ficar pendente; (g) linha de auditoria criada em `account_consents`.

## 2. Registro de PDFs por versão (`src/features/legal`)

- [x] 2.1 Teste unitário `src/features/legal/domain/legal-pdf-registry.unit.test.ts`: `findLegalPdf("TERMS","1.0")` e `("PRIVACY","1.0")` retornam `pdfUrl` `/legal/termos-de-uso-v1.0.pdf` e `/legal/politica-de-privacidade-v1.0.pdf`; versão inexistente → `null`; todo `pdfFile` registrado existe em disco (`existsSync`).
- [x] 2.2 Implementar `publishedLegalPdfs` em `src/features/legal/content/legal-pdfs.ts` e `findLegalPdf` em `src/features/legal/domain/legal-pdf-registry.ts`; exportar em `src/features/legal/index.ts` e `client.ts` se o modal precisar (função pura, sem `node:fs`).

## 3. Feature `legal-acceptance` (server)

- [x] 3.1 Criar `src/features/legal-acceptance/` espelhando `src/features/whatsapp-contacts/`: `index.ts`, `server.ts` (`import "server-only"`), `types/legal-acceptance.types.ts` (`PendingLegalDocumentDto { id; documentType; versionLabel; title; publishedLabel; pdfUrl: string | null; downloadName: string | null }`, `AcceptLegalDocumentsResult`).
- [x] 3.2 Repositório `server/repositories/drizzle-legal-acceptance.repository.ts` com `listPending({requestId})` e `accept({documentIds, requestId})` usando `createServerVerifiedAccountTransactionRunner`, `applyVerifiedAuditContext` (reason "Re-accepted updated legal documents") e `transaction.execute(sql\`select …\`)` das funções 1.2/1.3. Mapear erro `legal_documents_not_current` para resultado `stale`.
- [x] 3.3 Query `server/queries/pending-legal-documents.queries.ts` (`loadPendingLegalDocuments`) juntando linha do banco com `findLegalPdf`; retornar `[]` em `VerifiedAccountTransactionError` `UNAUTHENTICATED` ou conta inexistente (copiar `loadPendingWhatsappContactConfirmations`); `operationalLogger.warn` quando faltar PDF no registro.
- [x] 3.4 Server action `server/actions/legal-acceptance.actions.ts` (`"use server"`): `acceptLegalDocumentsAction({ documentIds })` com validação Zod, retorno `{kind:"accepted"|"stale"|"error"}`, log de falha como em `whatsapp-contact.actions.ts`.
- [x] 3.5 Testes unitários (`*.unit.test.ts`) da query (mapeamento, PDF ausente, não autenticado → `[]`) e da action (ids inválidos → `error`, `stale`, `accepted`), mockando o repositório.

## 4. Feature `legal-acceptance` (modal)

- [x] 4.1 Teste de componente `src/features/legal-acceptance/components/legal-acceptance-modal.component.test.tsx` (padrão de `account-deletion.component.test.tsx`) cobrindo os cenários da spec `legal-reacceptance`: renderiza documentos e links (`href`, `target="_blank"`, `download`), botão desabilitado sem checkbox, Esc/clique fora não fecham, sucesso fecha e chama `router.refresh`, `stale` mostra mensagem e dá refresh, erro mantém modal e checkbox, clique duplo não chama a action duas vezes, lista vazia não renderiza nada.
- [x] 4.2 Implementar `components/legal-acceptance-modal.client.tsx` conforme design (decisão 5): título "Atualizamos nossos termos", texto curto explicando que é preciso aceitar para continuar, uma linha por documento (nome, "Versão X · publicado em dd/mm/aaaa", botões "Abrir" e "Baixar PDF" com ícones lucide `ExternalLink`/`Download`), checkbox "Li e aceito os Termos de Uso e a Política de Privacidade" (rótulo gerado a partir dos documentos pendentes), botão "Aceitar e continuar" com `Spinner`, botão "Sair". Acessível: `aria-describedby`, foco inicial no checkbox, `role="alert"` no erro.
- [x] 4.3 Montar `<LegalAcceptanceModal initialPending={…} />` em `src/app/(product)/app/layout.tsx` (carregar no mesmo `Promise.all`, renderizar depois do modal de WhatsApp) e em `src/app/(product)/onboarding/layout.tsx`. Atualizar `src/app/layout.component.test.tsx`/testes de layout afetados se quebrarem.
- [x] 4.4 Tornar o onboarding tolerante: `onConflictDoNothing({ target: [accountConsents.accountId, accountConsents.legalDocumentId] })` no insert de TERMS/PRIVACY em `drizzle-onboarding-registration.repository.ts`; verificar `drizzle-corrected-profile-resubmission.repository.ts` e qualquer outro insert em `accountConsents`. Adicionar caso no teste de integração do onboarding: aceitar via re-aceite e depois enviar o cadastro não falha nem duplica.

## 5. Banco — patrocínio (migration `supabase/migrations/20261014190000_sponsorship_text_visibility.sql`)

- [x] 5.1 Escrever a migration na ordem: `ADD COLUMN show_title/show_body boolean NOT NULL DEFAULT false` → desabilitar `sponsorship_placements_updated_at_version_trigger` → backfill `show_title = (title is not null), show_body = (body is not null)` → reabilitar trigger → `ADD CONSTRAINT sponsorship_placements_show_title_check CHECK (not show_title or title is not null)` e `…_show_body_check`. Modelo: `20260918120000_sponsorship_creative_options.sql`.
- [x] 5.2 Atualizar `src/db/schema/sponsorships.ts` (colunas `showTitle: boolean("show_title").notNull().default(false)`, `showBody` e os dois `check(...)`), conferindo o teste de drift `src/db/core-schema.integration.test.ts`.
- [x] 5.3 Atualizar `supabase/seed.sql` (dois inserts de `sponsorship_placements`) com `show_title`/`show_body` verdadeiros onde há título/texto.
- [x] 5.4 Documentar em `docs/architecture/data-dictionary.md` (seção `sponsorship_placements`).

## 6. Patrocínio — tipos, schemas e serviços

- [ ] 6.1 Testes primeiro (atualizar os existentes que listam todos os campos — grep por `showAdvertiserLabel` em `*.test.ts(x)`: `sponsorship-placement.schema.unit.test.ts`, `admin-sponsorship-placement.service.unit.test.ts`, `sponsorship-management-view.service.unit.test.ts`, `sponsorship-delivery.service.unit.test.ts`, `sponsorship-placement-policy.unit.test.ts`, `drizzle-sponsorship-placement.repository.integration.test.ts`, `drizzle-sponsorship-delivery.repository.integration.test.ts`, `sponsorship-management.api.unit.test.ts`, `src/test/builders/*`). Novos casos: `showTitle: true` sem `title` → issue em `showTitle`; `showBody: true` sem `body` → issue em `showBody`; defaults `false`; rascunho com título e flag falsa é aceito; INSERT com flag verdadeira e campo nulo viola a constraint do banco.
- [x] 6.2 `types/sponsorship-placement.types.ts`: `showTitle: boolean; showBody: boolean` em `SponsorshipPlacementDraft` (NÃO em `RendererPlacementDto` nem em `allowedPromotionKeys`).
- [x] 6.3 `schemas/sponsorship-placement.schema.ts` + `schemas/sponsorship-creative-options.schema.ts`: `showTitle`/`showBody` `z.boolean().default(false)` no draft; refinamento em `addCreativeLinkIssues` (ampliar o tipo do parâmetro) com as mensagens do design.
- [x] 6.4 Persistência: `server/repositories/sponsorship-placement.repository.ts` (lista `Pick` ~l.38), `drizzle-sponsorship-placement.repository.ts`, `domain/sponsorship-placement-policy.ts` (`activationPayload` ~l.40), `server/services/admin-sponsorship-placement.service.ts` (l.~81 e ~469), `server/services/sponsorship-management-view.service.ts` (l.~134 e ~166; DTO de gestão devolve `showTitle`/`showBody`).
- [x] 6.5 Entrega pública: `server/repositories/drizzle-sponsorship-delivery.repository.ts` (selecionar e mapear as colunas, l.~183 e ~232) e `server/services/sponsorship-delivery.service.ts` (ramo admin-authored ~l.163-181: `title: showTitle ? title : null`, `body: showBody ? body : null`; ramo `FEATURED_CREATOR`/participant-derived inalterado). Teste: título oculto não aparece no payload de landing (`/api/public/sponsorships/landing`) nem no de catálogo.
- [x] 6.6 `npm run type-check` limpo.

## 7. Patrocínio — formulário, prévia e listagem

- [x] 7.1 Testes de componente (estender `sponsorship-placements.component.test.tsx` / `sponsorship-management-view.component.test.tsx` / criar `placement-content-step.component.test.tsx`): checkbox "Exibir título na arte" desabilitado com título vazio; habilita ao digitar; desmarca e desabilita ao limpar; idem texto; payload do submit leva `showTitle`/`showBody`; prévia só mostra título/texto com checkbox marcado; listagem mostra título salvo + badge "Título oculto na arte" quando flag falsa.
- [x] 7.2 `schemas/placement-form.schema.ts`: campos `showTitle`/`showBody` (tipo + `defaultValues`: `placement?.showTitle ?? false`).
- [x] 7.3 `components/placement-content-step.client.tsx`: ampliar `PlacementCheckbox` (`name` inclui `showTitle`/`showBody`, prop `disabled`); renderizar os checkboxes logo abaixo dos campos `title` (~l.279) e `body` (~l.285) com os rótulos da spec; `useEffect` + `useWatch` que forçam a flag para `false` quando o campo está vazio (após trim).
- [x] 7.4 `components/placement-form-dialog.client.tsx` (payload ~l.234-244 e leitura ~l.212): enviar/ler `showTitle`/`showBody`.
- [x] 7.5 `components/placement-live-preview.client.tsx` (~l.82-98): respeitar as flags.
- [x] 7.6 `components/sponsorship-management-view.client.tsx` (~l.214, 525, 607-616): manter título/texto salvos e mostrar o `Badge` de oculto.
- [x] 7.7 Atualizar `docs/testing/sponsorship-creative-options.md` com o novo comportamento.

## 8. Verificação automatizada

- [x] 8.1 `npm run format:check && npm run lint && npm run type-check` limpos (corrigir com `npm run format` quando preciso).
- [x] 8.2 `npm run test:unit && npm run test:component` verdes.
- [x] 8.3 `npm run local:reset` (ou `npm run db:migrate`) e depois `npm run test:integration:local` verde, incluindo drift Drizzle × SQL e os testes novos das seções 1 e 6.
- [x] 8.4 Teste e2e Playwright `e2e/acceptance/legal-reacceptance.spec.ts` (usar helpers de `e2e/support/local-acceptance.ts`: `seedAcceptanceAccount`, `signInAcceptanceUser`, `cleanupAcceptanceIdentity`): usuário APPROVED sem consentimento da `1.0` faz login → modal aparece → clica "Abrir" (popup abre `/legal/termos-de-uso-v1.0.pdf`, status 200) → verifica atributo `download` do botão baixar → botão desabilitado → marca checkbox → "Aceitar e continuar" → modal some e **não** reaparece após `page.reload()` → `account_consents` tem 2 linhas novas com `context.flow = "reacceptance"`. Caso extra: usuário PENDING_REVIEW também consegue aceitar.
- [x] 8.5 Teste e2e `e2e/sponsorships/placement-text-visibility.spec.ts` (estender o padrão de `placement-wizard.spec.ts`): criar patrocínio com título e texto, ambos desmarcados → prévia e página pública `/` (ou catálogo, conforme slot) não mostram os textos, listagem do backoffice mostra; marcar → aparecem; limpar o título → checkbox desmarca e desabilita.

## 9. Evidências (prints) — entregar ao usuário

- [x] 9.1 Criar `evidencias-reaceite-e-patrocinios/` na raiz (a pasta `evidencias-r04/` é de outra mudança; não mexer) e salvar PNGs (desktop 1280×800 e mobile 390×844 quando indicado) via Playwright (`page.screenshot`) nos specs de 8.4/8.5 ou via navegador de preview: `01-modal-reaceite-desktop.png`, `02-modal-reaceite-mobile.png`, `03-modal-checkbox-marcado.png`, `04-pdf-aberto.png`, `05-apos-aceite-catalogo.png`, `06-patrocinio-form-checkbox-desabilitado.png`, `07-patrocinio-form-titulo-oculto-previa.png`, `08-patrocinio-form-titulo-exibido-previa.png`, `09-listagem-backoffice-badge-oculto.png`, `10-patrocinio-publico-sem-titulo.png`, `11-patrocinio-publico-com-titulo.png`.
- [x] 9.2 Verificar visualmente cada print (modal centralizado, sem scroll horizontal, contraste e foco ok; link de PDF abre; patrocínio sem texto oculto) e corrigir defeitos antes de entregar.
- [x] 9.3 Enviar os prints ao usuário (SendUserFile) com resumo curto do que cada um mostra e da saída dos comandos de 8.1–8.3, informando honestamente qualquer teste que não pôde rodar.
