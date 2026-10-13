## 1. Documentos publicados

- [x] 1.1 Copiar os PDFs oficiais para `public/legal/` (`termos-de-uso-v1.0.pdf`, `politica-de-privacidade-v1.0.pdf`) e registrar metadados em `src/features/legal/content/legal-pdfs.ts`
- [x] 1.2 Hash SHA-256 dos bytes + `scripts/legal-hash.ts`
- [x] 1.3 Constante do texto do consentimento de contato (UI e hash)

## 2. Páginas públicas

- [x] 2.1 `LegalDocumentPage` com PDF embutido, "Baixar PDF" e "Abrir em nova aba"
- [x] 2.2 Ligar `/terms` e `/privacy`; metadados indexáveis
- [x] 2.3 Remover `LegalPlaceholderPage` e `ptBR.legal`
- [x] 2.4 Headers: `/legal/*` SAMEORIGIN sem CSP; `frame-src 'self'` nas demais; atualizar teste de headers
- [ ] 2.5 e2e: PDF carrega em `/terms` e `/privacy`, download funciona, 320/390/1440 sem scroll horizontal, a11y

## 3. Registro de versões

- [x] 3.1 Migration inserindo TERMS 1.0, PRIVACY 1.0, CONTACT_VISIBILITY 1.0 com hash e datas; aposentar `LOCAL-PLACEHOLDER-*`
- [x] 3.2 Teste unitário: hash nas migrations == hash dos PDFs/texto no repo (migration `20261013140000_legal_documents_pdf_hashes.sql` troca os hashes do primeiro rascunho)
- [x] 3.3 Atualizar `supabase/seed.sql` e `e2e/support/local-acceptance.ts` para versões 1.0
- [ ] 3.4 Rodar `check-migration-history` e testes de integração de schema

## 4. Cadastro e consentimento

- [x] 4.1 Derivar `legalCopyApproved` do documento (não-placeholder) em `drizzle-onboarding-registration.repository.ts` e `drizzle-corrected-profile-resubmission.repository.ts`
- [x] 4.2 Atualizar copy da seção "Termos e privacidade" (links, 18+, texto de contato) em `profile-form-fields.client.tsx`
- [ ] 4.3 Ajustar testes de integração/unit/component de onboarding para versão 1.0 e `legalCopyApproved=true`
- [x] 4.4 Verificar exibição da versão aceita em revisão e detalhe de conta no backoffice; ajustar rótulos

## 5. Docs e liberação

- [x] 5.1 Atualizar `docs/launch-blockers.md` (marcar Termos/Privacidade/consentimento) e nota sobre rotas legais
- [x] 5.2 Atualizar `docs/operations/data-subject-requests.md` com canal e prazo de 15 dias da Política
- [ ] 5.3 Marcar PRD 23.1/27.7 (parte legal) e registrar itens pendentes: cookies, exclusão 120d, recusados 90d, consentimento da vitrine
- [ ] 5.4 Rodar lint, typecheck, unit, integration e e2e relevantes; abrir PR
