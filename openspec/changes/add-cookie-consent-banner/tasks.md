## 1. Registro e estado do consentimento

- [x] 1.1 Criar `src/features/cookie-consent` com `cookie-registry.ts` (tecnologias, fornecedor, finalidade, categoria, prazo, `REGISTRY_VERSION`)
- [x] 1.2 Parse/serialização do cookie `cc_cookie_consent` (versão, decisão, data, validade 12 meses) com testes de expiração e versão
- [x] 1.3 Leitura server-side no layout raiz e `CookieConsentProvider` (client) com `acceptAds`, `rejectAds`, `openPreferences`
- [x] 1.4 Remoção de cookies de publicidade e medição ao revogar

## 2. Banner e preferências

- [x] 2.1 `CookieBanner` acessível (Aceitar/Recusar com mesmo destaque, link `/cookies`, teclado, 320px)
- [x] 2.2 Painel de preferências com toggle "Publicidade e medição" e salvar
- [x] 2.3 `CookiePreferencesButton` no rodapé do site e no rodapé do app shell; incluir link `/cookies`
- [x] 2.4 Testes de componente: primeira visita, aceitar, recusar, alterar, expirar, nova versão

## 3. Aviso de cookies

- [x] 3.1 Página pública `/cookies` gerada do registro, com versão/data, tabelas e orientação de bloqueio no navegador
- [x] 3.2 Teste: toda tecnologia do registro aparece na página; falha se o registro mudar sem subir a versão

## 4. Tags de publicidade e medição

- [x] 4.1 Variáveis `NEXT_PUBLIC_GOOGLE_ADS_ID` e `NEXT_PUBLIC_META_PIXEL_ID` em `.env.example` e docs de ambiente
- [x] 4.2 `AdMeasurementTags` carregando gtag.js e fbevents.js só com consentimento e ID
- [x] 4.3 Eventos de página e de cadastro concluído, sem dados pessoais
- [x] 4.4 CSP condicional em `security-headers.ts` e testes (com/sem IDs)

## 5. Verificação e documentação

- [ ] 5.1 e2e: sem escolha nada vai a Google/Meta; aceitar carrega; revogar para; 320/390/1440; a11y
- [x] 5.2 Atualizar `docs/launch-blockers.md` (item de cookies) e Open Questions pendentes com jurídico/marketing
- [x] 5.3 Rodar lint, typecheck, unit, component e e2e relevantes
