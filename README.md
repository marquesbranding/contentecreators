# Contente Creators

Plataforma B2C que conecta empresas e criadores de conteúdo. A aplicação
pública, os fluxos autenticados e o backoffice fazem parte do mesmo projeto
Next.js.

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

Comandos principais:

```bash
npm run local:start
npm run local:reset
npm run local:stop
npm run test:integration:local
npm run ci
```

Consulte [Configuração dos ambientes](docs/operations/environments.md) para
credenciais locais, administradores de teste, callbacks e serviços auxiliares.

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
5. provisiona idempotentemente o administrador inicial aprovado;
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
