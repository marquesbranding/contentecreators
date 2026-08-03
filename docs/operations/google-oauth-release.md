# Google OAuth release checklist

Este checklist fixa o contrato de release do login com Google para o domínio
oficial do Contente Creators. Não registre secrets, screenshots com secrets ou
tokens neste arquivo.

## Produção

| Item                          | Valor                                                       |
| ----------------------------- | ----------------------------------------------------------- |
| Domínio canônico da aplicação | `https://www.contentecreators.com`                          |
| Projeto Supabase              | `kstbhqeiebutpfvswyla`                                      |
| URL pública do Supabase       | `https://kstbhqeiebutpfvswyla.supabase.co`                  |
| Callback do app               | `https://www.contentecreators.com/auth/callback`            |
| Recovery do app               | `https://www.contentecreators.com/reset-password`           |
| Callback Google/Supabase      | `https://kstbhqeiebutpfvswyla.supabase.co/auth/v1/callback` |

## Estado local verificado

O arquivo de credenciais Google recebido para configuração local contém:

- `client_id` do OAuth Web Client;
- `redirect_uris` com `https://kstbhqeiebutpfvswyla.supabase.co/auth/v1/callback`;
- `redirect_uris` com `http://127.0.0.1:54321/auth/v1/callback`;
- `client_secret` presente.

O valor do `client_secret` não deve ser impresso, commitado ou compartilhado em
mensagens. Como ele já foi compartilhado por print/conversa, gere um secret novo
antes do release final.

## Google Cloud

No OAuth Client usado em produção:

1. Confirme o tipo **Web application**.
2. Configure o redirect autorizado:
   `https://kstbhqeiebutpfvswyla.supabase.co/auth/v1/callback`.
3. Se usar JavaScript origins no client, configure:
   `https://www.contentecreators.com`.
4. Se o consent screen estiver em **Testing**, adicione os e-mails aprovados em
   **Test users** ou publique o app antes do acesso aberto.

## Supabase Dashboard

No projeto `kstbhqeiebutpfvswyla`:

1. Em **Authentication > URL Configuration**, configure **Site URL**:
   `https://www.contentecreators.com`.
2. Em **Redirect URLs**, inclua:
   - `https://www.contentecreators.com/auth/callback`;
   - `https://www.contentecreators.com/reset-password`.
3. Em **Authentication > Providers > Google**, habilite Google e salve o
   `Client ID` e o `Client Secret` do OAuth Web Client de produção.

## Vercel

No projeto de produção:

1. Configure o domínio principal como `www.contentecreators.com`.
2. Garanta que `contentecreators.com` redirecione para
   `www.contentecreators.com`.
3. Configure `NEXT_PUBLIC_APP_URL=https://www.contentecreators.com`.
4. Confirme `NEXT_PUBLIC_SUPABASE_URL=https://kstbhqeiebutpfvswyla.supabase.co`.
5. Faça novo deploy depois de alterar qualquer variável `NEXT_PUBLIC_*`.

## Teste final

1. Acesse `https://www.contentecreators.com/login`.
2. Clique em **Continuar com o Google**.
3. Confirme o redirecionamento:
   Google -> Supabase Auth -> `/auth/callback` da aplicação.
4. Primeiro acesso deve cair na escolha/complemento de perfil.
5. Conta aprovada deve cair na área privada esperada.

Se aparecer `redirect_uri_mismatch`, o redirect autorizado no Google Cloud não
bate exatamente com o callback do Supabase. Se o login volta para outro domínio,
revise `NEXT_PUBLIC_APP_URL` na Vercel e **Site URL** no Supabase.
