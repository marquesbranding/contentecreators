# PRD — Desenvolvimento do MVP Contente Creators

**Status:** em desenvolvimento
**Data-base do acompanhamento:** 24/07/2026
**OpenSpec relacionado:** `mvp-contente-creators`
**Progresso atual:** 135 de 252 entregas concluídas (53,6%); 117 entregas pendentes.

## 1. Objetivo do produto

O Contente Creators é uma plataforma B2C de dois lados que conecta criadores de conteúdo a empresas interessadas em encontrá-los. O MVP reúne, no mesmo projeto Next.js, a landing page pública, a aplicação autenticada e o backoffice administrativo.

O produto deve permitir que:

- visitantes criem uma conta como influenciador ou empresa usando e-mail e senha ou Google;
- o cadastro por e-mail reúna credenciais, papel e perfil em um único envio;
- novos usuários do Google escolham o papel em um modal bloqueante e completem o perfil correspondente;
- perfis enviados passem por análise manual antes de acessar qualquer dado do catálogo;
- administradores analisem, aprovem, solicitem correções, suspendam, restaurem, banam, desbanam excepcionalmente e arquivem contas;
- usuários aprovados encontrem perfis elegíveis em um catálogo privado, respeitando papel, consentimento e privacidade;
- alterações relevantes sejam registradas em histórico de auditoria somente de acréscimo;
- a solução opere localmente e em ambientes isolados de desenvolvimento e produção.

## 2. Como usar este documento

- `[x]` significa que a entrega foi implementada e está marcada como concluída no checklist técnico do OpenSpec.
- `[ ]` significa que a entrega ainda é necessária para concluir o MVP.
- Cada identificador, como `8.4`, corresponde à mesma tarefa em `openspec/changes/mvp-contente-creators/tasks.md`.
- Uma história só está concluída quando todos os seus critérios estiverem marcados.
- O prompt aprovado prevalece sobre o DOCX. O OpenSpec consolidado é a fonte técnica de verdade; este PRD é sua visão operacional em histórias de usuário.
- Ao concluir uma entrega, este documento e o checklist do OpenSpec devem ser atualizados juntos.

## 3. Regras de produto consolidadas

### Papéis

- `ADMIN`: administrador provisionado fora do cadastro público e autorizado a usar o backoffice.
- `INFLUENCER`: usuário público com perfil de criador; escolhe exatamente um tipo de atuação, `INFLUENCER` ou `UGC`.
- `COMPANY`: usuário público com perfil empresarial.
- No MVP, uma conta pública possui apenas um papel e não pode trocá-lo por conta própria.

### Estados da conta

- `ONBOARDING`: cadastro ainda não enviado para análise.
- `PENDING_REVIEW`: cadastro enviado e aguardando análise.
- `CHANGES_REQUESTED`: administrador solicitou ajustes; o usuário pode corrigir e reenviar.
- `APPROVED`: conta aprovada e autorizada a usar o catálogo correspondente ao seu papel.
- `SUSPENDED`: acesso de produto temporariamente interrompido, com possibilidade de restauração.
- `BANNED`: identidade conhecida bloqueada; não pode entrar, editar, reenviar ou recriar a conta com a mesma identidade conhecida.

### Regras de visibilidade

- A landing page não exibe perfis, nomes ou logos de participantes neste primeiro momento.
- Contas não aprovadas podem entrar na aplicação, mas não recebem nenhum dado de listagem ou detalhe do catálogo.
- `PENDING_REVIEW` vê a mensagem “Seu cadastro está sendo analisado”.
- `CHANGES_REQUESTED` pode editar o cadastro e reenviá-lo.
- Usuários aprovados podem editar o próprio perfil sem perder automaticamente a aprovação; toda alteração aceita deve ser validada e auditada.
- O catálogo, mídias e contatos são privados e devem ser entregues apenas por DTOs mínimos e autorizados.

### Diretrizes técnicas obrigatórias

- Next.js App Router, React, TypeScript, Tailwind CSS 4 e uso amplo de componentes próprios baseados em shadcn/ui.
- Supabase para Auth, Postgres e Storage; Drizzle ORM para acesso tipado; migrações SQL do Supabase como fonte do esquema.
- Axios e TanStack Query para requisições e estado remoto interativo.
- Zustand apenas para estado global efêmero de interface; nunca como autoridade de sessão, papel, status, formulário ou dados remotos.
- Arquitetura por slices verticais, com componentes, hooks, domínio, schemas, tipos, APIs e camadas server-side somente quando necessários.
- Código, identificadores e objetos técnicos em inglês; textos visíveis ao usuário em português do Brasil.
- Mobile first, responsivo desde 320 px, acessível e desenvolvido com TDD.
- SMTP da Marques Branding para e-mails transacionais nos ambientes hospedados.
- Ambientes hospedados exatamente `contente-creators-dev` e `contente-creators-prd`.

## 4. Histórias de usuário e plano completo do MVP

### HU-01 — Fundação sustentável do projeto

> Como equipe de engenharia, quero uma fundação moderna, tipada e organizada por slices para evoluir o MVP sem misturar responsabilidades ou expor código de servidor ao navegador.

- [x] `1.1` Ler e registrar os guias instalados do Next.js 16 sobre estrutura, Proxy, autenticação, segurança de dados, Server Actions, Route Handlers, cache e deploy.
- [x] `1.2` Fixar versões suportadas de Node.js/npm e adicionar metadados de engine, incluindo `.nvmrc` ou equivalente.
- [x] `1.3` Criar scripts para format, lint, type-check, testes unitários, componentes, integração, E2E, acessibilidade, build, banco e gate completo de CI.
- [x] `1.4` Instalar e travar as dependências de Supabase, Drizzle, `postgres-js`, validação/formulários, Axios, TanStack Query, Zustand, SMTP e testes.
- [x] `1.5` Inicializar shadcn/ui para Tailwind CSS 4 e adicionar os primeiros primitives necessários.
- [x] `1.6` Criar os limites de slices verticais, shared kernel, rotas, composição, banco e testes, com APIs públicas separadas para browser e servidor.
- [x] `1.7` Criar schemas tipados de variáveis públicas e server-side, com falhas seguras e diagnósticos sem segredos.
- [x] `1.8` Adicionar `.env.example` e documentação de configuração local, desenvolvimento e produção sem segredos reais.
- [x] `1.9` Centralizar textos e formatação `pt-BR` e testar CNPJ, telefone, data, número e porcentagem.
- [x] `1.10` Configurar metadata/layout raiz com idioma `pt-BR`, fontes, padrões seguros e `noindex` em rotas protegidas.
- [x] `1.11` Aplicar regras automáticas de dependência entre app, slices, shared e banco, bloqueando imports profundos ou server-side no cliente.
- [x] `1.12` Criar cliente Axios same-origin tipado, com timeout, cookies, correlação, cancelamento e erros seguros normalizados.
- [x] `1.13` Configurar TanStack Query com clientes isolados no servidor, cliente estável no browser, retries limitados, chaves por feature e hidratação direcionada.
- [x] `1.14` Criar store Zustand global por factory, composto apenas por pequenos estados de UI e isolado entre requisições SSR.
- [x] `1.15` Documentar e impor a matriz de propriedade de estado e um único transporte de comando por caso de uso.
- [x] `1.16` Implementar um slice de referência com nomes baseados em comportamento e somente as pastas realmente necessárias.
- [x] `1.17` Documentar contrato, dependências, nomenclatura, fronteiras client/server e checklist de revisão em `docs/architecture/slices.md`.

### HU-02 — Qualidade test-first

> Como equipe de produto e engenharia, quero uma esteira de testes em camadas para que cada comportamento do MVP seja construído com TDD e permaneça verificável.

- [x] `2.1` Configurar Vitest com projetos separados para testes unitários, de componentes e integração local, além de cobertura.
- [x] `2.2` Configurar React Testing Library, user-event, matchers DOM, cleanup e mocks determinísticos de APIs do browser.
- [x] `2.3` Configurar Playwright para Chromium desktop/mobile e WebKit crítico, com traces, screenshots e usuários sintéticos isolados.
- [x] `2.4` Criar helpers axe para componentes/E2E e reprovar violações sérias ou críticas.
- [x] `2.5` Criar builders sintéticos para identidades, contas, perfis, patrocínios, moderação, consentimentos e auditoria.
- [x] `2.6` Adicionar checklist de PR que exija cenário inicialmente falhando, negativas de autorização e evidência de refatoração com testes verdes.
- [x] `2.7` Definir metas de cobertura e exigir explicitamente os ramos críticos de permissão e máquina de estados.
- [x] `2.8` Criar smoke test provando que a base do projeto compila sob a nova estrutura de qualidade.
- [x] `2.9` Padronizar testes co-localizados e utilitários isolados para hooks, queries, stores, rotas, hidratação e prevenção de vazamento de cache.

### HU-03 — Ambiente Supabase local reproduzível

> Como pessoa desenvolvedora, quero executar Auth, Postgres, Storage e e-mails localmente para testar o sistema completo sem precisar de uma conta hospedada ou da Vercel.

- [x] `3.1` Adicionar Supabase CLI com versão fixada e `supabase/config.toml` versionado.
- [x] `3.2` Configurar URLs locais, callbacks, confirmação de e-mail, recuperação de senha, placeholders do Google, limites de Storage e captura de e-mails de Auth.
- [x] `3.3` Configurar capturador SMTP local da aplicação separado do capturador de e-mails do Supabase Auth e documentar ambos.
- [x] `3.4` Criar comandos determinísticos de start, stop, status e reset que nunca apontem implicitamente para projeto hospedado.
- [x] `3.5` Criar seeds sintéticos para admin, influencer, UGC, empresa, todos os status, nichos, placements e auditoria.
- [x] `3.6` Testar reset limpo, aplicação de migrações/seeds e saúde de Auth, Postgres, Storage e capturadores de e-mail.
- [x] `3.7` Documentar pré-requisitos, primeiro start, rotina diária, riscos do reset e callback local do Google OAuth.

### HU-04 — Modelo de dados completo e preparado para escala

> Como plataforma, quero um modelo de dados normalizado e tipado para representar contas, perfis, moderação, mídia, consentimento, patrocínio, e-mail e auditoria com integridade.

- [x] `4.1` Testar extensões, enums, tabelas, chaves, unicidade, índices e colunas de versão/arquivamento.
- [x] `4.2` Criar migração inicial com UUID, `unaccent`, busca trigram e funções auxiliares seguras.
- [x] `4.3` Criar enums de papel, status, tipo de criador, plataforma, mídia, placement, outbox e auditoria.
- [x] `4.4` Criar `accounts` ligado ao Auth, com papel, status, e-mail operacional, datas, completude, versão e arquivamento lógico.
- [x] `4.5` Criar `creator_profiles`, `company_profiles` e restrições coerentes com o papel.
- [x] `4.6` Criar `company_locations`, garantir uma localização principal e armazenar cidade/UF do criador.
- [x] `4.7` Criar nichos, vínculos de nicho, perfis sociais e snapshots datados de métricas autodeclaradas.
- [x] `4.8` Criar `media_assets` com proprietário, caminho, tipo, metadados, status, linhagem de substituição e arquivamento.
- [x] `4.9` Criar casos/eventos imutáveis de moderação, sequências, versões e índices de fila.
- [x] `4.10` Criar placements de patrocínio com audiência, posição, criativo, link, agenda, estado, ordem e referência de anunciante.
- [x] `4.11` Criar outbox e tentativas de e-mail com idempotência, agenda, locks, tentativas e falhas redigidas.
- [x] `4.12` Criar documentos legais, consentimentos de conta e consentimento de visibilidade de contato.
- [x] `4.13` Criar identidades bloqueadas com chaves normalizadas e metadados auditados de bloqueio/desbloqueio.
- [x] `4.14` Criar revisões de auditoria com sequência, entidade, ator, fonte, request, motivo, campos alterados e snapshots JSON.
- [x] `4.15` Adicionar índices finais de catálogo, busca, moderação, placements, outbox e auditoria e provar planos de consulta com volume representativo.
- [x] `4.16` Espelhar o banco em schemas/relations/types modulares do Drizzle e testar divergência de esquema.
- [x] `4.17` Impor migrações Supabase como fonte de verdade e proibir `drizzle-kit push` em bancos compartilhados ou de produção.

### HU-05 — Auditoria no estilo Envers

> Como responsável por operação e conformidade, quero um histórico imutável das mudanças relevantes para saber o que mudou, quem executou, quando, por qual origem e por qual motivo.

- [x] `5.1` Testar redação de chaves sensíveis, cálculo de campos alterados, mapeamento de ator/origem e DTO seguro.
- [x] `5.2` Testar revisões de inserção, atualização e arquivamento lógico em todos os agregados auditados.
- [x] `5.3` Implementar funções de redação e triggers genéricos com snapshots anterior/posterior e revisões monotônicas.
- [x] `5.4` Anexar auditoria a contas, perfis, locais, redes/métricas, mídia, moderação, patrocínio, consentimento, admins, bloqueios e retries.
- [x] `5.5` Implementar wrapper de escrita Drizzle server-only que define ator verificado, papel, origem, request ID e motivo dentro da transação.
- [x] `5.6` Provar que conexões reutilizadas não vazam contexto de auditoria ou JWT entre transações.
- [x] `5.7` Impedir atualização/exclusão do histórico por usuários normais e administradores.
- [x] `5.8` Emitir telemetria estruturada para gravações inesperadas `SYSTEM_UNKNOWN` sem dados pessoais.

### HU-06 — Autorização em profundidade e DAL seguro

> Como titular dos dados, quero que cada leitura e escrita seja autorizada no servidor e no banco para impedir acesso cruzado, vazamento de dados privados ou confiança indevida na interface.

- [x] `6.1` Escrever matriz RLS por tabela para anônimo, proprietário, influencer aprovado, empresa aprovada, admin, suspenso e banido.
- [x] `6.2` Criar testes de integração para acesso do proprietário, negação cruzada, catálogo aprovado, contatos, admin e todos os status não aprovados.
- [x] `6.3` Habilitar RLS/default-deny e políticas de privilégio mínimo em todas as tabelas expostas.
- [x] `6.4` Implementar wrapper que converte token Supabase verificado em claims locais de transação e limpa o contexto no Supavisor.
- [x] `6.5` Configurar `postgres-js` com `prepare: false`, transações curtas e proteção server-only.
- [x] `6.6` Criar resolvers DAL de sessão/conta e convenções de DTO mínimo, com deduplicação por request quando segura.
- [x] `6.7` Criar guards reutilizáveis para autenticação, propriedade, aprovação, papel, admin e status permitido.
- [x] `6.8` Provar que linhas brutas, segredos e campos privados não atravessam os DTOs de Server Components ou Actions.

### HU-07 — Upload e entrega privada de mídias

> Como usuário ou administrador autorizado, quero enviar e substituir imagens com segurança, progresso e feedback acessível, mantendo os arquivos privados e o histórico preservado.

- [x] `7.1` Testar políticas de Storage para anônimo, proprietário, acesso cruzado, catálogo aprovado, upload de patrocínio por admin, suspenso e banido.
- [x] `7.2` Criar buckets privados `profile-media` e `sponsorship-media` com políticas por caminho.
- [x] `7.3` Validar JPEG/PNG/WebP, MIME real/declarado, extensão e limites de 5 MB para avatar/logo e 8 MB para capa/patrocínio.
- [x] `7.4` Criar preparação/finalização de upload por proprietário, registrando mídia somente após autorização e validação.
- [x] `7.5` Substituir mídia por novo objeto e arquivar o anterior, preservando o significado do histórico.
- [x] `7.6` Gerar DTOs de mídia com URLs assinadas curtas, sem listagem de bucket ou URL pública permanente.
- [x] `7.7` Criar hook de upload e componentes acessíveis de recorte, preview, progresso, erro e retry para todas as mídias.
- [x] `7.8` Criar relatório dry-run para limpeza de objetos órfãos/arquivados, com regras de retenção.

### HU-08 — Cadastro, autenticação e sessão

> Como visitante, quero criar minha conta ou entrar por e-mail/senha ou Google, confirmar meu e-mail, recuperar minha senha e sair com segurança.

- [x] `8.1` Testar cadastro, confirmação, erros sem enumeração, logout, recuperação, callback e retorno de intenção do Google.
- [x] `8.2` Implementar clientes Supabase SSR/browser com cookies corretos e sem vazar service role.
- [x] `8.3` Implementar `src/proxy.ts` do Next.js 16 para refresh de cookies e redirects baratos de rotas protegidas.
- [x] `8.4` Implementar cadastro combinado de credenciais, papel e perfil específico, com validação compartilhada e estados acessíveis em `pt-BR`.
- [x] `8.5` Implementar início/callback do Google OAuth com destinos de retorno permitidos e configuração local/dev/prd.
- [x] `8.6` Implementar tela de confirmação pendente, reenvio e bloqueio de submissão antes da confirmação.
- [x] `8.7` Implementar páginas de esqueci/redefinir senha e tratamento de token único, inválido ou expirado.
- [x] `8.8` Implementar logout seguro e remover dados protegidos após encerrar a sessão.
- [x] `8.9` Criar `/backoffice/login` e admitir somente contas `ADMIN`.
- [x] `8.10` Criar bootstrap idempotente do primeiro admin e provisionamento auditado de admins posteriores.

### HU-09 — Escolha de papel e bloqueio de identidades banidas

> Como novo usuário do Google, quero escolher uma única modalidade antes de preencher meu perfil; como plataforma, quero impedir que identidades conhecidas como banidas recriem acesso.

- [x] `9.1` Testar escolha única de `INFLUENCER`/`COMPANY`, rejeição de `ADMIN`, imutabilidade e preservação segura da intenção da landing.
- [x] `9.2` Exibir modal acessível e bloqueante de papel para usuário Google sem papel definido.
- [x] `9.3` Implementar escolha atômica de papel e decisão de rota por papel/status.
- [x] `9.4` Criar hook de banco/Auth ou defesa suportada antes da criação para identidades conhecidas bloqueadas, incluindo e-mail e Google.
- [x] `9.5` Criar defesa pós-login, revogação/ban administrativo de sessão e experiência de conta bloqueada em `pt-BR`.
- [x] `9.6` Testar e documentar que outra identidade desconhecida permanece fora do antifraude automatizado do MVP.

### HU-10 — Onboarding compartilhado, rascunho e consentimento

> Como usuário em cadastro, quero preencher um formulário mobile first com validação clara, salvar meu progresso e consentir explicitamente com os documentos vigentes antes do envio.

- [x] `10.1` Testar regras compartilhadas de e-mail, WhatsApp, URL, textos, enums, números e consentimento, com mensagens seguras em `pt-BR`.
- [x] `10.2` Implementar salvar/carregar rascunho do proprietário com versão otimista e conflito entre abas.
- [x] `10.3` Criar seeds/fixtures legais e controles inicialmente desmarcados para Termos, Privacidade e visibilidade de contato.
- [x] `10.4` Persistir versão, hash e timestamp dos consentimentos na transação de submissão.
- [x] `10.5` Criar decisão de rota/experiência para onboarding, análise, correção, suspensão, banimento e aprovação sem ler o catálogo antes da hora.
- [x] `10.6` Criar shell de formulário mobile first com progresso, resumo de erros, autosave, proteção de saída e confirmação de envio.

### HU-11 — Cadastro e perfil de influencer/UGC

> Como criador de conteúdo, quero cadastrar meus dados, tipo de atuação, localização, nichos, redes, métricas e mídia para enviar um perfil completo à análise e mantê-lo atualizado após aprovação.

- [x] `11.1` Testar campos obrigatórios de análise e escolha exclusiva de tipo `INFLUENCER | UGC`.
- [x] `11.2` Definir e semear taxonomia inicial de nichos e plataformas sociais, mantendo pendências de validação do cliente visíveis.
- [x] `11.3` Implementar schema/actions para nome, WhatsApp, tipo, cidade/UF, nichos, bio e perfis sociais.
- [x] `11.4` Implementar snapshots datados de seguidores/engajamento autodeclarados e seus rótulos.
- [x] `11.5` Integrar upload e substituição de avatar/capa ao formulário.
- [x] `11.6` Construir etapas responsivas com loading, validação, salvar, restaurar, vazio e falha.
- [x] `11.7` Criar leitura/edição do perfil aprovado, com publicação imediata auditada e sem reset de status.
- [x] `11.8` Testar mobile estreito, teclado, rascunho desatualizado, métricas inválidas, normalização de URLs e auditoria de edição aprovada.

### HU-12 — Cadastro de empresa e assistência por CNPJ

> Como empresa, quero informar meu CNPJ e receber sugestões editáveis da BrasilAPI, sem depender dela para concluir manualmente o cadastro ou ser aprovada.

- [x] `12.1` Testar normalização e dígitos verificadores do CNPJ.
- [x] `12.2` Criar adapter server-side da BrasilAPI com timeout, retry limitado, erros tipados, resposta mínima e acesso compatível com Google/pré-cadastro.
- [x] `12.3` Aplicar rate limit por conta ou rede anonimizada e cache limitado de respostas bem-sucedidas.
- [x] `12.4` Testar contrato da BrasilAPI para sucesso, não encontrado, resposta inválida, timeout, limite e indisponibilidade.
- [x] `12.5` Implementar `/api/company-registry/cnpj/[cnpj]` com checksum, autorização/exceção controlada, mapeamento seguro e logs sem CNPJ.
- [x] `12.6` Implementar schema/actions para razão social, nome fantasia, CNPJ, faixa de funcionários, segmento, WhatsApp, descrição, site/redes e versão otimista.
- [x] `12.7` Implementar múltiplos endereços com exatamente um principal e sugestões editáveis da BrasilAPI.
- [x] `12.8` Integrar upload e substituição de logo/capa.
- [x] `12.9` Criar hook CNPJ com Axios/TanStack Query e estados acessíveis de carregando, sucesso, não encontrado, indisponível, timeout e entrada manual.
- [x] `12.10` Construir onboarding/edição responsivos e testar conclusão manual quando a BrasilAPI estiver offline.

### HU-13 — Indicador determinístico de completude

> Como usuário, quero saber quanto do meu perfil está completo e o que falta; como administrador, quero usar exatamente a mesma regra nas análises e métricas.

- [x] `13.1` Definir pesos versionados para campos obrigatórios e opcionais de criador/UGC e empresa.
- [x] `13.2` Testar combinações vazias, parciais, completas, invalidadas, de mídia, local, rede e métrica.
- [x] `13.3` Implementar calculadora pura que retorne porcentagem e chaves dos campos faltantes.
- [x] `13.4` Recalcular/persistir completude após mudanças relevantes sem tratá-la como aprovação.
- [x] `13.5` Exibir indicador e checklist de completude ao proprietário em `pt-BR`.
- [x] `13.6` Provar que detalhe da conta e dashboard usam a mesma versão da calculadora.

### HU-14 — Moderação e ciclo de vida da conta

> Como administrador, quero decidir o ciclo de vida de cada cadastro com motivos, confirmação e histórico; como usuário, quero corrigir e reenviar quando solicitado e receber uma experiência adequada ao meu status.

- [x] `14.1` Testar todas as transições permitidas/proibidas, motivos, papéis, versões obsoletas e terminalidade do banimento.
- [x] `14.2` Implementar policy pura de moderação e comandos/resultados tipados.
- [x] `14.3` Reforçar transições, motivos e atores por constraints/funções no banco.
- [x] `14.4` Implementar primeira submissão atômica com validação, consentimento, caso/evento, `PENDING_REVIEW`, auditoria e intenção de e-mail.
- [x] `14.5` Permitir edição/reenvio em `CHANGES_REQUESTED`, incrementando a sequência e preservando o histórico.
- [x] `14.6` Adicionar idempotência e proteção de versão obsoleta aos comandos de usuário/admin.
- [ ] `14.7` Implementar transações de aprovação, correção, suspensão, restauração, banimento, desbanimento excepcional e arquivamento.
- [ ] `14.8` Implementar bloqueio/desbloqueio de identidade e efeitos sobre Auth/sessão com tratamento operacional retryable.
- [ ] `14.9` Testar que cada transição cria atomicamente evento, revisão, outbox, invalidação de cache e visibilidade correta.
- [ ] `14.10` Construir telas para análise pendente, alterações solicitadas, suspensão e banimento.

### HU-15 — E-mails transacionais pela Marques Branding

> Como usuário, quero receber comunicações claras sobre cadastro e moderação; como operação, quero que falhas de SMTP sejam retryable sem desfazer decisões válidas.

- [ ] `15.1` Definir contratos e testes `pt-BR` para recebimento, correção, aprovação, suspensão, restauração, banimento e convite/provisionamento de admin.
- [ ] `15.2` Criar templates responsivos de marca com URLs absolutas seguras e mínimo de dados pessoais.
- [ ] `15.3` Implementar adapter SMTP da Marques Branding com TLS, autenticação, timeout, falhas redigidas e transporte local injetável.
- [ ] `15.4` Implementar claim, lock, envio, sucesso, falha e retry da outbox com backoff limitado e testes de concorrência.
- [ ] `15.5` Tentar envio logo após o commit sem reverter o evento de negócio em caso de falha.
- [ ] `15.6` Criar Route Handler assinado para processamento agendado e rejeitar assinatura ausente/inválida.
- [ ] `15.7` Criar retry manual exclusivo de admin, auditado e protegido contra duplicidade.
- [ ] `15.8` Testar capturadores locais de e-mail de Auth e aplicação nas jornadas completas.
- [ ] `15.9` Criar templates Supabase em `pt-BR` e documentar redirects por ambiente.
- [ ] `15.10` Criar checklist dev/prd de remetente, SPF, DKIM, DMARC, limites e entregabilidade.

### HU-16 — Backoffice de moderação

> Como administrador, quero um backoffice responsivo para localizar submissões, revisar todos os dados e executar decisões seguras sem depender de uma interface desktop.

- [ ] `16.1` Testar autorização e navegação do backoffice, chamadas diretas, admin revogado e atribuição entre múltiplos admins.
- [ ] `16.2` Criar shell responsivo com navegação mobile, breadcrumbs, loading/error boundaries e feedback acessível.
- [ ] `16.3` Criar fila paginada no servidor com filtros de status, busca e ordenação na URL, contagens, autorização e cancelamento.
- [ ] `16.4` Criar hook da fila, tabela desktop e lista/cards equivalentes no mobile sem duplicar resultados no Zustand.
- [ ] `16.5` Criar revisão completa com perfil, mídia, consentimentos, aviso sobre CNPJ, completude, versão e histórico.
- [ ] `16.6` Criar ações de aprovar/solicitar correções com confirmação, motivo obrigatório e proteção de revisão obsoleta.
- [ ] `16.7` Criar ações de suspender, restaurar, banir, desbanir excepcionalmente e arquivar, com motivos e consequências explícitas.
- [ ] `16.8` Testar revisão/decisão de influencer e empresa em mobile, teclado e leitor de tela.
- [ ] `16.9` Garantir que o MVP não possua aprovação ou banimento em massa.

### HU-17 — Gestão administrativa, auditoria e operação

> Como administrador, quero pesquisar contas, revisar histórico e acompanhar falhas operacionais para administrar a plataforma com rastreabilidade e privilégio mínimo.

- [ ] `17.1` Criar busca/filtro paginado por papel, status e arquivamento, com filtros na URL, DTO seguro e hook testado.
- [ ] `17.2` Criar páginas de lista/detalhe com perfil autorizado, status, completude, moderação, mídia, consentimento e metadados seguros.
- [ ] `17.3` Permitir edição administrativa de perfil pelo mesmo pipeline de validação e auditoria do proprietário.
- [ ] `17.4` Criar DTOs e filtros de auditoria por entidade, registro, ator, ação, origem e período.
- [ ] `17.5` Criar histórico/diff de auditoria redigido e sem controles de mutação.
- [ ] `17.6` Criar lista de e-mails pendentes/falhos, detalhe de tentativas e retry elegível.
- [ ] `17.7` Provar que usuários normais não acessam gestão, auditoria, identidades bloqueadas ou outbox.

### HU-18 — Catálogo privado para contas aprovadas

> Como empresa aprovada, quero encontrar criadores elegíveis; como influencer aprovado, quero encontrar outros criadores e visualizar empresas aprovadas sem expor dados privados.

- [ ] `18.1` Testar todos os status, papéis, arquivamento, tipos de criador, exclusão do próprio perfil e privacidade do carrossel.
- [ ] `18.2` Criar busca de nome sem distinção de acento ou maiúsculas, apoiada por índice PostgreSQL.
- [ ] `18.3` Criar filtros combináveis de nicho, rede, cidade/UF e tipo exclusivo de criador.
- [ ] `18.4` Criar paginação por cursor estável, limites padrão/máximo, ordem determinística e tratamento de cursor inválido.
- [ ] `18.5` Criar DTOs mínimos de card/detalhe sem conta bruta, moderação, auditoria ou campos privados.
- [ ] `18.6` Liberar contatos a `COMPANY` aprovada somente quando houver consentimento do criador.
- [ ] `18.7` Entregar a `INFLUENCER` lista sem o próprio perfil e carrossel de logos de empresas aprovadas, sem CNPJ ou contatos.
- [ ] `18.8` Invalidar cache ou não cachear de modo que suspensos, banidos e arquivados desapareçam imediatamente.
- [ ] `18.9` Testar planos/performance com volume representativo para consultas simples e filtros combinados.

### HU-19 — Interface do catálogo e detalhes

> Como usuário aprovado em dispositivo móvel ou desktop, quero pesquisar, filtrar, navegar e abrir perfis com estados claros, mídia autorizada e controles adequados ao meu papel.

- [ ] `19.1` Testar chaves de query, cancelamento, invalidação, hidratação, filtros na URL, estados, cursor, sheet mobile e controles por papel.
- [ ] `19.2` Criar boundary Server Component de autorização/prefetch e view cliente com única fonte de renderização dos dados.
- [ ] `19.3` Criar cards responsivos com mídia assinada, tipo, nicho/localização e rótulo de métricas autodeclaradas.
- [ ] `19.4` Criar hook do catálogo e controles touch-friendly com estado na URL, chips, limpar e anúncios assíncronos acessíveis.
- [ ] `19.5` Criar navegação por cursor/infinite query limitada, com cancelamento Axios, sem carregar o catálogo inteiro.
- [ ] `19.6` Criar detalhe com contatos/redes por papel e estado seguro quando o perfil perde elegibilidade.
- [ ] `19.7` Criar carrossel privado de logos de empresas somente para influencer aprovado.
- [ ] `19.8` Criar skeleton, vazio inicial, vazio filtrado, erro recuperável, limpeza após perda de autorização e retry em `pt-BR`.
- [ ] `19.9` Testar responsividade/acessibilidade em 320, 390, 768 e 1440 px, incluindo WebKit crítico.

### HU-20 — Espaços de patrocínio

> Como administrador, quero cadastrar e agendar criativos promocionais por audiência e posição; como usuário, quero vê-los de forma responsiva sem que patrocínio burle aprovação ou privacidade.

- [ ] `20.1` Testar tipo, completude, URL, agenda, audiência/rota, empates de ordem, elegibilidade referenciada e privacidade pública.
- [ ] `20.2` Implementar validação, elegibilidade, ordem determinística e avaliação de agenda em UTC.
- [ ] `20.3` Implementar CRUD/remoção lógica auditado, versão otimista e mídia privada para admin.
- [ ] `20.4` Criar backoffice para listar, filtrar, criar, editar, visualizar, ativar, desativar e reordenar placements.
- [ ] `20.5` Criar renderizadores de topo, lateral convertida em inline mobile, carrossel e criador em destaque.
- [ ] `20.6` Suprimir placements com perfil inelegível ou criativo público derivado de participante enquanto social proof estiver desativado.
- [ ] `20.7` Provar que não existem preço, pagamento, fatura, comissão, split, renovação ou fluxos financeiros.
- [ ] `20.8` Testar preview e posições em mobile, teclado e leitor de tela.

### HU-21 — Landing page e páginas públicas

> Como visitante, quero entender rapidamente a proposta para influencers e empresas, escolher meu fluxo de cadastro e acessar informações legais sem que dados privados de participantes apareçam publicamente.

- [x] `21.1` Provar que páginas anônimas não consultam nem serializam perfis, participantes ou logos.
- [x] `21.2` Aplicar ativos/tokens da marca em sistema visual mobile first sem copiar concorrentes ou criar afirmações não aprovadas.
- [x] `21.3` Criar header/hero com “Sou influencer”, “Sou empresa” e “Entrar”, preservando a intenção no cadastro combinado.
- [x] `21.4` Criar seções de benefícios/problemas e sequência curta de “Como funciona”.
- [ ] `21.5` Criar slot promocional público genérico opcional com supressão de perfis protegidos.
- [ ] `21.6` Criar CTA final/footer com contato aprovado e rotas de Termos e Privacidade.
- [x] `21.7` Configurar metadata, canonical, Open Graph, sitemap, robots e `noindex` protegido.
- [x] `21.8` Manter `publicSocialProofEnabled=false` imutável no servidor e sem toggle no backoffice Beta.
- [x] `21.9` Testar responsividade, teclado, movimento reduzido, axe e screenshots em larguras representativas.
- [ ] `21.10` Criar contadores agregados opcionais e seguros, ocultando valores vazios ou enganosos e sem identidade de participantes.
- [x] `21.11` Criar acesso persistente e acessível a “Entrar” em layouts longos/estreitos sem cobrir conteúdo.

### HU-22 — Dashboard administrativo

> Como administrador, quero indicadores objetivos de contas e fila para acompanhar o Beta e chegar rapidamente às operações prioritárias.

- [ ] `22.1` Testar definições de totais por papel/status, fila pendente, cadastros por período, exclusão de arquivados e completude.
- [ ] `22.2` Criar agregações indexadas com período/timezone explícitos e DTOs seguros.
- [ ] `22.3` Criar hook e dashboard com cards, distribuição, período na URL, completude e links para filas.
- [ ] `22.4` Criar estados de loading, vazio e erro e layout mobile sem gráficos densos dependentes de desktop.
- [ ] `22.5` Conferir métricas contra o banco semeado e o serviço compartilhado de completude.

### HU-23 — LGPD, segurança, abuso e observabilidade

> Como usuário e responsável pelo produto, quero proteção de dados, controles contra abuso e diagnósticos redigidos para operar o sistema sem expor informações pessoais ou segredos.

- [x] `23.1` Criar páginas placeholder de Termos/Privacidade e bloquear lançamento até receber conteúdo legal, contato e consentimento aprovados.
- [ ] `23.2` Documentar/testar fluxo manual de correção, exportação e exclusão/anonimização sem inventar prazo de retenção.
- [ ] `23.3` Configurar headers de segurança, CSP, frame, referrer e permissions compatíveis com Supabase, Google, Vercel e mídia.
- [ ] `23.4` Adicionar verificação CSRF/same-origin onde a proteção do framework for insuficiente e testar chamadas diretas.
- [ ] `23.5` Adicionar rate limits limitados para cadastro/recuperação, CNPJ, contato e comandos administrativos sensíveis.
- [ ] `23.6` Adicionar request IDs e logs estruturados/redigidos para Auth, autorização, moderação, banimento, CNPJ, e-mail, migrações e health.
- [ ] `23.7` Testar que logs/DTOs de auditoria não vazam e-mail, WhatsApp, CNPJ, tokens, URLs assinadas, segredos SMTP ou payloads brutos.
- [ ] `23.8` Criar health checks de liveness/readiness sem revelar configurações ou segredos.
- [ ] `23.9` Modelar ameaças de sessão, IDOR, RLS, Storage, admin, banimento, CNPJ, SMTP/outbox e exposição pública, convertendo achados em testes.

### HU-24 — Responsividade, acessibilidade e performance globais

> Como pessoa usuária em qualquer dispositivo e com diferentes necessidades de acesso, quero concluir todas as jornadas com boa leitura, navegação, desempenho e compatibilidade.

- [ ] `24.1` Auditar todas as rotas em 320, 390, 768 e 1440 px para overflow, hierarquia, toque, dialogs, tabelas e elementos fixos.
- [ ] `24.2` Auditar teclado, ordem/retorno de foco, skip links, traps de modal, foco de erros e anúncios assíncronos.
- [ ] `24.3` Auditar WCAG 2.2 AA para contraste, semântica, labels, descrições, alt text, movimento reduzido e zoom/reflow.
- [ ] `24.4` Otimizar fontes, imagens, mídia assinada, fronteiras Server/Client, hidratação, waterfalls Axios, Zustand, streaming e bundle.
- [ ] `24.5` Medir Core Web Vitals/Lighthouse, documentar budgets e corrigir regressões.
- [ ] `24.6` Executar fluxos críticos em Chromium e WebKit mobile/desktop e corrigir diferenças.
- [ ] `24.7` Revisar toda a interface, e-mails e placeholders legais em português correto, sem enums internos em inglês.

### HU-25 — CI, ambientes e promoção

> Como equipe de entrega, quero pipelines e ambientes isolados para validar cada mudança e promover o mesmo esquema de forma controlada até produção.

- [ ] `25.1` Criar CI para instalação, lockfile, format, lint, type-check, testes, auditoria de dependências e build.
- [ ] `25.2` Criar job com Docker/Supabase local para reset, seed e testes de schema, RLS, triggers, Storage e hooks Auth.
- [ ] `25.3` Criar smoke Playwright/axe em CI com artefatos de falha e sem provedores/destinatários reais.
- [ ] `25.4` Criar lint, dry-run e drift de migrações e proibir alteração de histórico já aplicado.
- [ ] `25.5` Provisionar/documentar Supabase e Vercel do cliente com nomes exatos `contente-creators-dev` e `contente-creators-prd`.
- [ ] `25.6` Configurar variáveis, URLs, callbacks, Google OAuth, Storage, SMTP e segredos agendados isolados em desenvolvimento.
- [ ] `25.7` Configurar recursos equivalentes e isolados em produção, sem copiar dados ou segredos de desenvolvimento.
- [ ] `25.8` Implementar promoção controlada `develop` → desenvolvimento e `main` protegida → produção, com aprovação.
- [ ] `25.9` Criar verificações antes/depois do deploy para schema, Auth, Storage, CNPJ, SMTP, catálogo, backoffice e health.
- [ ] `25.10` Documentar expand/contract, rollback da aplicação, roll-forward corretivo, migração falha e histórico imutável.

### HU-26 — Jornadas E2E de aceite

> Como responsável pelo aceite do MVP, quero validar os fluxos completos e suas negativas de segurança para garantir que as histórias funcionem juntas antes do lançamento.

- [ ] `26.1` Testar landing → intenção influencer → cadastro único → confirmação → análise pendente, sem segunda escolha de papel.
- [ ] `26.2` Testar callback Google → modal de empresa → CNPJ → onboarding editável → análise pendente.
- [ ] `26.3` Testar timeout da BrasilAPI → preenchimento manual → submissão bem-sucedida.
- [ ] `26.4` Testar fila admin → revisão → solicitação de correção → ajuste/reenvio → aprovação → outbox.
- [ ] `26.5` Provar que pendente, correção, suspenso e banido não recebem listagem/detalhe em chamadas diretas.
- [ ] `26.6` Testar empresa aprovada pesquisando, filtrando, abrindo detalhe/contato e respeitando negativa de consentimento.
- [ ] `26.7` Testar influencer aprovado vendo outros criadores, excluindo a si, vendo carrossel de empresas e sem contatos privados.
- [ ] `26.8` Testar edição imediata de perfil aprovado, atualização visível, status preservado e revisão auditada.
- [ ] `26.9` Testar suspensão/restauração e banimento, remoção imediata, sessão, recriação conhecida negada e desbanimento auditado.
- [ ] `26.10` Testar criação, agenda, ordem, renderização, expiração e supressão de patrocínio sem pagamento.
- [ ] `26.11` Testar múltiplos admins, admin revogado, arquivamento, filtros de auditoria, métricas e retry de e-mail.
- [ ] `26.12` Provar por E2E/inspeção que nenhuma rota, metadata ou criativo público expõe participantes com social proof desativado.

### HU-27 — Operação e prontidão de produção

> Como equipe responsável pelo lançamento, quero documentação, entradas do cliente, runbooks e validações de produção para operar e recuperar o MVP com segurança.

- [ ] `27.1` Reescrever README com arquitetura, comandos, TDD, serviços locais, ambientes, migrações e troubleshooting.
- [ ] `27.2` Criar dicionário de dados, máquina de estados e matriz RLS para tabelas, papéis, status, campos sensíveis e auditoria.
- [ ] `27.3` Criar guia do backoffice para correção, aprovação, suspensão, banimento/desbanimento, arquivamento, patrocínio, e-mail e auditoria.
- [ ] `27.4` Criar checklist de provisionamento das contas do cliente em Supabase, Vercel, Google, SMTP e DNS.
- [ ] `27.5` Criar runbooks de exportação, backup/restore e gatilhos de upgrade dos planos gratuitos, sem prometer garantias inexistentes.
- [ ] `27.6` Criar resposta a incidentes de Auth, privacidade, moderação incorreta, SMTP, provedor, migração e Storage.
- [ ] `27.7` Obter e registrar ativos finais de marca, copy, nichos/faixas, admins, criativos, domínio, documentos legais, suporte, consentimento e retenção.
- [ ] `27.8` Verificar tela de consentimento Google, callback/domínio de produção, identidade SMTP, SPF/DKIM/DMARC, limites e entrega.
- [ ] `27.9` Executar UAT em desenvolvimento para os dois papéis e backoffice, registrar defeitos e fechar bloqueadores.
- [ ] `27.10` Executar dry run de produção, migração/deploy aprovados, smoke sintético, inspeção de privacidade/logs e monitoramento.

### HU-28 — Proteção explícita do escopo Beta

> Como responsável pelo produto, quero impedir a entrada silenciosa de funcionalidades fora do Beta para manter custo, prazo e complexidade sob controle.

- [ ] `28.1` Confirmar ausência de pagamentos, comissões, split, escrow, ledger de preço, checkout e faturamento.
- [ ] `28.2` Confirmar ausência de chat, mensagens, propostas/campanhas, entrega de conteúdo, contrato digital, agência, avaliações e app nativo.
- [ ] `28.3` Confirmar que CNPJ é apenas assistência de formulário, sem antifraude, verificação ou aprovação automática.
- [ ] `28.4` Confirmar ausência da avaliação padrão de cinco estrelas do DOCX e de login pelo Instagram.
- [ ] `28.5` Confirmar ausência de listagens públicas de perfis/logos e manter testes/configuração de proteção.
- [ ] `28.6` Confirmar arquitetura por slices sem pastas especulativas, arquivos genéricos catch-all, barrels mistos, Context de negócio, dados Query no Zustand, store em RSC ou transportes duplicados.

## 5. Fora do escopo do MVP

As capacidades abaixo não devem ser modeladas, implementadas ou sugeridas como parcialmente entregues neste Beta:

- pagamentos, comissões, split, escrow, checkout, preços, faturas ou renovação automática;
- chat interno ou mensagens;
- propostas, campanhas ou entrega de conteúdo;
- contratos digitais;
- perfil ou painel de agência;
- avaliações e reputação;
- aplicativo mobile nativo;
- antifraude automatizado ou verificação/aprovação por API;
- autenticação pelo Instagram;
- listagem pública de participantes ou logos enquanto `publicSocialProofEnabled=false`.

## 6. Dependências do cliente para lançamento

O desenvolvimento local pode avançar com placeholders e dados sintéticos, mas o lançamento depende de:

- contas de propriedade do cliente na Vercel, Supabase, Google OAuth, DNS e SMTP da Marques Branding;
- domínio final e URLs/callbacks aprovados;
- identidade do remetente, SPF, DKIM, DMARC, limites e teste de entregabilidade;
- Termos de Uso, Política de Privacidade, textos de consentimento, contato de suporte/privacidade e política de retenção;
- ativos finais da marca, imagens e copy de marketing aprovados;
- e-mails dos administradores iniciais;
- taxonomia final de nichos, faixas de funcionários e eventuais dados de lançamento;
- criativos de patrocínio que serão administrados no Beta;
- critérios de capacidade que disparem migração dos planos gratuitos.

## 7. Definição de pronto do MVP

O MVP estará pronto para lançamento somente quando:

- as 252 entregas rastreadas acima estiverem concluídas e verificadas;
- os fluxos de influencer, empresa e administrador passarem no aceite E2E e no UAT;
- estados não aprovados não receberem nenhum dado do catálogo, inclusive por chamadas diretas;
- RLS, Storage, auditoria, banimento, consentimentos e outbox estiverem cobertos por testes locais de integração;
- todas as rotas críticas estiverem validadas em mobile, desktop, Chromium, WebKit e acessibilidade;
- os ambientes `contente-creators-dev` e `contente-creators-prd` estiverem isolados e provisionados em contas do cliente;
- os conteúdos legais, de suporte, marca e SMTP estiverem aprovados;
- migração, deploy, smoke, observabilidade, backup/export e resposta a incidentes estiverem documentados e ensaiados;
- a revisão de escopo confirmar que nenhuma funcionalidade explicitamente excluída foi introduzida.
