# Contente Creators

Plataforma B2C que conecta empresas e criadores de conteúdo. A aplicação
pública, os fluxos autenticados e o backoffice fazem parte do mesmo projeto
Next.js.

## Arquitetura

O produto é um monólito modular em slices verticais:

```text
src/app                 rotas e composição Next.js
src/features/<slice>    UI, hooks, schemas, domínio e servidor da capacidade
src/shared              infraestrutura e UI sem regra de negócio
src/db                  schema Drizzle e infraestrutura PostgreSQL
supabase/migrations     fonte autoritativa da evolução do banco
e2e                     jornadas Playwright
```

As rotas compõem APIs públicas das features. Autorização, transações e regras
de negócio ficam no grafo server-side da própria slice; hooks isolam
orquestração de interface; TanStack Query guarda estado remoto e Zustand é
reservado a estado global efêmero de UI. Consulte
[Arquitetura por slices](docs/architecture/slices.md),
[propriedade de estado](docs/architecture/state-ownership.md) e
[DAL server-side](docs/architecture/server-dal.md).

Stack principal: Next.js 16/React 19, TypeScript, Tailwind CSS 4, shadcn/ui,
Supabase Auth/Postgres/Storage, Drizzle ORM, React Hook Form/Zod, Axios,
TanStack Query, Zustand, Vitest e Playwright.

## Produção

- Site público: [https://contentecreators.com](https://contentecreators.com)
- Origem canônica atual: `https://www.contentecreators.com`
- Deploy e execução do Next.js: Vercel, projeto `contente-creators-prd`
- Autenticação, PostgreSQL e Storage: Supabase, projeto
  `contente-creators-prd`
- Branch publicada em produção: `main`

O domínio sem `www` pertence ao mesmo ambiente de produção e atualmente é
redirecionado pela Vercel para a origem canônica com `www`. URLs temporárias
`*.vercel.app` são identificadores de deployment e não devem ser usadas como
URL pública, origem de autenticação ou valor de `NEXT_PUBLIC_APP_URL`.

## Responsabilidades da infraestrutura

| Responsabilidade                   | Serviço                                          |
| ---------------------------------- | ------------------------------------------------ |
| Build, deploy, CDN, domínio e cron | Vercel                                           |
| Aplicação web e APIs               | Next.js executado na Vercel                      |
| Cadastro, login, sessão e Google   | Supabase Auth                                    |
| Dados relacionais                  | Supabase Postgres, acessado com Drizzle ORM      |
| Fotos, logos e mídias privadas     | Supabase Storage                                 |
| E-mails de autenticação            | Supabase Auth com SMTP da Marques Branding       |
| E-mails transacionais da aplicação | Next.js/Vercel com SMTP da Marques Branding      |
| Evolução do banco                  | Migrations versionadas em `supabase/migrations/` |

A integração Supabase/Vercel injeta as credenciais do projeto Supabase no
projeto Vercel. Variáveis próprias da aplicação, como domínio, ambiente, SMTP,
cron e contato de suporte, continuam sendo configuradas manualmente na Vercel.
O guia completo e a tabela de mapeamento estão em
[Integração Vercel, Supabase e variáveis de ambiente](docs/operations/vercel-supabase-integration.md).

## Ambientes

| Ambiente    | Aplicação/Vercel        | Supabase                | URL pública                    |
| ----------- | ----------------------- | ----------------------- | ------------------------------ |
| Local       | `localhost:3000`        | Supabase CLI/Docker     | `http://localhost:3000`        |
| Development | `contente-creators-dev` | `contente-creators-dev` | domínio DEV isolado            |
| Production  | `contente-creators-prd` | `contente-creators-prd` | `https://contentecreators.com` |

DEV e PRD possuem projetos, bancos, usuários, objetos, chaves, OAuth e
credenciais SMTP independentes. Nunca copie segredos ou dados de produção para
outro ambiente.

## Desenvolvimento local

Pré-requisitos: Node.js 24, npm 11, Docker e Git.

```bash
cp .env.example .env.local
npm install
npm run local:start
npm run dev
```

A aplicação estará em [http://localhost:3000](http://localhost:3000). O
Supabase Studio local estará em `http://127.0.0.1:54323`.
`local:start` e `local:reset` atualizam em `.env.local` somente as URLs/chaves
geradas pelo Supabase local e sincronizam as mídias sintéticas privadas. As
demais configurações do desenvolvedor, incluindo SMTP e a lista de admins,
são preservadas.

Serviços locais:

| Serviço                        | Endereço                       |
| ------------------------------ | ------------------------------ |
| Aplicação                      | `http://localhost:3000`        |
| Supabase API                   | `http://127.0.0.1:54321`       |
| PostgreSQL direto              | `postgresql://127.0.0.1:54322` |
| Supabase Studio                | `http://127.0.0.1:54323`       |
| Caixa de e-mails do Auth       | `http://127.0.0.1:54324`       |
| Caixa de e-mails transacionais | `http://127.0.0.1:8025`        |

Comandos principais:

```bash
npm run local:start
npm run local:status
npm run local:reset
npm run local:stop
npm run test
npm run test:integration:local
npm run test:e2e
npm run ci
```

Consulte [Configuração dos ambientes](docs/operations/environments.md) para
credenciais locais, administradores de teste, callbacks e serviços auxiliares.

## Fluxo TDD e validação

Cada comportamento começa por um teste que falha, recebe a menor implementação
necessária e termina com refatoração mantendo a suíte verde. Escolha o nível
mais próximo do risco:

```bash
npm run test:unit
npm run test:component
npm run test:integration:local
npm run test:e2e
npm run test:a11y
```

Antes de integrar uma mudança, execute `npm run ci`. Esse comando verifica
formatação, lint, tipos, testes e build de produção. Mudanças de banco também
exigem a suíte local de integração. O fluxo detalhado está em
[TDD workflow](docs/testing/tdd-workflow.md).

## Banco e migrations

- `supabase/migrations/` é a única fonte autoritativa do schema compartilhado.
- Drizzle declara e consulta o schema, mas `drizzle-kit push` não é usado em
  DEV ou PRD.
- `npm run local:reset` recria apenas o Supabase local e aplica migrations e
  seeds versionados.
- `npm run vercel:build` valida o alvo, aplica somente migrations pendentes
  pela conexão direta e interrompe o deploy em caso de erro ou drift.
- Migrations aplicadas são imutáveis; correções usam uma nova migration.

Consulte [Arquitetura de migrations](docs/architecture/database-migrations.md)
e [runbook de deploy](docs/operations/deployment-runbook.md).

## Deploy

Produção é publicada pela Vercel a partir de `main`. O comando oficial,
declarado em `vercel.json`, é:

```bash
npm run vercel:build
```

Em um build Vercel de produção autorizado, esse comando:

1. gera e valida o build Next.js;
2. valida se Vercel, branch, ambiente e Supabase apontam para PRD;
3. aplica somente migrations pendentes usando a conexão não agrupada;
4. verifica o ledger de migrations;
5. provisiona idempotentemente os três administradores iniciais aprovados,
   usando a senha inicial protegida pela Vercel apenas uma vez;
6. entrega o artefato para publicação pela Vercel.

Não execute `drizzle-kit push` e não aplique alterações de schema manualmente
no dashboard. Consulte o
[runbook de deploy e migrations](docs/operations/deployment-runbook.md).

## Documentação operacional

- [Integração Vercel, Supabase e envs](docs/operations/vercel-supabase-integration.md)
- [Configuração dos ambientes](docs/operations/environments.md)
- [Provisionamento dos ambientes hospedados](docs/operations/environment-provisioning.md)
- [Deploy e migrations](docs/operations/deployment-runbook.md)
- [Provisionamento de administradores](docs/operations/admin-provisioning.md)
- [Entrega de e-mails](docs/operations/email-delivery.md)
- [Operação do backoffice](docs/operations/backoffice.md)
- [Backup, restauração e capacidade](docs/operations/backup-restore-capacity.md)
- [Resposta a incidentes](docs/operations/incident-response.md)

## Diagnóstico rápido

| Sintoma                                        | Verificação                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Build reclama de `NEXT_PUBLIC_*`               | Confira o escopo das variáveis no projeto Vercel correto e faça novo deploy; valores públicos são incorporados no build. |
| Runtime reclama de `DATABASE_URL`/`DIRECT_URL` | Confirme a integração Supabase/Vercel. `POSTGRES_URL` e `POSTGRES_URL_NON_POOLING` são aliases aceitos.                  |
| Login retorna ao endereço errado               | Alinhe `NEXT_PUBLIC_APP_URL`, Supabase Site URL/Redirect URLs e o callback do cliente Google para o mesmo ambiente.      |
| Banco local não sobe                           | Inicie o Docker, rode `npm run local:status` e, para dados descartáveis, `npm run local:reset`.                          |
| E-mail não chega localmente                    | Separe o inbox do Supabase Auth (`54324`) do Mailpit da aplicação (`8025`).                                              |
| Deploy para depois de uma migration            | Não force o build nem altere migration aplicada; siga o procedimento de roll-forward do runbook.                         |
| Catálogo/backoffice retorna acesso negado      | Confirme sessão, papel, status, archive state e claims verificadas; esconder UI não substitui autorização.               |

Segredos, URLs de banco, tokens e dados pessoais nunca devem ser copiados para
logs, tickets ou documentação. Os bloqueios ainda dependentes do cliente estão
em [launch blockers](docs/launch-blockers.md).
