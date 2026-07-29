# Auditoria de linguagem em português brasileiro

## Objetivo

Garantir que a interface, os e-mails transacionais, os templates do Supabase Auth
e os placeholders legais apresentem português brasileiro correto e não exponham
identificadores internos em inglês.

## Escopo revisado

- Landing page, autenticação e seleção de perfil.
- Cadastro e edição de perfis de empresa e influenciador.
- Estados de análise, correções solicitadas, suspensão e bloqueio.
- Catálogo privado, perfil e patrocínios.
- Área administrativa, moderação, contas, auditoria e e-mails.
- Templates transacionais da aplicação.
- Templates de confirmação, recuperação, convite e troca de e-mail do Supabase.
- Páginas provisórias de termos de uso e política de privacidade.

## Convenções de produto

- Identificadores, enums, papéis e nomes de arquivos permanecem em inglês no
  código-fonte.
- A interface usa “empresa”, “influenciador” e “administrador” para os papéis
  internos `COMPANY`, `INFLUENCER` e `ADMIN`.
- “Creators” permanece apenas na marca Contente Creators.
- “UGC” permanece como sigla conhecida pelo público-alvo.
- Datas, números, percentuais, telefones e CNPJs usam as formatações centralizadas
  de `pt-BR`.

## Achados corrigidos

- Os estados internos de mídia `ACTIVE`, `ARCHIVED`, `PENDING` e `REJECTED`
  passaram a ser apresentados como “Ativa”, “Arquivada”, “Pendente” e
  “Rejeitada”.
- Valores de papéis, estados, tipos de criador e origem de métricas em diferenças
  de auditoria passaram a usar rótulos em português.
- A apresentação das diferenças de auditoria ganhou uma segunda barreira de
  tradução para impedir que novos valores conhecidos apareçam como enums crus.

## Evidências automatizadas

- `src/features/backoffice/domain/moderation-presentation.unit.test.ts`
- `src/features/backoffice/components/submission-review.component.test.tsx`
- `src/features/audit/domain/audit-history-mapper.unit.test.ts`
- `src/features/audit/components/audit-history-results.component.test.tsx`
- `src/shared/lib/formatters.unit.test.ts`
- `src/features/communications/domain/email-template-registry.unit.test.ts`

## Resultado

As superfícies revisadas não exibem enums internos conhecidos em inglês. Termos
de marca, siglas aprovadas e nomes técnicos restritos ao código não são
considerados vazamentos de idioma.
