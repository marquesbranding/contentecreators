## 1. Conteúdo legal versionado

- [x] 1.1 Criar `src/features/legal/content/` com tipos (capítulo, item numerado, tabela, resumo) e `terms.v1_0.ts` transcrito fielmente do PDF oficial
- [x] 1.2 Transcrever `privacy.v1_0.ts` (resumo, 13 capítulos, tabelas de dados, finalidades/bases legais, retenção)
- [ ] 1.3 Revisão lado a lado dos dois textos contra os PDFs (Igor/jurídico) e corrigir divergências
- [x] 1.4 Função de hash canônico SHA-256 + script `scripts/legal-hash.ts`
- [x] 1.5 Constante do texto do consentimento de contato (usada na UI e no hash)

## 2. Páginas públicas

- [x] 2.1 Criar `LegalDocumentPage` (header, versão/data, índice, capítulos, tabelas semânticas, assinatura, âncoras `item-N-M`)
- [x] 2.2 Ligar `/terms` e `/privacy`; metadados com versão e `robots` indexável
- [x] 2.3 Remover `LegalPlaceholderPage`, export em `features/marketing/index.ts` e `ptBR.legal.launchBlocker/pendingItems`
- [ ] 2.4 Testes de componente (feito: conteúdo, âncoras, sem aviso preliminar); e2e 320/390/1440 sem scroll horizontal e checagem a11y (pendente)

## 3. Registro de versões

- [x] 3.1 Migration inserindo TERMS 1.0, PRIVACY 1.0, CONTACT_VISIBILITY 1.0 com hash e datas; aposentar `LOCAL-PLACEHOLDER-*`
- [x] 3.2 Teste unitário: hash da migration == hash do conteúdo do repo; falha se texto publicado mudar
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
