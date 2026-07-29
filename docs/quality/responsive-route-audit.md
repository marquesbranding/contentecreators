# Auditoria responsiva do MVP

Esta matriz é a evidência operacional da tarefa OpenSpec `24.1`. O teste
executável correspondente está em
`e2e/responsive/route-audit.spec.ts` e usa os helpers reutilizáveis de
`e2e/support/responsive-audit.ts`.

## Critérios automatizados

Cada rota é renderizada em `320`, `390`, `768` e `1440` px no Chromium contra
o build de produção (`next build` + `next start`). Em cada combinação o teste
verifica:

- ausência de overflow horizontal do documento;
- exatamente um `h1` visível para preservar a hierarquia principal;
- controles interativos do design system com alvo mínimo de `44 × 44` px;
- elementos `fixed` ou `sticky` contidos na viewport;
- ausência de tabelas desktop visíveis em `320–390` px;
- anexos JSON por rota/largura e uma matriz consolidada no relatório do
  Playwright.

Sheets e alternativas móveis de tabelas do backoffice também possuem
interações dedicadas. Catálogo, filtro móvel e WebKit crítico continuam
cobertos por `e2e/catalog/catalog.spec.ts`.

## Matriz de rotas

| Área            | Estados e rotas auditados                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Público         | `/`, `/privacy`, `/terms`                                                                                                                       |
| Autenticação    | `/login`, `/sign-up?intent=company`, `/sign-up?intent=influencer`, `/forgot-password`, `/reset-password`, `/confirm-email`, `/backoffice/login` |
| Primeiro acesso | `/onboarding/role`, `/onboarding/influencer`, `/onboarding/company`                                                                             |
| Correções       | formulários de creator e empresa com `?corrections=requested`                                                                                   |
| Status          | `/app/status/analysis`, `/app/status/suspended`, `/app/status/blocked`                                                                          |
| Catálogo        | catálogo como empresa, catálogo como creator e detalhe autorizado de creator                                                                    |
| Perfil          | `/app/profile` como empresa e como creator                                                                                                      |
| Backoffice      | visão geral, fila e revisão de moderação, contas, detalhe, edição, auditoria, e-mails e patrocínios                                             |

As rotas protegidas usam exclusivamente as fixtures sintéticas do
`supabase/seed.sql`. A fixture `role-choice-e2e@contentecreators.test` existe
sem conta de aplicação para reproduzir, de forma determinística, o primeiro
acesso após OAuth.

## Decisões de escopo

- `/app` é um roteador de estado, não uma tela; as telas de destino são
  auditadas diretamente.
- Rotas dinâmicas usam IDs sintéticos estáveis do seed local.
- Carrosséis horizontais intencionais permanecem permitidos dentro de seu
  próprio contêiner; o documento nunca pode adquirir scroll horizontal.
- Links editoriais inline não são tratados como botões. Inputs, textareas,
  botões e links estilizados pelo design system são auditados como alvos de
  toque.

## Como executar

Com o Supabase local carregado a partir das migrations e do seed:

```bash
npx playwright test e2e/responsive/route-audit.spec.ts \
  --project=desktop-chromium
```

O `playwright.config.ts` inicia automaticamente o servidor de produção. O
relatório HTML contém os anexos de evidência para cada combinação auditada.
