# Integração Vercel, Supabase e variáveis de ambiente

Este é o documento de referência para configurar os ambientes hospedados do
Contente Creators. Ele define quem hospeda cada parte, de onde vem cada
variável e como evitar cruzamento entre DEV e PRD.

## Identidade oficial de produção

| Item                  | Produção                           |
| --------------------- | ---------------------------------- |
| Domínio público       | `https://contentecreators.com`     |
| Origem canônica atual | `https://www.contentecreators.com` |
| Projeto Vercel        | `contente-creators-prd`            |
| Projeto Supabase      | `contente-creators-prd`            |
| Ref Supabase          | `kstbhqeiebutpfvswyla`             |
| Branch de produção    | `main`                             |
| Executor do deploy    | Vercel                             |
| Build Command         | `npm run vercel:build`             |
| Auth                  | Supabase Auth                      |
| Banco                 | Supabase Postgres                  |
| Arquivos              | Supabase Storage                   |

`contentecreators.com` e `www.contentecreators.com` representam o mesmo
ambiente. A configuração atual da Vercel redireciona o domínio raiz para a
origem canônica com `www`. Por isso:

- divulgue `https://contentecreators.com`;
- configure `NEXT_PUBLIC_APP_URL` com a origem final canônica
  `https://www.contentecreators.com`;
- use essa mesma origem como **Site URL** no Supabase Auth;
- cadastre callbacks exatos sob essa origem;
- não use uma URL de deployment `*.vercel.app` como identidade de produção.

Se a preferência de domínio na Vercel for alterada futuramente, atualize
Vercel, `NEXT_PUBLIC_APP_URL`, Supabase Auth, OAuth, canonical/metadata e este
documento no mesmo release.

## Divisão de responsabilidades

### Vercel

A Vercel é responsável por:

- construir e publicar o projeto Next.js;
- executar páginas, Server Actions, Route Handlers e cron;
- servir os assets estáticos, CDN, HTTPS e domínio;
- armazenar as variáveis usadas pelo build e pelo runtime da aplicação;
- disparar o deploy de produção quando `main` é atualizada.

### Supabase

O Supabase é responsável por:

- Supabase Auth: e-mail/senha, Google, sessões e recuperação de senha;
- PostgreSQL usado pelo Drizzle ORM;
- Storage de fotos, logos e demais mídias;
- políticas RLS, hooks e objetos de banco versionados pelas migrations;
- SMTP e templates dos e-mails emitidos diretamente pelo Supabase Auth.

Conectar o repositório ao Supabase não hospeda o Next.js. Conectar o projeto
Supabase à Vercel não transfere o Auth para a Vercel. O deploy continua sendo
feito pela Vercel e Auth/Postgres/Storage continuam no Supabase.

## Estratégia das variáveis

Existem três origens de configuração:

1. **Integração Supabase/Vercel:** injeta automaticamente URLs e chaves do
   projeto Supabase conectado.
2. **Vercel Environment Variables:** recebe manualmente as configurações
   próprias da aplicação.
3. **Supabase Dashboard:** recebe configurações internas do Auth, provedores,
   redirects, SMTP de Auth, templates e hooks.

### Variáveis injetadas pela integração

A integração oficial pode instalar as seguintes variáveis no projeto Vercel:

| Variável da integração                   | Uso                                                 |
| ---------------------------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`               | URL pública da API Supabase                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`   | Chave pública usada por browser e servidor SSR      |
| `SUPABASE_URL`                           | Alias da URL Supabase fornecido pela integração     |
| `SUPABASE_PUBLISHABLE_KEY`               | Alias da chave pública                              |
| `SUPABASE_SECRET_KEY`                    | Chave secreta para operações administrativas        |
| `POSTGRES_URL`                           | Conexão Postgres usada pelo runtime                 |
| `POSTGRES_URL_NON_POOLING`               | Conexão direta/session usada por migrations         |
| `POSTGRES_PRISMA_URL`                    | Alias da integração; não é consumido pela aplicação |
| `POSTGRES_HOST`, `POSTGRES_USER`         | Partes da conexão; não montar uma URL manualmente   |
| `POSTGRES_PASSWORD`, `POSTGRES_DATABASE` | Partes da conexão; não montar uma URL manualmente   |

Os nomes públicos `NEXT_PUBLIC_SUPABASE_*` precisam existir exatamente assim
porque são incorporados ao bundle do browser durante o build.

No servidor, a aplicação normaliza os aliases da integração:

| Nome interno preferencial   | Fallback automático da integração |
| --------------------------- | --------------------------------- |
| `DATABASE_URL`              | `POSTGRES_URL`                    |
| `DIRECT_URL`                | `POSTGRES_URL_NON_POOLING`        |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY`             |

Se o nome interno e seu fallback estiverem definidos, o nome interno vence.
Para reduzir duplicidade na Vercel, pode-se manter somente o alias fornecido
pela integração. Não reconstrua URLs a partir de `POSTGRES_HOST`, usuário e
senha: as URLs completas preservam pooler, porta, TLS e encoding corretos.

### Variáveis configuradas manualmente na Vercel

Estas variáveis não são fornecidas pela integração e devem ser criadas no
projeto Vercel correto:

| Variável                            | Produção                                                 |
| ----------------------------------- | -------------------------------------------------------- |
| `APP_ENV`                           | `production`                                             |
| `NEXT_PUBLIC_APP_URL`               | `https://www.contentecreators.com`                       |
| `CRON_SECRET`                       | segredo aleatório exclusivo, com no mínimo 32 caracteres |
| `PRODUCTION_ADMIN_INITIAL_PASSWORD` | senha inicial dos três administradores aprovados         |
| `SMTP_HOST`                         | host SMTP aprovado pela Marques Branding                 |
| `SMTP_PORT`                         | porta do provedor                                        |
| `SMTP_SECURE`                       | `true` para TLS implícito; `false` para STARTTLS         |
| `SMTP_USER`                         | usuário SMTP                                             |
| `SMTP_PASSWORD`                     | senha de app/credencial SMTP                             |
| `SMTP_FROM_NAME`                    | `Contente Creators` ou nome aprovado                     |
| `SMTP_FROM_EMAIL`                   | remetente aprovado e verificado                          |
| `PUBLIC_SOCIAL_PROOF_ENABLED`       | `false` durante o Beta                                   |
| `SUPPORT_CONTACT_EMAIL`             | contato de privacidade/suporte aprovado                  |

Todas devem ser marcadas para o escopo **Production** do projeto
`contente-creators-prd`. Não exponha `CRON_SECRET`, credenciais SMTP, URLs de
banco ou chaves secretas com prefixo `NEXT_PUBLIC_`.

`PRODUCTION_ADMIN_INITIAL_PASSWORD` é consumida somente pelo bootstrap fechado
dos três administradores documentados em
[Provisionamento de administradores](./admin-provisioning.md). O valor não é
passado pela linha de comando nem impresso. Depois da primeira aplicação
confirmada, um marcador privado na identidade impede que novos deploys
redefinam a senha.

As variáveis SMTP acima são usadas pelos e-mails transacionais da aplicação.
O Supabase Auth também deve receber o SMTP da Marques Branding em seu próprio
dashboard; configurar apenas a Vercel não altera o envio de confirmação,
convite ou recuperação feito diretamente pelo Supabase.

### Configuração feita no Supabase Dashboard

No projeto `contente-creators-prd`:

1. Em Auth URL Configuration, defina **Site URL** como
   `https://www.contentecreators.com`.
2. Adicione redirects exatos necessários, incluindo
   `https://www.contentecreators.com/auth/callback`.
3. Configure o Google OAuth de produção com callback do próprio projeto
   Supabase: `https://kstbhqeiebutpfvswyla.supabase.co/auth/v1/callback`.
4. Configure o SMTP da Marques Branding para o Supabase Auth.
5. Publique os templates `pt-BR` versionados em `supabase/templates/`.
6. Confirme que buckets, RLS, hooks e schema correspondem às migrations
   versionadas.

Não use wildcard de Preview em produção. DEV deve ter sua própria Site URL,
redirects, OAuth, SMTP e projeto Supabase.

## Isolamento DEV e PRD

| Configuração       | Development             | Production                         |
| ------------------ | ----------------------- | ---------------------------------- |
| Vercel             | `contente-creators-dev` | `contente-creators-prd`            |
| Supabase           | `contente-creators-dev` | `contente-creators-prd`            |
| `APP_ENV`          | `development`           | `production`                       |
| App URL            | domínio DEV isolado     | `https://www.contentecreators.com` |
| Branch promovida   | `develop`               | `main`                             |
| Dados/Auth/Storage | somente QA              | somente dados reais do cliente     |

Cada projeto Vercel deve estar conectado somente ao Supabase correspondente.
Nunca copie banco, usuários, Storage, chaves, Google OAuth ou SMTP de PRD para
DEV.

## Ordem de configuração de produção

1. Confirme os projetos `contente-creators-prd` na Vercel e no Supabase.
2. Na integração Supabase/Vercel, conecte explicitamente esses dois projetos.
3. Na Vercel, confirme a presença das variáveis automáticas e o escopo
   **Production**.
4. Adicione as variáveis manuais da tabela acima.
5. Na Vercel, associe `contentecreators.com` e
   `www.contentecreators.com`, escolhendo `www` como origem principal enquanto
   essa for a estratégia vigente.
6. Configure Site URL, redirects, Google e SMTP no Supabase Auth.
7. Confirme que o Build Command vem de `vercel.json`:
   `npm run vercel:build`.
8. Faça redeploy de `main`; mudanças em `NEXT_PUBLIC_*` só entram em vigor
   depois de um novo build.
9. Verifique landing, Auth, readiness, migrations, Storage e áreas protegidas.

## Como o deploy funciona

O deploy da aplicação é executado pela Vercel. Para produção:

```text
push/merge em main
  -> Vercel executa npm run vercel:build
  -> Next.js build
  -> valida Vercel + main + APP_ENV=production + Supabase PRD
  -> dry-run e aplicação de migrations pendentes
  -> verificação do ledger
  -> bootstrap idempotente dos três administradores iniciais aprovados
  -> publicação do artefato pela Vercel
  -> https://contentecreators.com
```

O build usa `POSTGRES_URL_NON_POOLING` como fallback de `DIRECT_URL` para
migrations. `POSTGRES_URL` é o fallback de `DATABASE_URL` usado no runtime.
Nenhuma migration depende de GitHub Environment Secrets.

Builds locais e Preview executam somente o build Next.js; não podem promover o
banco de produção. `vercel.json` habilita o Git deployment de produção apenas
para `main`.

## Diagnóstico rápido

Se o build acusar envs públicas inválidas, verifique:

- `NEXT_PUBLIC_APP_URL`;
- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Se o runtime ou build acusar envs de servidor inválidas, verifique:

- `APP_ENV` e `CRON_SECRET`;
- `POSTGRES_URL` ou `DATABASE_URL`;
- `POSTGRES_URL_NON_POOLING` ou `DIRECT_URL`;
- `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`;
- `PRODUCTION_ADMIN_INITIAL_PASSWORD`;
- todas as variáveis SMTP.

Depois de corrigir qualquer variável na Vercel, faça um novo deployment. As
variáveis `NEXT_PUBLIC_*` são fixadas no bundle durante o build.

Não copie valores secretos em logs, issues, commits ou documentação. Consulte
também:

- [Configuração de ambientes](./environments.md)
- [Provisionamento hospedado](./environment-provisioning.md)
- [Google OAuth de release](./google-oauth-release.md)
- [Deploy e migrations](./deployment-runbook.md)
- [Entrega de e-mails](./email-delivery.md)
