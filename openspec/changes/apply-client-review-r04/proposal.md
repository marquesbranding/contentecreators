## Why

A revisão R04 do cliente (Thomas, "revisao contente_R04.docx", 09/10/2026) encontrou bugs que bloqueiam o lançamento de 17/10 e pediu ajustes de produto. O principal bug: as métricas do Instagram não são salvas. Entre os ajustes, a parceria com a CDL para 2027 depende do selo "Eu fiz a Jornada do Influenciador". Termos e Política, aceite de cookies e exclusão de conta já foram entregues em mudanças anteriores e ficam fora deste escopo. O escopo segue a resposta combinada com o cliente.

## What Changes

**Patrocínios**

- **Banner da página inicial em carrossel:** o espaço `landing-top` passa a aceitar vários banners ativos (até 5). Eles se alternam automaticamente, um por vez, a cada 6 s, com pausa em hover/foco, indicadores clicáveis e sem animação para quem usa `prefers-reduced-motion`. **BREAKING (contrato interno):** `GET /api/public/sponsorships/landing` passa a responder uma lista, e o cliente aceita o formato antigo durante a janela de cache do CDN.
- **Criador em destaque em carrossel:** o espaço `catalog-featured` passa a aceitar vários criadores (até 10). Eles ficam lado a lado; quando não cabem na largura, a fileira avança sozinha, no mesmo comportamento da vitrine da landing.
- **Cards patrocinados na listagem do catálogo** (`catalog-midlist`):
  - o limite sobe de 3 para 8 anúncios;
  - a ordem é embaralhada a cada acesso;
  - os cards se revezam antes de repetir, e o mesmo card nunca aparece em dois espaços seguidos quando há 2 ou mais;
  - quando faltam anúncios para os espaços, a lista recomeça do primeiro.
- O backoffice descreve corretamente o novo comportamento de cada espaço; os rótulos "1 por vez" e "Até N" passam a refletir a rotação.

**Catálogo**

- **Ordem embaralhada diária:** empresas e criadores deixam de ser listados por data de cadastro e passam a seguir uma ordem pseudoaleatória que muda uma vez por dia (fuso America/Sao_Paulo). O "Carregar mais" continua estável, sem perfis repetidos ou perdidos, mesmo se o dia virar no meio da navegação.
- **Filtro "Associado da CDL"** no diálogo de filtros e na URL (`cdl=1`), para empresas e criadores.
- **Filtro "Fez a Jornada do Influenciador"** no diálogo de filtros e na URL (`jornada=1`).

**Perfis**

- **Nova autodeclaração "Eu fiz a Jornada do Influenciador"** para criadores e empresas:
  - aparece no cadastro, nas correções e na edição do próprio perfil, com nota explicativa e link para www.jornadadoinfluenciador.com.br;
  - mostra um selo com o logo da Jornada nos cards do catálogo, nas páginas de detalhe e no cabeçalho de "Meu perfil", ao lado do selo da CDL;
  - aparece no backoffice como campo Sim/Não na conta e na revisão de moderação, e pode ser apontada em "Solicitar alterações".
- **Bug:** as métricas do Instagram (visualizações, interações, novos seguidores e conteúdo compartilhado) voltam a ser enviadas, salvas e exibidas no perfil público. Hoje os campos não têm `name` e somem do envio.
- **"Conteúdo que você compartilhou" vira número** (quantidade de publicações), com o exemplo "Ex.: 22". O valor é salvo em nova coluna numérica, e o texto antigo fica preservado, sem ser mais coletado. **BREAKING (dado):** muda o tipo do campo no formulário e no contrato do rascunho.

**Exclusão de conta**

- **Exclusão definitiva e imediata (decisão do cliente, 13/10):** ao confirmar "Excluir minha conta", tudo o que pertence à pessoa é removido na hora. Isso inclui perfil, catálogo, mídias, redes, métricas, rascunhos e contatos, seguindo a matriz de disposição já aprovada. Os registros com guarda legal são anonimizados como hoje. **BREAKING:** sai a janela de recuperação de 30 dias, sai a recuperação pelo backoffice e sai o banimento da identidade.
- O login no Supabase Auth (Google ou e-mail) **não** é apagado nem bloqueado. Se a pessoa voltar, entra normalmente e cai no início do fluxo de cadastro, como alguém novo. O sistema não pode impedir o novo cadastro.
- A cron `/api/cron/account-elimination` deixa de eliminar após 30 dias e fica só como repescagem de falhas, como remoção de Storage que não completou.

**Backoffice**

- **Fim da edição de perfil pelo backoffice:** saem o botão "Editar perfil", a rota `/backoffice/accounts/[accountId]/edit` e as server actions de edição administrativa. Correções passam a ser feitas somente pelo usuário, via "Solicitar alterações" da moderação. **BREAKING (backoffice).**

## Capabilities

### New Capabilities

- `landing-sponsorship-carousel`: vários banners na página inicial pública, com rotação automática acessível.
- `featured-creators-carousel`: vários criadores em destaque no catálogo, lado a lado com avanço automático quando não cabem.
- `catalog-sponsored-cards-rotation`: até 8 cards patrocinados na listagem, com embaralhamento por acesso e revezamento sem repetição consecutiva.
- `catalog-daily-shuffle`: ordem diária embaralhada e estável para paginação de empresas e criadores.
- `catalog-badge-filters`: filtros "Associado da CDL" e "Fez a Jornada do Influenciador".
- `influencer-journey-badge`: autodeclaração, selo, nota explicativa e exibição em moderação.
- `backoffice-profile-edit-removal`: o backoffice deixa de editar perfis, e as correções seguem o fluxo de moderação.
- `account-immediate-deletion`: exclusão definitiva na hora, sem recuperação, com novo cadastro do zero liberado para o mesmo login. Substitui a janela de 30 dias e a recuperação administrativa da change `add-self-service-account-deletion`, que ainda não foi arquivada; por isso entra como capability nova, e a consolidação dos specs fica na task 12.1.

### Modified Capabilities

- `onboarding-creator-metrics`: as métricas do Instagram precisam ser persistidas de ponta a ponta e exibidas no perfil público; "Conteúdo que você compartilhou" passa a ser um número inteiro não negativo.

## Impact

- **Banco:** uma migration nova em `supabase/migrations/`, espelhada em `src/db/schema/profiles.ts`, com:
  - `is_influencer_journey_participant boolean not null default false` em `creator_profiles` e `company_profiles`;
  - `shared_content_count integer check (>= 0)` em `creator_metric_snapshots`;
  - índices parciais para os filtros, quando o plano de execução justificar;
  - atualização das funções e views que projetam `is_cdl_member`, se houver.
- **Sponsorships:**
  - `src/features/sponsorships/domain/placement-slot-catalog.ts` (limites e rótulos);
  - query, handler, API e enhancement públicos;
  - novo componente de carrossel da landing;
  - `sponsorship-featured-creator.tsx`;
  - `src/app/_server/catalog-sponsorship-slots.loader.ts` e `src/app/_components/catalog-sponsorship-slots.tsx`.
- **Catálogo:**
  - `drizzle-directory.repository.ts` (ordenação e cursor);
  - `catalog-directory-cursor`;
  - `catalog-directory.schema.ts`, `directory-url-state.ts`, diálogo de filtros, `directory-results.tsx`;
  - cards e views de detalhe.
- **Onboarding:**
  - `profile-form-fields.client.tsx`, `social-channels-form-data.ts`;
  - schemas de formulário e rascunho, autosave;
  - repositórios de cadastro, correção e edição de criador e empresa;
  - `correctable-fields.ts`.
- **Exclusão de conta:**
  - `src/features/account-deletion/`: serviço, ação, gateway Auth, repositório, componentes, `deletion-policy.ts`;
  - migration nova que altera `app_request_account_deletion`/`app_eliminate_account_data`, permite `accounts.auth_user_id` nulo apenas em contas eliminadas e libera patrocínios que referenciam o criador;
  - remoção de `app_admin_recover_account` e do painel de recuperação;
  - templates de e-mail, página `/conta-excluida`, filtro de backoffice e `docs/operations/account-deletion.md`.
- **Backoffice:** remoção da página de edição, do link, do breadcrumb, de `admin-profile.actions.ts` e de `admin-profile-edit.service.ts`, e inclusão do novo campo nas telas de detalhe e de revisão.
- **Assets:** logo da Jornada, entregue pelo cliente, em `public/brand/partners/` (PNG transparente; SVG se vier depois).
- **Testes:** unitários, de componente, de integração com Postgres e e2e Playwright para os fluxos afetados.
- **Fora de escopo:** Termos/Política, cookies e exclusão de conta (já entregues); carrossel no banner de topo do catálogo (o "Carrossel do catálogo" já cobre); validação administrativa da Jornada (fica autodeclarada, como a CDL); métricas além de seguidores para redes que não são o Instagram.
