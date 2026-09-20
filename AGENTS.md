<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Supabase hospedado

Auth do projeto de produção (`contente-creators-prd`, ref `kstbhqeiebutpfvswyla`)
é configurado pelo repositório, não pelo dashboard. Templates de e-mail, Site
URL, redirect allowlist, rate limits e SMTP ficam em `supabase/config.toml`,
bloco `[remotes.production]`, e vão para o projeto com:

```bash
npm run supabase:config:push
```

Requer `npx supabase login` e `supabase/.env` (copie de `supabase/.env.example`)
com as credenciais SMTP. Valide a conta SMTP antes com
`npm run smtp:check -- --to=<mailbox>`. Detalhes em
`docs/operations/email-delivery.md`.
