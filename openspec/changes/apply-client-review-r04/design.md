## Context

Revisão R04 do cliente (09/10/2026), lançamento em 17/10/2026. Estado atual verificado no código:

- **Espaços de patrocínio** — `placement-slot-catalog.ts` define `limit: 1` para `landing-top`, `catalog-top`, `catalog-inline` e `catalog-featured`; `catalog-carousel` aceita 10 e `catalog-midlist` 3. A entrega (`sponsorship-delivery.service.ts`) ordena por `sortOrder` e corta em `limit`.
- **Landing** — `src/app/page.tsx` é estática (`dynamic = "error"`); o banner chega no cliente via `PublicSponsorshipPromotionEnhancement` → `GET /api/public/sponsorships/landing` (cache `s-maxage=60, stale-while-revalidate=240`), que hoje devolve **um** `RendererPlacementDto | null` (`loadPublicSponsorshipPromotion` faz `find`).
- **Criador em destaque** — `catalog-sponsorship-slots.loader.ts` usa `featured[0]`; `CatalogSponsorshipSlots` renderiza um único `SponsorshipFeaturedCreator`.
- **Cards na listagem** — `directory-results.tsx` insere um card a cada `SPONSORED_CARD_INTERVAL = 8` itens e escolhe `sponsoredCards[adIndex % length]`. A lista é **infinita** (`useInfiniteQuery` + "Carregar mais"), então `items` acumula páginas e o índice já é global. Com 1 anúncio, ele repete em todo espaço (relato do cliente).
- **Ordem do diretório** — `drizzle-directory.repository.ts` faz `union all` de criadores e empresas, `order by "createdAt" asc, id asc`, cursor keyset `{createdAt, id, kind}` (`directoryCursorPayloadSchema`).
- **CDL** — `is_cdl_member` em `creator_profiles`/`company_profiles` (commit `e5112a0`), checkbox controlado + hidden input em `ProfileFormFields`, `CdlMemberBadge` em `src/shared/components/cdl-member-badge.tsx`, propagado por ~40 arquivos (cadastro, rascunho, correção, edição, catálogo, detalhe, backoffice, `correctable-fields`). Não existe filtro.
- **Métricas Instagram** — `InstagramMetricField` (`profile-form-fields.client.tsx:160`) renderiza `<Input>` controlado **sem `name`**; `readSocialChannels` (`social-channels-form-data.ts`) lê `socialChannels.INSTAGRAM.views|interactions|newFollowers|sharedContent` do `FormData` e nunca encontra nada. Persistência (`drizzle-influencer-profile.repository.ts`, cadastro) e exibição (`catalog-detail-view.tsx` "Painel do Instagram") já tratam os campos. `shared_content_description text` é o único destino de "Conteúdo que você compartilhou".
- **Edição pelo backoffice** — `/backoffice/accounts/[accountId]/edit` + `admin-profile.actions.ts` + `admin-profile-edit.service.ts` (+ server variant), link "Editar perfil" em `accounts/[accountId]/page.tsx`, breadcrumb em `backoffice-shell.client.tsx:183`.

## Goals / Non-Goals

**Goals:**

- Entregar os nove itens combinados com o cliente sem regressão nos fluxos de cadastro, moderação e catálogo.
- Reaproveitar padrões existentes (CDL, vitrine da landing, `SponsorshipCarousel`) em vez de criar abstrações novas.
- Manter paginação do catálogo determinística e acessibilidade (WCAG 2.2.2) nos elementos que se movem sozinhos.

**Non-Goals:**

- Carrossel no `catalog-top` ou `catalog-inline` (continuam 1 por vez).
- Validação administrativa da Jornada; histórico de quem marcou.
- Migrar o texto antigo de `shared_content_description` para número.
- Auditoria/ACL nova no backoffice além da remoção da edição.

## Decisions

### D1. Landing: endpoint passa a devolver lista, cliente tolerante ao formato antigo

`loadPublicSponsorshipPromotion` vira `loadPublicSponsorshipPromotions` e devolve `RendererPlacementDto[]` (filtro `isGenericPublicPromotion` mantido, ordem `sortOrder`). Handler responde `[]` em vez de `null` quando vazio. `fetchPublicSponsorshipPromotion` normaliza: `Array.isArray(x) ? x : x ? [x] : []` — necessário porque o CDN pode servir o JSON antigo por até 5 min após o deploy.
`landing-top.limit` passa de 1 para 5.
_Alternativa descartada:_ novo endpoint `/landing/v2` — duplicaria handler/teste sem ganho, já que a tolerância no cliente cobre a transição.

### D2. Componente de rotação do banner: novo `SponsorshipHeroRotator` sobre `SponsorshipHeroBanner`

Um único banner → renderiza `SponsorshipHeroBanner` como hoje (zero mudança visual). Dois ou mais → `SponsorshipHeroRotator` (client) empilha os banners (mesmo aspect ratio do slot, só o ativo visível/`aria-hidden=false`), avança a cada **6 s** (cliente sugeriu 2–3 s; banners têm texto sobreposto e 6 s respeita leitura e WCAG 2.2.2 com controle de pausa), pausa em `pointerenter`/`focusin`/aba oculta (`visibilitychange`), mostra indicadores (botões com `aria-label="Banner N de M"`, `aria-current`) e botão pausar/retomar. `prefers-reduced-motion: reduce` → sem autoplay, troca só por indicador, sem transição. Transição: crossfade 300 ms via CSS. Região com `role="region"` + `aria-roledescription="carrossel"` + `aria-live="off"` durante autoplay, `polite` quando o usuário navega.
Mídias do 2º banner em diante com `loading="lazy"`.
_Alternativa descartada:_ reutilizar `SponsorshipCarousel` (scroll-snap de cards) — layout é de cards múltiplos por linha, não hero full-width.

### D3. Criador em destaque: lista + fileira com avanço automático

`catalog-featured.limit` 1 → 10. Loader devolve `featured: CatalogSponsorshipSlotDto[]` (todos elegíveis com `featuredCreator`). `CatalogSponsorshipSlots`:

- 1 criador → `SponsorshipFeaturedCreator` atual.
- ≥2 → novo `SponsorshipFeaturedCreatorsRow` (client): cards compactos lado a lado (`basis` responsivo como `SponsorshipCarousel`: 1/2/3/4 por linha). Se `scrollWidth > clientWidth`, ativa avanço automático a cada 5 s (scroll-snap para o próximo card, volta ao início no fim), com as mesmas regras de pausa/reduced-motion/indicadores de D2. Se cabe, fica estático (comportamento "fixos" pedido pelo cliente, equivalente ao `MIN_SHOWCASE_CAROUSEL_ITEMS` da vitrine).
  Lógica de pausa/reduced-motion/timer extraída para hook `useAutoAdvance({ count, intervalMs, enabled })` em `src/shared/hooks/`, usado por D2 e D3.
  _Alternativa descartada:_ `ScrollVelocityRow` (magicui, rolagem contínua) da vitrine — movimento contínuo com 2–3 itens parece conteúdo duplicado; o próprio código da vitrine evita isso abaixo de 4 itens.

### D4. Cards na listagem: embaralhar no servidor por requisição, revezar no cliente

`catalog-midlist.limit` 3 → 8. `buildCatalogSponsoredCards` recebe a lista elegível e aplica Fisher–Yates com `crypto.randomInt` (página do catálogo já é dinâmica por usuário; nada é cacheado entre acessos). O cliente mantém `sponsoredCards[adIndex % length]` — como `items` acumula todas as páginas do "Carregar mais", o revezamento percorre todos os anúncios antes de repetir e, com ≥2 anúncios, nunca há dois iguais em espaços consecutivos. Com 1 anúncio, repete (combinado com o cliente: "voltam a mostrar os primeiros").
Remover o `slice(0, 3)` hardcoded em `buildCatalogSponsoredCards` e usar `getPlacementSlot("catalog-midlist").limit`.
A ordem embaralhada precisa sobreviver a re-renders: o array é criado no Server Component e passado como prop — estável durante a sessão da página; novo acesso/refresh = nova ordem.
_Alternativa descartada:_ embaralhar no cliente com `Math.random` em `useMemo` — causa mismatch de hidratação.

### D5. Ordem diária: chave `md5(id || seed)` com seed no cursor

Seed = `YYYY-MM-DD` em America/Sao_Paulo + segredo opcional `CATALOG_SHUFFLE_SALT` (env, default fixo) para não ser trivialmente previsível. Cada branch do `union all` projeta `md5(<profile>.id::text || ${seed}) as "sortKey"`; ordenação `order by "sortKey" asc, id asc`. Cursor muda para `{ v: 2, seed, sortKey, id, kind }`; predicado keyset `("sortKey" > :sortKey or ("sortKey" = :sortKey and id > :id))` aplicado **sobre a união** (subquery), não por branch, já que `sortKey` é comparável entre tipos.
A requisição com cursor usa o `seed` do cursor (não o do dia), então virar a meia-noite no meio da navegação não repete nem pula perfis. Cursor v1 (`createdAt`) recebido após o deploy → descartado com fallback para primeira página (falha de parse já leva a isso; garantir teste).
Performance: `md5` em ~centenas/milhares de linhas é desprezível; sem índice. Reavaliar com `EXPLAIN` acima de 20k perfis.
Perfil do próprio visitante (`isOwnProfile`) continua listado na posição sorteada.
_Alternativas descartadas:_ `ORDER BY random()` (quebra keyset); `setseed()` + `random()` (estado de sessão em pool transacional, não confiável); coluna `shuffle_rank` recalculada por cron (mais peças móveis para o mesmo resultado).

### D6. Jornada do Influenciador: clonar o caminho do CDL

Coluna `is_influencer_journey_participant boolean not null default false` em `creator_profiles` e `company_profiles`; Drizzle `isInfluencerJourneyParticipant`. Percorrer **cada** arquivo que referencia `isCdlMember` (lista no tasks.md) e adicionar o campo lado a lado: schemas de formulário/rascunho, autosave, hidden input + checkbox controlado (mesma técnica para gravar `false`), repositórios de cadastro/correção/edição, `correctable-fields` (label "Jornada do Influenciador"), DTOs/queries do catálogo e detalhe, backoffice (detalhe e revisão, Sim/Não).
UI do checkbox: "Eu fiz a Jornada do Influenciador" com logo pequeno, seguido da nota: "* A Jornada do Influenciador é uma iniciativa que capacita, profissionaliza e potencializa o perfil de influência de seus participantes. Para saber mais acesse: www.jornadadoinfluenciador.com.br" (link `target="_blank" rel="noopener noreferrer"`). A mesma nota aparece nas páginas de detalhe quando o selo está ativo (pedido do cliente no perfil empresa).
Selo `InfluencerJourneyBadge` em `src/shared/components/`, mesmo formato pill do `CdlMemberBadge`: fundo branco fixo (logo azul `#0021A5` some em fundo escuro), `next/image` do wordmark com altura 14 px nos cards e 16 px no detalhe, `alt="Jornada do Influenciador"`, tooltip/`title` com a nota curta. Renderizado imediatamente após o `CdlMemberBadge` em todos os pontos onde ele aparece.
Asset: `public/brand/partners/jornada-do-influenciador.png` (wordmark recebido do cliente, recortado sem margem; ~4,5:1).
_Alternativa descartada:_ tabela genérica de "selos" — over-engineering para 2 flags; revisitar se surgir o 3º.

### D7. Filtros CDL e Jornada

`directoryFiltersSchema` ganha `cdl` e `jornada` (`z.preprocess` de `"1"|"true"` → `true`, ausente → `undefined`). URL state (`directory-url-state.ts`) serializa como `cdl=1`/`jornada=1`. Repositório adiciona predicado `is_cdl_member` / `is_influencer_journey_participant` nas duas branches. Diálogo "Filtrar catálogo" ganha seção "Selos" com dois checkboxes ("Associado da CDL", "Fez a Jornada do Influenciador"). Chips de filtro ativo/limpar seguem o padrão existente. Cursor não carrega filtros (já é assim) — mudar filtro zera cursor.

### D8. Métricas do Instagram: `name` nos inputs + inteiro para conteúdo compartilhado

`InstagramMetricField` recebe prop `name` e repassa ao `<Input>`; os quatro campos usam `socialChannels.INSTAGRAM.{views,interactions,newFollowers,sharedContent}`. Isso conserta cadastro, correção, edição e autosave de uma vez (todos passam por `readSocialChannels`).
"Conteúdo que você compartilhou": `type="number"`, `min=0`, `inputMode="numeric"`, placeholder "Ex.: 22", tooltip atual mantido. Schema `sharedContent` → `optionalNonNegativeInt`. Persistência grava em nova coluna `shared_content_count integer check (shared_content_count >= 0)`; `shared_content_description` deixa de ser escrita (fica para histórico). Rascunhos antigos com texto não numérico: o parser do rascunho descarta o valor (campo vazio) em vez de falhar o draft inteiro.
Exibição: "Painel do Instagram" adiciona "Conteúdo compartilhado" ao grid numérico (`shared_content_count`); se só houver texto legado, mantém a linha textual atual. Repositórios de detalhe/diretório/backoffice passam a projetar a coluna nova.
Verificar também se o mesmo bug de `name` afeta outros inputs controlados do formulário (varredura em `profile-form-fields.client.tsx`).

### D9. Remoção da edição pelo backoffice

Apagar `app/backoffice/(protected)/accounts/[accountId]/edit/`, o link "Editar perfil", o segmento de breadcrumb, `admin-profile.actions.ts`, `admin-profile-edit.service.ts`, `server-admin-profile-edit.service.ts`, exports em `features/onboarding/server.ts` e testes associados. `ProfileFormFields` perde props/variantes exclusivas do modo admin, se houver. Rota antiga → `notFound()` naturalmente (diretório removido). Funções SQL/policies usadas só pela edição admin: manter no banco nesta entrega (remoção em migration futura) para não acoplar risco de dados ao lançamento; registrar em Open Questions.
Na tela da conta, no lugar do botão, texto curto: "Para corrigir dados, use Solicitar alterações na moderação." com link para a submissão vigente quando existir.

### D10. Exclusão de conta definitiva e imediata, com recadastro liberado

**Estado atual (commit `097e84a`, migration `20261014120000_account_self_deletion.sql`):**

- `app_request_account_deletion()` arquiva a conta, revoga contatos e define prazos (`elimination_eligible_at` em +30 dias, `deletion_due_at` em +120 dias), depois o gateway **bane** a identidade no Auth.
- A cron diária chama `app_eliminate_account_data()` após 30 dias (Storage → banco → soft delete do Auth).
- O admin pode recuperar a conta com `app_admin_recover_account`.
- A conta vira tombstone, mas mantém `auth_user_id`.

**Bloqueios encontrados para o recadastro:**

1. `accounts.auth_user_id` é `NOT NULL` e tem `unique (auth_user_id, role)`. A tombstone ocupa o par login+papel, então um novo cadastro com o mesmo papel falha como conflito, e os resolvers de identidade encontram a conta eliminada.
2. `sponsorship_placements.featured_creator_profile_id` é `ON DELETE RESTRICT`, e há um `CHECK` que exige o campo em `FEATURED_CREATOR`. A eliminação hoje aborta com `account_elimination_blocked_by_sponsorship`, o que inviabiliza a exclusão "na hora".

**Novo fluxo, numa única ação do usuário:**

1. Reautenticação e confirmação "EXCLUIR", mantidas.
2. Nova `app_delete_own_account()` (security definer, executável pelo papel da aplicação, só sobre a conta do `auth.uid()`), numa transação auditada:
   - aplica a mesma matriz de disposição de `app_eliminate_account_data` (DELETE, ANONYMIZE e RETAIN);
   - arquiva os patrocínios de "Criador em destaque" daquele criador e zera `featured_creator_profile_id` neles; o `CHECK` passa a aceitar nulo quando `status = 'ARCHIVED'`;
   - patrocínios em que a conta é anunciante continuam apontando para a tombstone (a FK é para `accounts`, que permanece) e são arquivados;
   - a tombstone fica com `auth_user_id = null`, `deletion_state = 'ELIMINATED'` e `eliminated_at = now()`; nova constraint `auth_user_id is not null or deletion_state = 'ELIMINATED'`;
   - enfileira o e-mail de confirmação **antes** do scrub, marcado com `retain_until_sent`. O processador do outbox anonimiza destinatário e payload logo após o envio ou na falha definitiva. Sem isso, o e-mail sairia com payload vazio.
3. Depois do commit, a ação remove os objetos do Storage (os caminhos são coletados pela função antes de apagar `media_assets`). Se falhar, os caminhos vão para uma fila `storage_cleanup_queue`, sem dados pessoais, só bucket e caminho, e a cron tenta de novo.
4. A ação encerra as sessões (`signOut` global) sem banir e sem apagar o usuário do Auth. Redireciona para `/conta-excluida`.
5. Num novo login, os resolvers não encontram conta para aquele `auth_user_id` e o usuário cai na seleção de papel e no cadastro do zero, sem nenhum dado anterior. Pode escolher outro papel.

**O que sai:**

- `RECOVERY_WINDOW_DAYS` e `isRecoverable`;
- `app_admin_recover_account` (drop) e `recover-account.action.ts`;
- `recover-account-panel.client.tsx`;
- filtro "Exclusão solicitada" no backoffice, substituído por "Excluída", só leitura e sem dados pessoais;
- textos de "30 dias" na seção de exclusão, na página `/conta-excluida` e nos templates de e-mail;
- ban e soft delete da identidade no `supabase-account-deletion-identity.gateway.ts`, que passa a só encerrar sessões.

**O que fica:**

- contas **banidas** continuam sem poder se excluir, e `blocked_identities` continua impedindo o reingresso de quem foi banido;
- consentimentos, auditoria e moderação são anonimizados exatamente como na matriz aprovada;
- os logs de acesso seguem os 6 meses do Marco Civil, fora do banco;
- a cron `/api/cron/account-elimination` vira repescagem: processa a `storage_cleanup_queue` e contas `deletion_state = 'FAILED'`, se houver; o alerta de prazo legal continua.

**Contas já em `REQUESTED`** na migração, criadas entre o deploy de `097e84a` e este: a migration (ou um script de operação) as elimina imediatamente pelo novo caminho e libera `auth_user_id`; nenhum ban é mantido para elas (o gateway remove o ban). Antes de rodar em produção, listar e confirmar.

**Alternativas descartadas:**

- Apagar o usuário do Auth: o cliente pediu explicitamente para manter o login. Apagar também quebraria o "Entrar com Google" de quem quer voltar, criando outro usuário com outro id.
- Índice único parcial `where deletion_state is distinct from 'ELIMINATED'` em vez de anular `auth_user_id`: os resolvers e as policies de RLS continuariam enxergando a tombstone pelo `auth_user_id` e precisariam de filtro em todo lugar.

## Risks / Trade-offs

- [CDN serve JSON antigo do banner após deploy] → normalização no cliente (D1) + teste unitário dos três formatos.
- [Cursor v1 em abas abertas durante deploy] → parse falha → volta à primeira página; aceitável, coberto por teste.
- [Autoplay distrai/viola WCAG] → 6 s/5 s, pausa em hover/foco/aba oculta, botão pausar, reduced-motion sem autoplay.
- [Rascunhos com `sharedContent` textual quebram validação] → preprocess tolerante no schema de rascunho; validação estrita só no submit.
- [Esquecer um dos ~40 pontos do CDL ao clonar para Jornada] → checklist explícito em tasks.md + teste de componente nos cards/detalhe + e2e marcando e vendo o selo.
- [Remover edição admin quebra fluxo de suporte] → "Solicitar alterações" já cobre; comunicado ao cliente (item 6 da resposta).
- [Seed diário previsível permite "furar fila"] → salt em env; impacto baixo (sem ganho econômico direto).
- [Exclusão imediata sem volta: clique por engano ou conta comprometida] → manter reautenticação recente (5 min) + frase "EXCLUIR" + texto explícito "não há como recuperar"; e-mail de confirmação informa que basta se cadastrar de novo se quiser voltar.
- [Algum resolver/policy ainda depender de `auth_user_id` não nulo] → teste de integração: excluir → logar de novo com o mesmo `auth_user_id` → seleção de papel → cadastro completo → aprovação; testar mesmo papel e papel diferente.
- [Storage falha depois do commit] → fila de limpeza + repescagem diária; objetos órfãos não são acessíveis (URLs assinadas e `media_assets` já apagados).
- [Admin com perfil vinculado (`admin-linked-application-profile`) exclui o perfil] → só a linha não-admin é eliminada; a linha ADMIN do mesmo login permanece intacta; teste dedicado.
- [Logo ilegível em 14 px] → validar visualmente; fallback para pill com emblema + texto "Jornada" se necessário (mesma estratégia do CDL, que usa emblema recortado).

## Migration Plan

1. Migration `supabase/migrations/2026101415xxxx_client_review_r04.sql` (aditiva: 2 booleans + 1 integer). Aplicar local (`supabase db reset`/migrate), rodar testes de integração, depois produção antes do deploy do app.
2. Deploy do app (Vercel). Ordem segura: colunas novas têm default, código antigo ignora.
3. Rollback: reverter deploy do app; colunas ficam (inofensivas). Nenhum dado destrutivo.
4. Pós-deploy: smoke na landing (1 e 2 banners), catálogo (ordem, filtros, cards), cadastro com métricas, backoffice sem botão de edição.

## Open Questions

- Intervalo do banner (6 s) e da fileira de criadores (5 s) — confirmar com o cliente após ver em staging.
- Máximo de banners na landing (5) e de criadores em destaque (10) — números iniciais, ajustáveis no `placement-slot-catalog`.
- Remover em migration futura as funções SQL exclusivas da edição admin?
- Logo em SVG do cliente para nitidez em telas densas.
- Há contas em `REQUESTED` em produção hoje? Se sim, confirmar com o cliente a eliminação imediata delas ao aplicar a migration.
- O texto da Política v1.0 menciona recuperação de conta? (A proposta anterior cita apenas "até 120 dias"; conferir o PDF antes do deploy.)
