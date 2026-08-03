# Relatorio de aderencia ao roadmap do Beta

Data da analise: 2026-08-02

Fontes analisadas:

- Roadmap original em `/Users/willianalexbettoni/Downloads/Contente Creators Beta - Roadmap.docx`
- `PRD - desenvolvimento.md`
- `openspec/changes/mvp-contente-creators/tasks.md`
- `openspec/changes/mvp-contente-creators/design.md`
- `openspec/changes/mvp-contente-creators/requirements-traceability.md`
- `docs/launch-blockers.md`
- arvore de rotas, features, migrations, testes e workflows do repositorio

## Conclusao executiva

O projeto atende substancialmente ao roadmap do DOCX e, em varios pontos, supera o escopo tecnico original com controles de seguranca, auditoria, RLS, storage privado, estados de ciclo de vida, outbox de e-mail, testes e operacao documentada.

Pelo checklist tecnico autoritativo do OpenSpec, ha 246 de 253 entregas concluidas, ou 97,2%. As 7 pendencias restantes nao sao features centrais do produto no codigo local; elas estao concentradas em provisionamento de ambientes do cliente, insumos finais, UAT, dry run de producao e validacoes externas.

O Beta ainda nao deve ser considerado pronto para lancamento publico ate fechar os bloqueadores de ambiente, juridico, marca, SMTP, dominio, admins iniciais e aceite.

## Aderencia por etapa do DOCX

| Etapa do DOCX                                                               | Status                                             | Evidencia no projeto                                                                                                                                        | Observacao                                                                                                              |
| --------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1. Estrutura base: banco, autenticacao, estrutura do projeto                | Atendida                                           | `package.json`, `src/app`, `src/features`, `src/db`, `supabase/migrations`, `.github/workflows`                                                             | Stack Next 16, Supabase, Drizzle, Tailwind, shadcn, Axios, TanStack Query, Zustand e testes estao estruturados.         |
| 2. Landing page + formularios de cadastro                                   | Atendida com decisao de privacidade                | `src/app/page.tsx`, `src/features/marketing`, `src/app/(auth)/sign-up/page.tsx`, `src/features/onboarding/components/combined-registration-form.client.tsx` | O cadastro combinado para criador/empresa existe. A prova social publica do DOCX foi restringida por decisao posterior. |
| 3. Painel admin: fila de aprovacao + gestao de cadastros                    | Atendida                                           | `src/app/backoffice/(protected)`, `src/features/backoffice`, `src/features/moderation`                                                                      | Inclui fila, detalhe, acoes de aprovacao/correcao/suspensao/banimento/arquivo e gestao de contas.                       |
| 4. Area logada: catalogo com filtros + perfil individual + completar perfil | Atendida                                           | `src/app/(product)/app/catalog/page.tsx`, `src/app/(product)/app/profile/page.tsx`, `src/features/catalog`, `src/features/onboarding`                       | Catalogo privado por papel/status, filtros, busca, detalhe, contato com consentimento, edicao de perfil e completude.   |
| 5. Destaques/patrocinios: slots no front + gestao no admin                  | Atendida                                           | `src/features/sponsorships`, `src/app/api/backoffice/sponsorships`, `src/app/_components/catalog-sponsorship-slots.tsx`                                     | Implementado como placements manuais/agendados, sem pagamentos ou precificacao.                                         |
| 6. Metricas no admin + ajustes finais + testes                              | Parcial para lancamento; codigo principal atendido | `src/features/backoffice/server/analytics`, `e2e`, `docs/quality`, `.github/workflows`                                                                      | Dashboard e testes existem. Faltam UAT, dry run de producao e insumos finais externos.                                  |

## Diferencas importantes entre DOCX e escopo consolidado

Estas diferencas nao devem ser tratadas automaticamente como faltas, porque o OpenSpec/PRD consolidado documenta a decisao:

- Login com Instagram: o DOCX pedia Google e Instagram, mas o escopo consolidado removeu Instagram Auth. O projeto suporta e-mail/senha e Google; Instagram aparece apenas como rede social de perfil.
- Avaliacao inicial de 5 estrelas: removida porque avaliacoes/reputacao ficaram fora do Beta.
- Prova social publica com logos/perfis: o DOCX sugeria contadores, logos e criadores em destaque na landing. O projeto manteve `publicSocialProofEnabled=false` e permite apenas contadores agregados/promocoes genericas sem identidade de participantes.
- Status `recusado`: foi normalizado para `CHANGES_REQUESTED` quando ha correcao possivel e `BANNED` quando ha bloqueio terminal.
- Aprovacao em lote: o DOCX cita como ponto de atencao futuro. O MVP explicitamente verifica que nao ha controle ou endpoint de aprovacao/banimento em massa.

## Pendencias reais do checklist tecnico

Pendencias abertas em `openspec/changes/mvp-contente-creators/tasks.md`:

- `25.5`: provisionar/documentar Supabase e Vercel do cliente com nomes exatos `contente-creators-dev` e `contente-creators-prd`.
- `25.6`: configurar variaveis, URLs, Auth redirects, Google OAuth, Storage, SMTP e segredos agendados isolados em desenvolvimento.
- `25.7`: configurar recursos equivalentes e isolados em producao, sem copiar dados ou segredos de desenvolvimento.
- `27.7`: obter e registrar ativos finais de marca, copy, nichos/faixas, admins, criativos, dominio, documentos legais, suporte, consentimento e retencao.
- `27.8`: verificar tela de consentimento Google, callback/dominio de producao, identidade SMTP, SPF/DKIM/DMARC, limites e entregabilidade.
- `27.9`: executar UAT em desenvolvimento para os dois papeis e backoffice, registrar defeitos e fechar bloqueadores.
- `27.10`: executar dry run de producao, deploy/migracao aprovados, smoke sintetico, inspecao de privacidade/logs e monitoramento.

## Bloqueadores praticos para lancamento

O arquivo `docs/launch-blockers.md` detalha entradas do cliente que ainda bloqueiam release:

- dominio final de producao;
- contas isoladas e de propriedade do cliente para Supabase, Vercel, Google OAuth, SMTP, DNS e deploy;
- contato publico de suporte/privacidade;
- Termos de Uso, Politica de Privacidade e textos de consentimento aprovados;
- procedimento LGPD de exportacao, correcao, exclusao/anonimizacao e retencao;
- identidade SMTP da Marques Branding, SPF, DKIM, DMARC, limites e entregabilidade;
- e-mails dos administradores iniciais;
- listas finais de nichos e faixas de funcionarios;
- favicon/marca quadrada final aprovada.

## Validacoes executadas nesta analise

Comandos que passaram:

- `npx -y npm@11.4.2 run format:check`
- `npx -y npm@11.4.2 run lint`
- `npx -y npm@11.4.2 run type-check`
- `npx -y npm@11.4.2 run test:unit` - 154 arquivos, 829 testes
- `npx -y npm@11.4.2 audit --omit=dev --audit-level=high`
- `npx -y npm@11.4.2 audit --audit-level=critical`
- `npm run build` com variaveis placeholder equivalentes ao CI

Ressalvas:

- `npm run test:component` falhou em execucao completa com 2 timeouts no arquivo `src/features/onboarding/components/combined-registration-form.component.test.tsx`.
- O mesmo arquivo passou isoladamente, inclusive com o timeout padrao. Isso sugere fragilidade/flakiness ou pressao de concorrencia na suite, nao uma lacuna funcional confirmada.
- O primeiro build sem variaveis falhou corretamente por ausencia de `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SUPABASE_URL`; com envs de CI, o build passou.
- `npm ci` reportou vulnerabilidades altas em dependencias de desenvolvimento/tooling da Vercel. Os gates configurados (`audit --omit=dev --audit-level=high` e `audit --audit-level=critical`) passaram, mas vale acompanhar upgrade da dependencia `vercel`.

## Veredito

Considerando o roadmap do DOCX como referencia inicial, o produto esta implementado para o Beta funcional: cadastro, moderacao manual, catalogo privado, perfil, patrocinio, dashboard admin, e-mails, seguranca e testes.

Considerando o OpenSpec/PRD como fonte atual de verdade, ainda faltam 7 entregas antes de declarar o MVP pronto para lancamento. Elas dependem majoritariamente de ambientes reais, insumos do cliente e execucao de aceite/producao, nao de novas features centrais.

Proxima prioridade recomendada:

1. Fechar os insumos de cliente listados em `docs/launch-blockers.md`.
2. Provisionar DEV/PRD isolados e validar Google OAuth/SMTP/DNS.
3. Executar UAT em desenvolvimento.
4. Corrigir qualquer defeito de UAT.
5. Fazer dry run de producao, smoke e monitoramento.
6. Endurecer a suite de componentes para eliminar os timeouts intermitentes.
