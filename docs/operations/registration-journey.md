# Cadastro por e-mail ou Google

## Publicação

1. Aplicar `20260915180000_registration_journey.sql` pelo fluxo normal de migrations. Não editar a migration inicial.
2. No Supabase hospedado, copiar `supabase/templates/confirmation.html` para **Confirm signup** e `supabase/templates/magic_link.html` para **Magic Link**. Ambos exibem código e link. O link usa `TokenHash` para funcionar em outro navegador sem depender do verificador PKCE da aba original.
3. Configurar código com 6 dígitos, expiração de 3600 segundos, SMTP próprio e a URL final em Site URL. Autorizar `/auth/callback` nas Redirect URLs. Validar o OAuth Google com a configuração existente (`openid email profile`).
4. Validar um cadastro por código, outro pelo link em navegador diferente e um login Google. Testar também uma identidade confirmada sem senha e a retomada da etapa de redes sociais.

O código não muda configurações de produção. A importação da foto Google aceita somente HTTPS em `lh3.googleusercontent.com`, sem redirecionamentos, limitada a 5 MB e 5 segundos; falhas não impedem o cadastro.

## Ambiente local

Use `NEXT_PUBLIC_APP_URL=http://localhost:3010` e `npm run dev -- --port 3010`, alinhados ao Site URL de `supabase/config.toml`.

`npm run local:reset` aplica migrations e templates locais. O e-mail é capturado no Mailpit em `http://127.0.0.1:54324`. Opcionalmente definir `NEXT_PUBLIC_LOCAL_MAILBOX_URL=http://127.0.0.1:54324` em `.env.local`: o atalho aparece somente em development. Não há código fixo ou bypass de confirmação.

## Compatibilidade e retomada

`/sign-up/account` aponta para `/onboarding/account`; `/onboarding/role` encaminha para a conta ou para a etapa já salva. `accounts.registration_step` armazena o progresso e o salvamento de rascunho atualiza dados e etapa na mesma transação. O envio marca `SUBMITTED` no banco, inclusive pelos caminhos de confirmação legados.

A senha é atualizada no Supabase Auth antes da transação de conta, tipo e rascunho. Esses dois sistemas não compartilham transação: se a persistência falhar depois da senha, a conta continua na etapa de dados e pode repetir o salvamento sem redefinir a senha.

Após um release, remover `CombinedRegistrationForm`, actions antigas de cadastro e finalização de confirmação, e a implementação antiga de escolha de tipo. Preservar os redirecionamentos de URLs antigas conforme a política de links do produto.
