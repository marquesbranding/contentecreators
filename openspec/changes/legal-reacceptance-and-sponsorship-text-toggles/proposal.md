## Why

Os Termos de Uso e a Política de Privacidade oficiais agora são PDFs assinados (versão `1.0`, `public/legal/*.pdf`). Quem já está na plataforma aceitou apenas as versões antigas (placeholders) ou nunca aceitou o texto oficial. Sempre que um documento legal ganhar uma versão ativa nova, cada usuário precisa dar um novo aceite explícito, sempre contra a versão mais recente — e hoje não existe nenhum fluxo para isso depois do cadastro.

Nos patrocínios, título e texto de apoio hoje são exibidos sempre que preenchidos. O time quer poder preencher esses campos só para identificar o patrocínio na listagem do backoffice, sem que apareçam na arte publicada. A exibição precisa ser uma decisão explícita (checkbox), não um efeito colateral de preencher o campo.

## What Changes

- **Re-aceite de documentos legais**
  - Nova migration cria duas funções `SECURITY DEFINER`: listar documentos pendentes da conta logada e registrar o aceite deles. "Pendente" = documento ativo mais recente de `TERMS` / `PRIVACY` sem linha em `account_consents` para a conta. Como nenhuma conta aceitou a versão `1.0` em PDF, todos os usuários existentes ficam pendentes automaticamente após a migration.
  - Nova feature `legal-acceptance` com um modal central, não dispensável, montado nos layouts `/app` e `/onboarding`. Mostra cada documento pendente (nome, versão, data), link para abrir o PDF numa nova aba, botão de baixar o PDF, um único checkbox "Li e aceito…" e o botão "Aceitar e continuar". Também oferece "Sair" para o usuário não ficar preso.
  - Quando o aceite é salvo, o modal fecha sem recarregar a página inteira e não volta. Publicar uma nova versão ativa no futuro faz o modal reaparecer sem mudar código.
  - O finalizar-cadastro (onboarding) passa a tolerar consentimento já existente (`ON CONFLICT DO NOTHING`), para o re-aceite e o aceite do cadastro não colidirem no índice único `(account_id, legal_document_id)`.
- **Patrocínios: exibir título / exibir texto**
  - Duas colunas novas em `sponsorship_placements`: `show_title` e `show_body` (boolean, default `false`). Só podem ser `true` se `title` / `body` estiverem preenchidos (CHECK no banco + validação Zod + UI).
  - Backfill: patrocínios existentes com título/texto passam a `show_title = true` / `show_body = true`, para nada mudar visualmente em produção.
  - Título e texto continuam opcionais e continuam salvos mesmo desmarcados (aparecem na listagem do backoffice). O público só recebe `title` / `body` quando a respectiva flag é `true`; caso contrário o servidor entrega `null`.
  - Formulário do patrocínio ganha os checkboxes "Exibir título na arte" e "Exibir texto na arte", desabilitados enquanto o campo está vazio, e a prévia ao vivo respeita as flags.
- Evidências: testes unitários, de componente, de integração e e2e, com prints salvos em `evidencias-reaceite-e-patrocinios/`.

## Capabilities

### New Capabilities
- `legal-reacceptance`: detecção de documentos legais pendentes por conta, modal obrigatório de re-aceite com abertura/download dos PDFs, registro do aceite e idempotência.
- `sponsorship-text-visibility`: flags `show_title` / `show_body` no patrocínio, regras de validação, entrega pública filtrada e controles no formulário/prévia do backoffice.

### Modified Capabilities
<!-- Nenhuma spec existente tem requisito alterado; `registration-legal-consent` continua válido (o aceite do cadastro só fica tolerante a duplicidade). -->

## Impact

- Banco: 2 migrations novas (`20261014180000_legal_reacceptance.sql`, `20261014190000_sponsorship_text_visibility.sql`); `src/db/schema/sponsorships.ts` atualizado.
- Código: nova feature `src/features/legal-acceptance/`; `src/features/legal/` ganha registro de PDFs por versão; layouts `src/app/(product)/app/layout.tsx` e `src/app/(product)/onboarding/layout.tsx`; repositório de onboarding; toda a feature `src/features/sponsorships/` (schemas, repositórios, serviços, componentes de formulário, prévia e listagem).
- Docs: `docs/architecture/data-dictionary.md`, `docs/testing/sponsorship-creative-options.md`.
- Sem novas dependências. Migrations hospedadas são imutáveis: não editar migrations antigas.
