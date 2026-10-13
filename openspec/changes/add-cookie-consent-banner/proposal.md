## Why

Determinação jurídica: o site precisa de uma caixa de aceite de cookies. A Política de Privacidade v1.0 (cap. 11, 5.5, 6, 8) já promete ao titular que Google Ads e Meta Pixel ficam desativados até o aceite, que recusar não impede o uso da plataforma e que existe um "aviso de cookies" com tecnologias, fornecedor, finalidade e prazo. Hoje não há banner, preferência nem aviso: a promessa publicada não tem implementação.

## What Changes

- Banner de cookies na primeira visita (todas as rotas): "Aceitar" e "Recusar" com mesmo destaque, link para o aviso, sem pré-seleção e sem bloquear o uso do site.
- Categorias: **essenciais** (sempre ativos, sem consentimento) e **publicidade e medição** (Google Ads, Meta Pixel; só após aceite).
- Escolha persistida em cookie próprio (`cc_cookie_consent`, versionado, com data e validade); nova versão da lista de tecnologias ou da Política reabre o banner.
- Link permanente "Preferências de cookies" no rodapé (site e área autenticada) para mudar ou revogar; revogar remove os cookies de terceiros que o navegador permitir e para de carregar as tags.
- Página pública `/cookies` (aviso de cookies): tabela com cookie/tecnologia, fornecedor, finalidade, categoria, prazo.
- Carregamento condicional das tags Google Ads e Meta Pixel somente com aceite e somente se os IDs estiverem configurados por ambiente; eventos: visualização de página e conclusão do cadastro.
- CSP passa a liberar as origens do Google e da Meta apenas quando os IDs estão configurados.

## Capabilities

### New Capabilities

- `cookie-consent`: banner, categorias, persistência, alteração e revogação da escolha.
- `cookie-notice`: página `/cookies` com a lista de tecnologias e prazos.
- `ad-measurement-tags`: carregamento condicional de Google Ads e Meta Pixel e eventos de medição.

### Modified Capabilities

- `app-footer`: rodapé passa a conter o link "Preferências de cookies" além dos links atuais.

## Impact

- UI: `src/app/layout.tsx` (provider/banner), rodapés (marketing e `/app/*`), nova rota `src/app/(marketing)/cookies/page.tsx`, novo módulo `src/features/cookie-consent`.
- Segurança: `src/shared/server/security-headers.ts` (script-src, connect-src, img-src condicionais) e testes.
- Config: novas variáveis públicas `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_META_PIXEL_ID` em `.env.example` e `docs/operations/environments.md`.
- Docs: `docs/launch-blockers.md` (marcar item de cookies), Política cap. 11 (referência).
- Dados: nenhum no banco; consentimento de visitante anônimo fica no navegador.
