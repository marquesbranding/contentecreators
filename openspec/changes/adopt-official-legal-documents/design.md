## Context

Infra de consentimento já existe: tabelas `legal_documents` (tipo, `version_label`, `content_hash`, `active_from`, `retired_at`), `account_consents` (única por conta+documento), `account_contact_preferences`. Cadastro resolve documentos ativos mais recentes (`activeFrom` desc) e grava consentimento na transação de submissão. Só falta conteúdo real: páginas são placeholder, seed usa `LOCAL-PLACEHOLDER-v1`, contexto grava `legalCopyApproved:false`.

Documentos oficiais: Termos 13 capítulos, 7 págs; Política 13 capítulos + tabelas (dados, finalidades/bases legais, retenção), 10 págs. Ambos v1.0 de 01/10/2026.

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

1. **Conteúdo como dado estruturado no repo** (`src/features/legal/content/terms.v1_0.ts`, `privacy.v1_0.ts`: capítulos → itens numerados, tabelas, resumo). Alternativa: PDF embutido/link — rejeitada (não acessível, não indexável, não responsivo, hash difícil). Alternativa: markdown em runtime — rejeitada (dependência extra; tabelas e numeração `4.2`/`item 11.3` precisam de IDs estáveis para âncoras). Dado estruturado dá âncoras (`#item-4-3`), renderização acessível e hash determinístico.
2. **Hash**: SHA-256 do JSON canônico (chaves ordenadas) do conteúdo. Script `scripts/legal-hash.ts` imprime hash; teste unitário falha se hash da migration ≠ hash do conteúdo no repo. Garante que o texto servido é o texto aceito.
3. **Registro por migration** insere `legal_documents` (TERMS/PRIVACY `1.0`, hash, `published_at = 2026-10-01`, `active_from` = data de go-live). Alternativa: seed em runtime — rejeitada (produção não roda seed). Placeholders locais ficam só no seed local; migration aposenta (`retired_at`) qualquer linha `LOCAL-PLACEHOLDER-*` existente em ambientes hospedados.
4. **CONTACT_VISIBILITY**: texto do checkbox vira constante única usada pela UI e pelo hash; versão `1.0`. Texto reflete Privacidade 5.3: opcional, desmarcado, finalidade única, independente do aceite dos Termos/Política.
5. **`legalCopyApproved`**: deixa de ser constante `false`; passa a ser derivado de metadado do documento (`approved` = versão não-placeholder). Evita regressão em ambientes com seed local.
6. **Página**: componente `LegalDocumentPage` server component, `robots` indexável (Termos 4.2 e Privacidade 5.2 já tornam o conteúdo público), metadados com versão/data, índice âncorado, tabelas semânticas (`<table>` com `<th scope>`), sem JS. Rodapé de assinatura: Marques Branding, CNPJ, Candeia & Leorato, signatário.
7. **Cadastro**: textos dos links apontam `/terms` e `/privacy`; label exibe versão vigente apenas via data (sem expor id). Copy de idade reforça 18+ (Termos 2.2, Privacidade 10). Checkboxes seguem desmarcados.

## Risks / Trade-offs

- [Transcrição do PDF diverge do original] → texto gerado do PDF, revisão lado a lado por Igor/jurídico antes do merge; teste de snapshot do hash bloqueia edição acidental.
- [Hash muda por ajuste de formatação] → hash cobre só texto/estrutura, não estilo; mudança de texto exige nova versão (nunca editar 1.0 in place).
- [Aceite grava documento "mais recente" e não o exibido] → registro usa versão ativa; quando nova versão publicada, página mostra só a vigente e histórico via pedido ao canal (Privacidade cap. 12).
- [Seeds/testes quebram com troca de versão] → atualizar fixtures junto; integration tests cobrem aceite com `1.0`.
- [Documento promete funcionalidades inexistentes (cookies, exclusão 120d, 90d recusados)] → publicar só com plano para cada item; listado nas Open Questions e no launch-blockers.

## Migration Plan

1. Merge conteúdo + migration (inativa até `active_from`).
2. Aplicar migration em DEV; testar cadastro e `/terms`, `/privacy`.
3. Em PRD: migration com `active_from` = janela de go-live; placeholders aposentados no mesmo passo.
4. Rollback: `retired_at` na linha 1.0 + manter placeholder ativo só em DEV (PRD não tem consentimentos reais pré-launch).

## Open Questions

- Há consentimentos reais em PRD/DEV com versão placeholder que exijam reaceite? (assumido: não.)
- Vitrine da página inicial (Privacidade 4/5.2) tem base "consentimento", mas só há 3 checkboxes (Termos, Política, contato). Documento diz que marcar a Política "registra acesso". Precisa checkbox/consentimento próprio para exibição na vitrine? Confirmar com jurídico.
- Cookies Google Ads/Meta Pixel (cap. 11): change separada antes do go-live ou publicar sem tags ativas?
- Exclusão de conta in-app e eliminação em 120 dias / 90 dias: existem? senão, change separada.
- Texto oficial do consentimento de contato: usar o do cadastro atual ou receber redação jurídica?
- WhatsApp no Termos 11.3 `(48) 9 9932-6846` vs Política `(48) 99932-6846`: mesmo número, formatação divergente; manter fiel a cada documento.
