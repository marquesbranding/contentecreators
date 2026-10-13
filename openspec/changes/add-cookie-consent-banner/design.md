## Context

Next.js 16 (App Router), CSP estrita em `security-headers.ts` (`script-src 'self' 'unsafe-inline'`, `object-src 'none'`, `connect-src` só Supabase). Nenhum rastreador existe hoje. Cookies atuais são essenciais (sessão Supabase, `cc_signup_email`). A Política v1.0 define: essenciais sem consentimento (art. 7º V e IX); publicidade e medição com consentimento (art. 7º I), desativadas até aceitar, recusar não impede uso; Google e Meta tratam fora do Brasil; prazo "conforme aviso de cookies".

## Goals / Non-Goals

**Goals:**

- Consentimento prévio, livre, informado e revogável para publicidade e medição.
- Nenhuma requisição a Google/Meta antes do aceite.
- Aviso de cookies verdadeiro e fácil de manter junto com o código.

**Non-Goals:**

- Analytics próprio ou outras tags além de Google Ads e Meta Pixel.
- Registro server-side do consentimento de visitantes anônimos (ver Open Questions).
- Consent Mode do Google / CMP de terceiros.
- Exclusão de conta (change separada).

## Decisions

1. **Estado em cookie próprio `cc_cookie_consent`** (JSON: `v` versão da lista, `ads` boolean, `at` ISO, `exp`), `SameSite=Lax`, `Secure` em produção, path `/`, validade 12 meses. Alternativa localStorage: rejeitada, servidor não lê e SSR não sabe se mostra o banner (flash). Para não tornar todas as rotas dinâmicas, o cookie é lido só no cliente (`useSyncExternalStore`): o banner aparece após a hidratação e nada de terceiros carrega antes disso.
2. **Lista de tecnologias como dado único** (`cookie-registry.ts`: nome, fornecedor, finalidade, categoria, prazo) alimentando a página `/cookies` e a versão do consentimento; mudar a lista exige subir `REGISTRY_VERSION`, o que reabre o banner.
3. **Componentes**: Store externo no cliente (`consent-store.ts`) lê `document.cookie` e expõe `acceptAds/rejectAds/openPreferences` via hook; sem provider e sem `cookies()` no layout raiz; `CookieBanner` (região `role="dialog"` não modal, foco gerenciado, teclado, 320px sem cobrir conteúdo crítico) e `CookiePreferencesButton` no rodapé. Alternativa biblioteca de terceiros: rejeitada (dependência, estilos, e CSP).
4. **Tags só após consentimento**: `AdMeasurementTags` (client) injeta `gtag.js` e `fbevents.js` via `next/script` `afterInteractive` quando `ads === true` e o ID existe. Revogação: para de enviar eventos, remove cookies `_ga*`, `_gcl_*`, `_fbp`, `_fbc` do domínio quando acessíveis e recarrega a página para descarregar os scripts.
5. **CSP condicional**: `createSecurityHeaders` adiciona `https://www.googletagmanager.com`, `https://www.google.com`, `https://googleads.g.doubleclick.net`, `https://connect.facebook.net`, `https://www.facebook.com` em `script-src`/`connect-src`/`img-src` somente quando ao menos um ID público está configurado. Alternativa nonce por requisição: adiada (forçaria render dinâmico em todas as rotas).
6. **Eventos**: `page_view` em mudança de rota; `CompleteRegistration`/conversão Ads após submissão do cadastro bem-sucedida (cliente, só se consentido). Nenhum dado pessoal (nome, e-mail, id de conta) vai nos eventos.
7. **Rodapé**: botão "Preferências de cookies" nos rodapés do site e do app shell reabre o banner em modo preferências (toggle publicidade/medição + salvar).

## Risks / Trade-offs

- [Banner cobre CTA em mobile] → posição inferior com altura limitada, foco não preso, teste 320/390.
- [CSP liberada para terceiros ampliando superfície] → só com IDs configurados; sem IDs em local/preview, nada é liberado.
- [Cookies de terceiros fora do alcance de remoção] → documentar no aviso como removê-los no navegador (Política já informa).
- [Versão da lista muda e reabre banner para todos] → intencional; só incrementar quando a lista mudar.
- [Sem prova server-side do consentimento] → aceito para v1, avaliar com jurídico.

## Migration Plan

1. Entregar banner, página e rodapé com IDs vazios (nenhuma tag carrega).
2. Jurídico/Marketing aprovam prazos e lista; configurar IDs em DEV; validar com DevTools que nada sai antes do aceite.
3. Configurar IDs em PRD no go-live. Rollback: remover as variáveis (tags param, banner permanece).

## Open Questions

- Prazos reais de `_ga*`, `_gcl_*`, `_fbp`, `_fbc` e validade do próprio consentimento (assumido 12 meses): confirmar com jurídico.
- Precisamos de prova server-side do consentimento de visitante (log com hash de IP/UA, como em `account_consents`)? Assumido: não nesta change.
- IDs reais do Google Ads e do Meta Pixel, e quais conversões marketing quer além de cadastro concluído.
- Cookies essenciais devem ser listados individualmente (`sb-*-auth-token`, `cc_signup_email`)? Assumido: sim.
