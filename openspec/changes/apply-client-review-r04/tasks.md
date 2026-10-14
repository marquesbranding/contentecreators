## 1. Correção crítica: métricas do Instagram (bloqueia lançamento)

- [x] 1.1 Teste de componente/ação reproduzindo o bug: preencher Visualizações/Interações/Novos seguidores no editor, submeter e verificar que `readSocialChannels` recebe os valores (deve falhar antes do fix)
- [x] 1.2 `InstagramMetricField` (`src/features/onboarding/components/profile-form-fields.client.tsx`) recebe prop `name` e repassa ao `<Input>`; os quatro campos usam `socialChannels.INSTAGRAM.{views,interactions,newFollowers,sharedContent}`
- [x] 1.3 Varredura no `profile-form-fields.client.tsx` por outros inputs controlados sem `name` que `FormData` deveria ler; corrigir o que encontrar
- [x] 1.4 Verificar autosave (`use-onboarding-autosave.ts`) e recarga do rascunho com as métricas preenchidas
- [x] 1.5 Teste de integração (Postgres): editar perfil com métricas → `creator_metric_snapshots` do Instagram com `view_count`, `interaction_count`, `new_follower_count` gravados; YouTube/TikTok sem esses valores
- [x] 1.6 Validar no app local: preencher, salvar, recarregar "Meu perfil" e abrir o detalhe público ("Painel do Instagram" com todos os valores)

## 2. Banco de dados

- [x] 2.1 Migration `supabase/migrations/<timestamp>_client_review_r04.sql`: `is_influencer_journey_participant boolean not null default false` em `creator_profiles` e `company_profiles`; `shared_content_count integer` com `check (shared_content_count >= 0)` em `creator_metric_snapshots`
- [x] 2.2 Conferir se funções/views/policies SQL projetam `is_cdl_member` (grep nas migrations) e incluir a coluna nova onde for necessário
- [x] 2.3 Espelhar no Drizzle (`src/db/schema/profiles.ts`): `isInfluencerJourneyParticipant`, `sharedContentCount`
- [x] 2.4 Atualizar seeds locais (`scripts/seed-*`) com alguns perfis CDL/Jornada e métricas completas
- [x] 2.5 Aplicar localmente e rodar a suíte de integração existente

## 3. "Conteúdo que você compartilhou" numérico

- [x] 3.1 Schemas (`onboarding-form-schema.ts`, `influencer-profile-edit-schema.ts`): `sharedContent` → inteiro não negativo opcional; mensagem pt-BR
- [x] 3.2 Schema do rascunho (`onboarding-draft-schema.ts`): aceitar valor legado textual descartando-o (vazio) sem invalidar o draft; teste unitário
- [x] 3.3 Campo no formulário: `type="number"`, `min=0`, `inputMode="numeric"`, placeholder "Ex.: 22", sem `minLength/maxLength`; manter tooltip
- [x] 3.4 Repositórios de cadastro, correção e edição (`drizzle-onboarding-registration`, `drizzle-corrected-profile-resubmission`, `drizzle-influencer-profile`) gravam em `shared_content_count` e param de escrever `shared_content_description`
- [x] 3.5 Leitura: repositórios de detalhe (`drizzle-catalog-detail`), diretório, perfil próprio e backoffice (`drizzle-account-detail`, `drizzle-submission-review`) projetam `sharedContentCount`; tipos/mappers/schemas de view atualizados
- [x] 3.6 `catalog-detail-view.tsx` "Painel do Instagram": tile "Conteúdo compartilhado" com o número; manter linha textual só para legado sem número; ajustar `form-error-summary` label
- [x] 3.7 Atualizar testes de componente/unitários que usam `sharedContent` texto

## 4. Jornada do Influenciador (autodeclaração + selo)

- [x] 4.1 Salvar o logo do cliente em `public/brand/partners/jornada-do-influenciador.png` (recortado sem margem, fundo transparente)
- [x] 4.2 Criar `src/shared/components/influencer-journey-badge.tsx` no padrão do `cdl-member-badge.tsx` (pill fundo branco fixo, `next/image`, alt "Jornada do Influenciador", tamanhos `sm`/`md`); teste de componente
- [x] 4.3 Criar `InfluencerJourneyNote` (texto com asterisco + link `https://www.jornadadoinfluenciador.com.br`, `target="_blank" rel="noopener noreferrer"`)
- [x] 4.4 Formulário: checkbox controlado + hidden input (mesma técnica do CDL) "Eu fiz a Jornada do Influenciador" com logo e nota, para criador e empresa em `profile-form-fields.client.tsx`
- [x] 4.5 Schemas e ações: `onboarding-form-schema.ts`, `onboarding-draft-schema.ts`, `use-onboarding-autosave.ts`, `onboarding.actions.ts`, `influencer-profile.actions.ts`, `company-profile.actions.ts`
- [x] 4.6 Repositórios de escrita: `drizzle-onboarding-registration`, `drizzle-corrected-profile-resubmission`, `drizzle-influencer-profile`, `drizzle-company-profile`
- [x] 4.7 Moderação: adicionar campo em `src/features/moderation/domain/correctable-fields.ts` (label "Jornada do Influenciador") e garantir destaque no fluxo de correção
- [x] 4.8 Catálogo — leitura: `drizzle-directory.repository.ts` (duas branches), `catalog-directory.types.ts`, `catalog-directory.contract.ts`, `drizzle-catalog-detail` + `catalog-detail.repository` + `catalog-detail.mapper` + `catalog-detail.types` + `catalog-detail-view.schema`, `drizzle-company-detail` + `company-detail.repository` + `company-detail.service` + `company-detail.types`
- [x] 4.9 Catálogo — UI: selo após o CDL em `catalog-creator-card.tsx`, `catalog-company-card.tsx`, `directory-entry-card.tsx`, `catalog-detail-view.tsx`, `company-detail-view.tsx` (+ nota explicativa nas duas views de detalhe)
- [x] 4.10 Perfil próprio: `profile-header-preview.tsx`, `profile-header-media-editor.client.tsx`, `app/(product)/app/profile/profile-editor.client.tsx`
- [x] 4.11 Backoffice: Sim/Não em `account-detail.tsx` e `submission-review.tsx` (+ tipos e repositórios `drizzle-account-detail`, `drizzle-submission-review`)
- [x] 4.12 Checklist final: `grep -rn isCdlMember src` e confirmar que cada ocorrência relevante tem o par `isInfluencerJourneyParticipant`
- [x] 4.13 Testes: componente (cards, detalhe, header), integração (salvar true/false em cadastro e edição, criador e empresa), validação visual do selo em 14/16 px (fallback: emblema + "Jornada" se ilegível)

## 5. Filtros "Associado da CDL" e "Jornada"

- [x] 5.1 `catalog-directory.schema.ts`: `cdl` e `jornada` booleanos opcionais (`"1"|"true"`); tipos `DirectoryFilters`/`DirectoryQuery`
- [x] 5.2 `directory-url-state.ts`: serializar/deserializar `cdl=1` e `jornada=1`; limpar zera cursor
- [x] 5.3 Repositório: predicados `is_cdl_member` e `is_influencer_journey_participant` nas branches de criador e empresa
- [x] 5.4 Diálogo "Filtrar catálogo": seção "Selos" com os dois checkboxes; chips/contagem de filtros ativos
- [x] 5.5 Testes: unitário do schema/URL, integração do repositório (combinação com tipo), componente do diálogo

## 6. Ordem diária embaralhada do catálogo

- [x] 6.1 Função `directoryShuffleSeed(now)` → `YYYY-MM-DD` em America/Sao_Paulo + `CATALOG_SHUFFLE_SALT` (env opcional, default fixo); documentar env em `docs/operations/environment-provisioning.md`; testes unitários (virada de dia no fuso)
- [x] 6.2 Cursor v2 em `catalog-directory-cursor` e `directoryCursorPayloadSchema`: `{ v: 2, seed, sortKey, id, kind }`; cursor v1 rejeitado → primeira página
- [x] 6.3 `drizzle-directory.repository.ts`: projetar `md5(id::text || seed) as "sortKey"` nas duas branches; mover filtro keyset para fora do `union all` (subquery) com `("sortKey", id) > (:sortKey, :id)`; `order by "sortKey", id`; usar seed do cursor quando houver
- [x] 6.4 Remover dependência de `createdAt` no cursor (mantê-lo no DTO se usado pela UI)
- [x] 6.5 Testes de integração: mesma ordem no mesmo seed, ordem diferente com outro seed, paginação completa sem duplicados/omissões, virada de seed no meio da paginação, cursor v1
- [x] 6.6 `EXPLAIN ANALYZE` local com seed de volume (~2k perfis) e registrar no PR (resultado no relatório da entrega; registrar no PR)

## 7. Cards patrocinados na listagem (até 8, embaralhados)

- [x] 7.1 `placement-slot-catalog.ts`: `catalog-midlist.limit` 3 → 8; descrição do slot "Até 8, em ordem aleatória"
- [x] 7.2 `buildCatalogSponsoredCards` (`src/app/_components/catalog-sponsorship-slots.tsx`): remover `slice(0, 3)`, usar o limite do slot, embaralhar com Fisher–Yates + `crypto.randomInt` (função pura testável com RNG injetável)
- [x] 7.3 Confirmar em `directory-results.tsx` que o índice é global sobre páginas acumuladas e que `adIndex % length` produz A,B,C,A,B; teste de componente cobrindo 1, 3 e 8 cards e "Carregar mais"
- [x] 7.4 Atualizar texto/preview do slot no wizard (`placement-slot-picker.tsx`, `placement-live-preview.client.tsx`) se mencionarem 3

## 8. Banner da landing em carrossel

- [x] 8.1 `placement-slot-catalog.ts`: `landing-top.limit` 1 → 5; rótulo do picker "Até 5, em rotação" (ajustar regra `slot.limit === 1 ? "1 por vez" : ...` em `placement-slot-picker.tsx`)
- [x] 8.2 `public-sponsorship-promotion.query.ts`: `loadPublicSponsorshipPromotions` devolve lista filtrada por `isGenericPublicPromotion`; handler (`public-sponsorship-promotion.handler.ts`) responde `[]` quando vazio; rota `src/app/api/public/sponsorships/landing/route.ts`
- [x] 8.3 `public-sponsorship-promotion.api.ts`: normalizar `null | objeto | lista` → lista; teste unitário dos três formatos
- [x] 8.4 Hook compartilhado `src/shared/hooks/use-auto-advance.ts` (intervalo, pausa em hover/foco/`visibilitychange`, `prefers-reduced-motion`, pausa manual); testes com fake timers
- [x] 8.5 `SponsorshipHeroRotator` (client) sobre `SponsorshipHeroBanner`: crossfade 300 ms, 6 s, indicadores acessíveis, botão pausar/retomar, `aria-roledescription="carrossel"`, mídias seguintes `loading="lazy"`; 1 banner → render atual
- [x] 8.6 `PublicSponsorshipPromotion`/`PublicSponsorshipPromotionEnhancement` passam a receber lista; preview ao vivo do wizard continua funcionando para um item
- [x] 8.7 Testes de componente (1, 2, 5 banners; reduced motion; pausa) e atualizar `app/page.component.test.tsx`

## 9. Criadores em destaque em carrossel

- [x] 9.1 `placement-slot-catalog.ts`: `catalog-featured.limit` 1 → 10; rótulo "Até 10"
- [x] 9.2 `catalog-sponsorship-slots.loader.ts`: `featured` vira lista (todas elegíveis com `featuredCreator`); ajustar `CatalogSponsorshipSlotsDto` e testes do loader
- [x] 9.3 `SponsorshipFeaturedCreatorsRow` (client): cards lado a lado (1/2/3/4 por linha por breakpoint), detecção de overflow via `ResizeObserver`, avanço de 5 s com `useAutoAdvance` só quando transborda, indicadores, reduced-motion
- [x] 9.4 `CatalogSponsorshipSlots`: 1 criador → componente atual; ≥2 → row; a condição de "sem slots" passa a considerar a lista
- [x] 9.5 Testes de componente (cabe/transborda, pausa, reduced motion) e do layout do catálogo

## 10. Remoção da edição de perfil pelo backoffice

- [x] 10.1 Remover `src/app/backoffice/(protected)/accounts/[accountId]/edit/` e o link "Editar perfil" em `accounts/[accountId]/page.tsx`
- [x] 10.2 Remover segmento "Editar perfil" em `backoffice-shell.client.tsx`
- [x] 10.3 Remover `admin-profile.actions.ts`, `admin-profile-edit.service.ts`, `server-admin-profile-edit.service.ts`, exports em `src/features/onboarding/server.ts` e testes associados; limpar props exclusivas de modo admin em `ProfileFormFields` (`formLabel` etc.) se ficarem órfãs
- [x] 10.4 Na tela da conta, texto-guia "Para corrigir dados, use Solicitar alterações na moderação." com link para a submissão vigente quando existir
- [x] 10.5 Testes: componente da página da conta sem botão; rota `/edit` retorna 404; `npm run typecheck`/lint sem imports órfãos
- [x] 10.6 Registrar em `docs/` (moderation/backoffice) que correções são só via "Solicitar alterações"

## 11. Verificação final

- [x] 11.1 `npm run lint`, `npm run typecheck`, `npm test`, formatação (prettier) verde
- [x] 11.2 E2E Playwright: cadastro de criador com métricas + Jornada → aprovação → detalhe público mostra métricas e selo; filtros CDL/Jornada; landing com 2 banners rotacionando; catálogo com 3 criadores em destaque e 3 cards patrocinados; backoffice sem edição
- [x] 11.3 Validação visual no browser (desktop, tablet, mobile; claro/escuro) dos selos, carrosséis e filtros, com screenshots para o PR
- [x] 11.4 Atualizar `docs/design` com padrões novos (rotator, row de destaque, selo Jornada)
- [ ] 11.5 Aplicar migration em produção antes do deploy; smoke pós-deploy (plano de migração do design.md)

## 12. Exclusão de conta definitiva e imediata (revisa `add-self-service-account-deletion`)

- [ ] 12.1 Fechar a task pendente e arquivar `add-self-service-account-deletion` (sincroniza specs); ao arquivar esta change, converter `account-immediate-deletion` em deltas MODIFIED/REMOVED sobre `account-self-deletion` e `account-data-elimination`
- [ ] 12.2 Levantar em produção (read-only) contas com `deletion_state in ('REQUESTED','FAILED')` e confirmar com o cliente a eliminação imediata delas
- [x] 12.3 Migration: `accounts.auth_user_id` nullable + constraint `auth_user_id is not null or deletion_state = 'ELIMINATED'`; espelhar no Drizzle (`src/db/schema/accounts.ts`) e checar tipos que assumem não-nulo
- [x] 12.4 Migration: relaxar `sponsorship_placements_featured_creator_check` para aceitar nulo quando `status = 'ARCHIVED'`
- [x] 12.5 Migration: `app_delete_own_account()` (security definer, só a conta de `auth.uid()`, nega banidas/ADMIN): matriz de disposição, arquivamento de patrocínios (anunciante e destaque, zerando o destaque), tombstone com `auth_user_id = null`, retorno dos caminhos de Storage; grant ao papel da aplicação; auditada
- [x] 12.6 Migration: drop de `app_admin_recover_account` e de `app_request_account_deletion`; ajustar `app_eliminate_account_data` (sem checagem de janela) ou removê-la se a repescagem não precisar
- [x] 12.7 Migration: tabela `storage_cleanup_queue` (bucket, path, tentativas, último erro; sem PII) com RLS fechada
- [x] 12.8 Outbox: marca `retain_until_sent` no e-mail de confirmação; o processador anonimiza recipient/payload após envio ou falha definitiva; testes
- [ ] 12.9 Migration de dados: eliminar contas `REQUESTED`/`FAILED` existentes pelo novo caminho (após 12.2) e remover ban no Auth via script de operação
- [x] 12.10 Backend: `request-account-deletion.action.ts` + `account-deletion.service.ts` chamam `app_delete_own_account`, removem Storage (fila em caso de falha), encerram sessões (global sign-out) e redirecionam para `/conta-excluida`
- [x] 12.11 Gateway `supabase-account-deletion-identity.gateway.ts`: remover ban/soft delete; manter só encerramento de sessões (+ desbanir no script de 12.9)
- [x] 12.12 Cron `/api/cron/account-elimination` vira repescagem: processa `storage_cleanup_queue` e contas `FAILED`; mantém alerta; atualizar testes do handler/serviço
- [x] 12.13 Remover `RECOVERY_WINDOW_DAYS`, `isRecoverable`, `recover-account.action.ts`, `recover-account-panel.client.tsx`, painel na página de conta do backoffice; filtro "Exclusão solicitada" → "Excluída" (só leitura)
- [x] 12.14 Copy: seção "Excluir conta" e diálogo ("a exclusão é imediata e não pode ser desfeita; se quiser voltar, é só se cadastrar de novo"), página `/conta-excluida`, templates de e-mail (migration de templates se ficam no banco)
- [x] 12.15 Verificar resolvers de identidade (`registration-identity.repository`, `drizzle-role-selection.repository`, `verified-account-transaction`) e o proxy de rotas com usuário sem conta após exclusão → seleção de papel
- [x] 12.16 Testes de integração: excluir → dados removidos/anonimizados conforme matriz → login de novo com mesmo `auth_user_id` → cadastro mesmo papel e papel diferente → aprovação; criador em destaque excluindo; admin com perfil vinculado exclui só o perfil; banida não exclui
- [x] 12.17 E2E Playwright: excluir conta e refazer cadastro com o mesmo login local
- [x] 12.18 Docs: reescrever `docs/operations/account-deletion.md` (ciclo imediato, matriz, repescagem), `data-subject-requests.md`, `launch-blockers.md`; conferir a Política v1.0 sobre recuperação
