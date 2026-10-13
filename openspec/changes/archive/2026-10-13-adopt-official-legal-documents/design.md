## Context

Infra de consentimento já existe: tabelas `legal_documents` (tipo, `version_label`, `content_hash`, `active_from`, `retired_at`), `account_consents` (única por conta+documento), `account_contact_preferences`. Cadastro resolve documentos ativos mais recentes (`activeFrom` desc) e grava consentimento na transação de submissão. Só falta conteúdo real: páginas são placeholder, seed usa `LOCAL-PLACEHOLDER-v1`, contexto grava `legalCopyApproved:false`.

Documentos oficiais: PDFs assinados, v1.0 de 01/10/2026 (Termos 7 págs; Política 10 págs).

## Goals / Non-Goals

**Goals:**

- Texto oficial fiel, sem edição de mérito, publicado e versionado.
- Aceite comprovável: versão + hash do texto exato vigente no momento do aceite.
- Publicar versão futura sem deploy de código de consentimento (só conteúdo + migration).

**Non-Goals:**

- Cookie banner / Google Ads / Meta Pixel.
- Exclusão de conta, retenção automática (120d / 90d), canal LGPD in-app.
- Reaceite forçado de contas existentes (nenhuma conta real pré-lançamento).
- CMS/admin de documentos legais.

## Decisions

1. **PDF oficial é a fonte da verdade**, servido de `public/legal/` e embutido por `<iframe>` nas rotas `/terms` e `/privacy`, com botões de download e abrir em nova aba. Alternativa inicial (transcrever para dados estruturados/HTML) foi descartada: risco de divergência jurídica, trabalho de manutenção e o titular lê exatamente o que o escritório assinou. Custo aceito: sem busca textual/indexação do conteúdo e visualização limitada em alguns móveis (mitigada pelos botões).
2. **Hash**: SHA-256 dos bytes do PDF. `scripts/legal-hash.ts` imprime os hashes; teste unitário confere com as migrations.
3. **Registro por migration** insere `legal_documents` (TERMS/PRIVACY `1.0`, hash, `published_at = 2026-10-01`, `active_from` = data de go-live). Alternativa: seed em runtime — rejeitada (produção não roda seed). Placeholders locais ficam só no seed local; migration aposenta (`retired_at`) qualquer linha `LOCAL-PLACEHOLDER-*` existente em ambientes hospedados.
4. **CONTACT_VISIBILITY**: texto do checkbox vira constante única usada pela UI e pelo hash; versão `1.0`. Texto reflete Privacidade 5.3: opcional, desmarcado, finalidade única, independente do aceite dos Termos/Política.
5. **`legalCopyApproved`**: deixa de ser constante `false`; passa a ser derivado de metadado do documento (`approved` = versão não-placeholder). Evita regressão em ambientes com seed local.
6. **Página**: `LegalDocumentPage` server component: cabeçalho da marca, título, versão/data, botões "Baixar PDF" / "Abrir em nova aba" e iframe de altura generosa; texto de apoio se o PDF não renderizar. Rotas indexáveis (título/descrição), conteúdo do PDF não.
   **Headers**: `/legal/*` recebe `X-Frame-Options: SAMEORIGIN` e sem CSP (CSP restritiva quebra o visualizador de PDF do Chrome); demais rotas mantêm DENY/`frame-ancestors 'none'` e passam a `frame-src 'self'`.
7. **Cadastro**: textos dos links apontam `/terms` e `/privacy`; label exibe versão vigente apenas via data (sem expor id). Copy de idade reforça 18+ (Termos 2.2, Privacidade 10). Checkboxes seguem desmarcados.

## Risks / Trade-offs

- [PDF não renderiza em alguns navegadores móveis] → botões de download/abrir em nova aba acima do iframe.
- [Troca silenciosa do PDF] → hash dos bytes em teste; mudança exige nova versão e novo arquivo.
- [Aceite grava documento "mais recente" e não o exibido] → registro usa versão ativa; quando nova versão publicada, página mostra só a vigente e histórico via pedido ao canal (Privacidade cap. 12).
- [Seeds/testes quebram com troca de versão] → atualizar fixtures junto; integration tests cobrem aceite com `1.0`.
- [Documento promete funcionalidades inexistentes (cookies, exclusão 120d, 90d recusados)] → publicar só com plano para cada item; listado nas Open Questions e no launch-blockers.

## Migration Plan

1. Merge PDFs + migrations (inativa até `active_from`).
2. Aplicar migration em DEV; testar cadastro e `/terms`, `/privacy`.
3. Em PRD: migration com `active_from` = janela de go-live; placeholders aposentados no mesmo passo.
4. Rollback: `retired_at` na linha 1.0 + manter placeholder ativo só em DEV (PRD não tem consentimentos reais pré-launch).

## Open Questions

- Item 5.3 da Política termina a lista com `;` (provável item faltando no PDF): pedir correção ao jurídico (nova versão 1.1).
- Há consentimentos reais em PRD/DEV com versão placeholder que exijam reaceite? (assumido: não.)
- Vitrine da página inicial (Privacidade 4/5.2) tem base "consentimento", mas só há 3 checkboxes (Termos, Política, contato). Documento diz que marcar a Política "registra acesso". Precisa checkbox/consentimento próprio para exibição na vitrine? Confirmar com jurídico.
- Cookies Google Ads/Meta Pixel (cap. 11): change separada antes do go-live ou publicar sem tags ativas?
- Exclusão de conta in-app e eliminação em 120 dias / 90 dias: existem? senão, change separada.
- Texto oficial do consentimento de contato: usar o do cadastro atual ou receber redação jurídica?
- WhatsApp no Termos 11.3 `(48) 9 9932-6846` vs Política `(48) 99932-6846`: mesmo número, formatação divergente; manter fiel a cada documento.
