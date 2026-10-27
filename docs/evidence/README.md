# Evidência: debounce de filtros + layout responsivo do backoffice

Capturas geradas com Playwright (Chromium) contra o dev server local, admin local.
Larguras: 1440, 1280, 1024, 768, 390. Pastas: `before/` e `after/`
(`<tela>-<largura>.png`). Dados brutos: `before|after/report-*.json`.

## Debounce (550ms, `src/shared/hooks/use-debounced-callback.ts`)
Digitando 3 caracteres com 100ms entre eles; conta requisições de navegação/API.

| Filtro | Antes | Depois |
| --- | --- | --- |
| Catálogo: seguidores mín. ("123") | 1 busca já com `followersMin=1`; campo travava (`disabled` durante a navegação) e perdia "23" | 1 busca com `followersMin=123`, 550ms após o último dígito |
| Catálogo: busca (300ms) | 1 | 1 (agora 550ms) |
| Backoffice contas / auditoria / moderação / patrocínios | só buscava ao enviar (0 ao digitar) | busca sozinha 550ms após a última letra; Enter/botão aplica na hora |
| Landing / seletor de creator (patrocínios) | filtrava a cada tecla / 250ms | 550ms |

Teste unitário: `src/shared/hooks/use-debounced-callback.component.test.tsx`.

## Layout (referência: moderação)
Telas: contas, auditoria, e-mails, patrocínios, gestão da landing
(`accounts-1280.png`, `audit-1024.png`, `emails-1280.png`, `sponsorships-1280.png`,
`landing-1280.png`). Antes: filtros em colunas fixas em `rem` estouravam o card
(`overflow-hidden`), células `nowrap` empurravam a coluna "Ação" para fora, e
colunas da landing sem `min-w-0`. Depois: grid `auto-fit`, células com quebra de
linha, `overflow-x-auto` como fallback e cartões abaixo de `lg`.
