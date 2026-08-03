# Plano manual de testes UAT - Contente Creators

Data: 2026-08-03

Este roteiro cobre os perfis e estados principais do Contente Creators para
teste manual em ambiente local, homologacao ou producao. Use contas sinteticas
sempre que possivel. Nao registre senhas, tokens, URLs magicas de Auth, dados
reais de CNPJ, mensagens completas de e-mail ou dados pessoais sensiveis nas
evidencias.

## Ambientes

| Ambiente   | URL principal                          | Observacao                                 |
| ---------- | -------------------------------------- | ------------------------------------------ |
| Local      | `http://localhost:3010` ou porta ativa | Usar Mailpit/Supabase local quando ligado  |
| Producao   | `https://www.contentecreators.com`     | Usar apenas dados aprovados pelo cliente   |
| Supabase   | Projeto `kstbhqeiebutpfvswyla`         | Google OAuth e Auth remoto em producao     |
| Backoffice | `/backoffice`                          | Requer conta `ADMIN` aprovada e individual |

## Massa minima de teste

Crie ou separe as seguintes contas sinteticas:

| Perfil               | Estado inicial sugerido | Objetivo do teste                                   |
| -------------------- | ----------------------- | --------------------------------------------------- |
| Visitante anonimo    | Sem login               | Landing, termos, privacidade, bloqueio de acesso    |
| Usuario sem role     | Logado, sem papel       | Selecao de creator/empresa                          |
| Creator novo         | `ONBOARDING`            | Cadastro, consentimentos, envio para analise        |
| Creator pendente     | `PENDING_REVIEW`        | Tela de analise e bloqueio de catalogo              |
| Creator aprovado     | `APPROVED`              | Catalogo, perfil, edicao, visao sem contato privado |
| Creator com correcao | `CHANGES_REQUESTED`     | Ver motivo, corrigir e reenviar                     |
| Creator suspenso     | `SUSPENDED`             | Tela de suspensao e bloqueio de produto             |
| Creator bloqueado    | `BANNED`                | Tela terminal e impossibilidade de recriar acesso   |
| Empresa nova         | `ONBOARDING`            | Cadastro com CNPJ/endereco/consentimentos           |
| Empresa pendente     | `PENDING_REVIEW`        | Tela de analise e bloqueio de catalogo              |
| Empresa aprovada     | `APPROVED`              | Catalogo de creators, detalhe e contato permitido   |
| Empresa com correcao | `CHANGES_REQUESTED`     | Ver motivo, corrigir e reenviar                     |
| Empresa suspensa     | `SUSPENDED`             | Tela de suspensao e bloqueio de produto             |
| Empresa bloqueada    | `BANNED`                | Tela terminal e bloqueio de identidade              |
| Admin aprovado       | `ADMIN` + `APPROVED`    | Moderacao, contas, e-mails, auditoria, patrocinio   |
| Usuario nao admin    | Qualquer outro perfil   | Negar acesso ao backoffice                          |

## Criterios gerais de aceite

- Nao ha erro 500 em fluxos esperados.
- Toda rota protegida redireciona ou bloqueia conforme papel/status.
- A interface fica em portugues do Brasil.
- Formularios preservam valores apos erro de servidor.
- Validacoes mostram mensagens claras e nao expõem payload tecnico.
- E-mails chegam ou ficam visiveis no outbox quando houver falha.
- Nenhum perfil pendente, suspenso ou bloqueado aparece no catalogo.
- Contatos privados de creators aparecem apenas para empresa aprovada e quando
  ha consentimento ativo.
- Acoes administrativas exigem motivo/confirmacao quando aplicavel e registram
  historico.

## P0 - Smoke publico e autenticacao

### UAT-P0-01 - Landing publica

1. Acesse `/`.
2. Teste menu: `Para Creators`, `Para Empresas`, `Como funciona`, `FAQ`.
3. Clique nos CTAs de creator e empresa.
4. Acesse rodape, termos e privacidade.

Esperado:

- Landing carrega sem login.
- CTAs levam para cadastro com intencao correta.
- Termos/privacidade abrem sem quebrar.
- Rodape esta alinhado e mostra Vevox.

### UAT-P0-02 - Login com Google

1. Acesse `/login`.
2. Clique em `Continuar com o Google`.
3. Escolha uma conta Google autorizada.
4. Conclua o callback.

Esperado:

- Usuario volta para `https://www.contentecreators.com/auth/callback`.
- Primeiro acesso sem role vai para `/onboarding/role`.
- Conta com perfil existente vai para a tela correta conforme status.

### UAT-P0-03 - Login e senha

1. Acesse `/sign-up`.
2. Cadastre um e-mail sintetico.
3. Confirme o e-mail no inbox do ambiente.
4. Faca login em `/login`.
5. Teste senha incorreta.
6. Teste `Esqueci minha senha` e redefinicao.

Esperado:

- E-mail de confirmacao chega com link do mesmo ambiente.
- Login correto entra.
- Senha incorreta mostra erro seguro.
- Redefinicao de senha conclui e permite login novo.

### UAT-P0-04 - Logout e sessao

1. Entre como qualquer usuario.
2. Clique em sair.
3. Tente abrir `/app/catalog` diretamente.

Esperado:

- Sessao encerra.
- Rota protegida redireciona para login.

## P1 - Visitante anonimo

### UAT-VIS-01 - Bloqueio de rotas privadas

1. Sem login, acesse `/app/catalog`.
2. Sem login, acesse `/app/profile`.
3. Sem login, acesse `/backoffice`.
4. Sem login, acesse `/api/catalog/creators`.

Esperado:

- Telas privadas redirecionam para login ou bloqueiam acesso.
- APIs protegidas retornam `401` ou `403`.
- Nenhum dado de catalogo, contato, admin ou auditoria aparece.

## P2 - Cadastro e onboarding de creator

### UAT-CRE-01 - Selecao de papel creator

1. Entre com Google ou e-mail novo.
2. Se cair em `/onboarding/role`, selecione `Sou creator`.

Esperado:

- Usuario vai para `/onboarding/influencer`.
- Campos de empresa nao aparecem.

### UAT-CRE-02 - Validacoes obrigatorias

1. Em cadastro de creator, tente enviar vazio.
2. Preencha senha divergente.
3. Informe bio com menos de 30 caracteres.
4. Informe URL social invalida.
5. Deixe termos/privacidade sem marcar.

Esperado:

- Envio fica bloqueado ou mostra mensagens por campo.
- Valores ja digitados permanecem na tela.
- Nao cria envio para moderacao.

### UAT-CRE-03 - Cadastro creator completo

1. Preencha nome completo, nome de creator, tipo `Influencer` ou `UGC`.
2. Informe seguidores, engajamento, WhatsApp, bio, canal principal, link social.
3. Escolha pelo menos um nicho.
4. Informe cidade e UF.
5. Marque termos, privacidade e decisao de contato quando exibida.
6. Confirme envio.

Esperado:

- Perfil vai para `PENDING_REVIEW`.
- Usuario ve tela `/app/status/analysis`.
- Catalogo permanece bloqueado enquanto pendente.
- Admin passa a ver a submissao na fila.
- E-mail de recebimento/analise e criado ou entregue.

### UAT-CRE-04 - Upload e edicao de midia creator

1. Com creator em onboarding/correcao/aprovado, abra perfil.
2. Envie avatar valido.
3. Envie capa valida.
4. Tente arquivo invalido ou grande demais.

Esperado:

- Imagens validas aparecem no preview e sao salvas.
- Arquivo invalido e recusado com mensagem clara.
- Usuario nao consegue acessar midia de outro dono por URL direta.

## P3 - Cadastro e onboarding de empresa

### UAT-EMP-01 - Selecao de papel empresa

1. Entre com Google ou e-mail novo.
2. Selecione `Sou empresa`.

Esperado:

- Usuario vai para `/onboarding/company`.
- Campos de creator nao aparecem.

### UAT-EMP-02 - Validacoes obrigatorias

1. Tente enviar empresa vazia.
2. Informe CNPJ invalido.
3. Informe descricao com menos de 30 caracteres.
4. Informe CEP/endereco incompleto.
5. Deixe termos/privacidade sem marcar.

Esperado:

- Envio bloqueado ou erro por campo.
- Dados digitados sao preservados apos erro.
- Nenhum registro pendente incompleto e enviado para moderacao.

### UAT-EMP-03 - Cadastro empresa completo

1. Preencha razao social, nome fantasia e CNPJ valido sintetico.
2. Escolha segmento e tamanho da empresa.
3. Informe WhatsApp, descricao, CEP, logradouro, numero, bairro, cidade e UF.
4. Opcionalmente informe site, rede social e local adicional.
5. Marque consentimentos.
6. Confirme envio.

Esperado:

- Perfil vai para `PENDING_REVIEW`.
- Usuario ve tela `/app/status/analysis`.
- Catalogo permanece bloqueado enquanto pendente.
- Admin ve a submissao na fila.
- E-mail de recebimento/analise e criado ou entregue.

### UAT-EMP-04 - CNPJ assistido

1. Digite CNPJ com checksum valido.
2. Aguarde busca/feedback.
3. Edite manualmente dados retornados.
4. Simule CNPJ sem resposta/indisponivel se possivel.

Esperado:

- Autocomplete ajuda, mas nao trava edicao manual.
- Falha externa nao impede preenchimento manual.
- Mensagem nao expoe payload tecnico do provedor.

## P4 - Estados de moderacao do dono do perfil

### UAT-STA-01 - Pendente de analise

1. Entre como creator ou empresa `PENDING_REVIEW`.
2. Acesse `/app`, `/app/catalog`, `/app/profile`.

Esperado:

- Usuario e levado para `/app/status/analysis`.
- Nao ve catalogo nem detalhes privados.
- Tela explica que o cadastro esta em analise.

### UAT-STA-02 - Alteracoes solicitadas

1. Admin solicita correcao com motivo claro.
2. Usuario acessa novamente.
3. Abra o formulario de correcao.
4. Corrija campos e reenvie.

Esperado:

- Usuario ve o motivo de forma segura.
- Rota vai para `/onboarding/influencer?corrections=requested` ou
  `/onboarding/company?corrections=requested`.
- Reenvio volta para `PENDING_REVIEW`.
- Historico anterior e preservado.

### UAT-STA-03 - Suspenso

1. Admin suspende uma conta aprovada.
2. Usuario tenta acessar `/app/catalog` e `/app/profile`.

Esperado:

- Usuario ve `/app/status/suspended`.
- Catalogo e contatos ficam bloqueados.
- Perfil suspenso desaparece dos resultados.

### UAT-STA-04 - Bloqueado

1. Admin bane uma conta.
2. Usuario tenta logar ou acessar app.
3. Tente recriar cadastro com a mesma identidade, se o ambiente permitir.

Esperado:

- Usuario ve `/app/status/blocked`.
- Acesso ao produto e terminado.
- Identidade conhecida fica impedida conforme regra de bloqueio.

## P5 - Empresa aprovada

### UAT-CAT-EMP-01 - Catalogo de creators

1. Entre como empresa `APPROVED`.
2. Acesse `/app/catalog`.
3. Teste busca por texto.
4. Teste filtros de nicho, localidade, canal, tipo e metricas disponiveis.
5. Limpe filtros.

Esperado:

- Lista mostra apenas creators aprovados e elegiveis.
- Filtros atualizam resultados e URL sem quebrar.
- Nenhum dado operacional sensivel aparece nos cards.

### UAT-CAT-EMP-02 - Detalhe do creator

1. Abra um creator do catalogo.
2. Verifique bio, nichos, metricas, midias e localidade.
3. Teste creator inexistente ou removido.

Esperado:

- Detalhe abre sem expor dados administrativos.
- Creator inexistente/ineligivel retorna estado de erro ou nao encontrado.

### UAT-CAT-EMP-03 - Contato com creator

1. Abra detalhe de creator com consentimento ativo para contato.
2. Clique em e-mail, social e WhatsApp, quando disponiveis.
3. Abra creator sem consentimento ativo.

Esperado:

- E-mail abre `mailto:`.
- WhatsApp abre `https://wa.me/...`.
- Redes sociais abrem URLs seguras.
- Sem consentimento, a interface explica indisponibilidade e nao mostra contato.

### UAT-CAT-EMP-04 - Perfil da empresa

1. Acesse `/app/profile`.
2. Edite dados permitidos.
3. Salve.
4. Recarregue a pagina.

Esperado:

- Alteracoes persistem.
- Status aprovado nao volta para pendente por edicao permitida.
- Campos obrigatorios continuam validados.

## P6 - Creator aprovado

### UAT-CAT-CRE-01 - Visao de catalogo para creator

1. Entre como creator `APPROVED`.
2. Acesse `/app/catalog`.
3. Navegue pelos resultados permitidos.
4. Abra detalhe de outro creator, se exibido.

Esperado:

- Creator aprovado consegue acessar o catalogo permitido.
- Contatos privados nao ficam disponiveis para viewer creator.
- Nenhum dado de empresa sensivel aparece indevidamente.

### UAT-CAT-CRE-02 - Carrossel de empresas

1. Entre como creator aprovado.
2. Acesse a area principal ou catalogo.
3. Verifique carrossel/lista de empresas, quando houver dados.

Esperado:

- Exibe apenas empresas aprovadas/elegiveis.
- Nao mostra CNPJ, razao legal, contato operacional ou dados privados.
- Estado vazio e claro quando nao houver empresas.

### UAT-CAT-CRE-03 - Perfil do creator

1. Acesse `/app/profile`.
2. Edite bio, nichos, metricas, cidade/UF e links permitidos.
3. Troque avatar/capa.
4. Salve e recarregue.

Esperado:

- Alteracoes persistem.
- Midias renderizam corretamente.
- Status aprovado permanece aprovado.

## P7 - Admin/backoffice

### UAT-ADM-01 - Acesso ao backoffice

1. Entre como admin aprovado.
2. Acesse `/backoffice`.
3. Saia e tente acessar novamente.
4. Entre como usuario nao admin e tente `/backoffice`.

Esperado:

- Admin aprovado entra.
- Usuario sem admin recebe bloqueio/redirecionamento.
- Sessao encerrada nao acessa backoffice.

### UAT-ADM-02 - Fila de moderacao

1. Abra `/backoffice/moderation`.
2. Filtre por papel, status e busca.
3. Abra uma submissao.
4. Verifique dados de perfil, completude, consentimentos, historico e midias.

Esperado:

- Fila mostra submissos pendentes/correcao conforme filtros.
- Detalhe nao perde versao atual.
- Dados privados sao exibidos apenas para admin autorizado.

### UAT-ADM-03 - Aprovar cadastro

1. Abra uma submissao pendente de creator.
2. Clique em aprovar.
3. Confirme.
4. Repita com empresa pendente.

Esperado:

- Conta muda para `APPROVED`.
- Usuario aprovado entra em `/app/catalog`.
- Evento de moderacao, auditoria e e-mail sao registrados.
- Perfil passa a aparecer apenas nos catalogos elegiveis.

### UAT-ADM-04 - Solicitar correcao

1. Abra uma submissao pendente.
2. Tente solicitar correcao sem motivo.
3. Informe motivo claro.
4. Confirme.

Esperado:

- Sem motivo, acao e bloqueada.
- Com motivo, conta muda para `CHANGES_REQUESTED`.
- Usuario ve o motivo e pode reenviar.
- E-mail de correcao e criado ou entregue.

### UAT-ADM-05 - Suspender, restaurar, banir e desbanir

1. Abra conta aprovada.
2. Suspenda com motivo.
3. Verifique bloqueio no usuario.
4. Restaure com motivo.
5. Bana com motivo.
6. Desbana de forma excepcional, se a UI permitir.

Esperado:

- Cada acao exige motivo e confirmacao quando aplicavel.
- Suspenso sai do catalogo e pode ser restaurado para aprovado.
- Banido vai para estado terminal.
- Desbanimento retorna para suspenso, nao direto para aprovado.
- Historico e auditoria preservam todos os eventos.

### UAT-ADM-06 - Gestao de contas

1. Abra `/backoffice/accounts`.
2. Busque por e-mail/nome/status.
3. Abra detalhe de uma conta.
4. Edite dados permitidos.
5. Tente uma acao com pagina antiga apos outro admin alterar a mesma conta, se
   possivel.

Esperado:

- Busca e filtros funcionam.
- Edicao salva e audita.
- Conflito de versao pede recarregar/revisar antes de decidir.

### UAT-ADM-07 - Dashboard e metricas

1. Abra `/backoffice`.
2. Valide cards/graficos de resumo.
3. Compare contagens com fila/contas quando possivel.

Esperado:

- Numeros carregam sem erro.
- Nao ha vazamento de dados sensiveis no dashboard.
- Estado vazio funciona em ambiente sem massa.

### UAT-ADM-08 - Patrocinios/destaques

1. Abra `/backoffice/sponsorships`.
2. Crie placement com audiencia, slot, periodo, ordem, URL e criativo validos.
3. Ative dentro do periodo.
4. Visualize landing/catalogo conforme audiencia.
5. Desative ou arquive.

Esperado:

- Criativo valido e aceito em bucket privado.
- Placement ativo aparece no slot/audiencia correta.
- Fora de periodo/inativo/arquivado nao aparece.
- Nao ha fluxo de pagamento ou preco no Beta.

### UAT-ADM-09 - E-mails transacionais

1. Abra `/backoffice/emails`.
2. Filtre por status/template.
3. Abra detalhe de tentativa.
4. Force ou localize uma falha elegivel.
5. Tente retry sem motivo e depois com motivo/confirmacao.

Esperado:

- Outbox lista itens com dados redigidos.
- Retry exige motivo e confirmacao.
- Retry nao duplica a identidade da mensagem.
- Erros SMTP nao revertem decisao de negocio.

### UAT-ADM-10 - Auditoria

1. Abra `/backoffice/audit`.
2. Filtre por entidade, ator, acao, origem e periodo.
3. Compare antes/depois de uma moderacao recente.

Esperado:

- Eventos aparecem como historico imutavel.
- Campos sensiveis sao redigidos.
- Request IDs e atores permitem rastrear operacao.

## P8 - Permissoes e seguranca funcional

### UAT-SEC-01 - Separacao de papeis

1. Como creator aprovado, tente abrir detalhe com contato privado.
2. Como empresa aprovada, tente abrir rotas de admin.
3. Como admin, tente usar catalogo como usuario de produto, se aplicavel.

Esperado:

- Creator nao ve contato privado.
- Empresa nao acessa admin.
- Admin e direcionado ao backoffice.

### UAT-SEC-02 - Protecao contra acesso direto

1. Copie uma URL de detalhe de creator.
2. Acesse sem login.
3. Acesse com empresa pendente.
4. Acesse com empresa aprovada.

Esperado:

- Sem login ou pendente nao ve detalhe.
- Empresa aprovada ve detalhe permitido.
- Dados privados dependem de consentimento.

### UAT-SEC-03 - Estado arquivado/ineligivel

1. Admin arquiva uma conta aprovada em ambiente de teste.
2. Busque essa conta nos catalogos.
3. Tente acessar detalhe direto.

Esperado:

- Conta arquivada some dos catalogos.
- Detalhe direto nao entrega dados privados.
- Historico permanece no backoffice.

## P9 - Responsivo, acessibilidade e UX

### UAT-UX-01 - Mobile

1. Teste landing, login, cadastro, catalogo, detalhe e backoffice em largura
   mobile.
2. Abra menus, filtros, dialogs e selects.

Esperado:

- Nao ha texto sobreposto.
- Botoes continuam clicaveis.
- Dialogs cabem na tela.

### UAT-UX-02 - Teclado e foco

1. Navegue por login/cadastro/catalogo usando Tab/Shift+Tab.
2. Acione botoes com Enter/Espaco.
3. Verifique foco em dialogs.

Esperado:

- Ordem de foco e previsivel.
- Dialog prende foco enquanto aberto.
- Mensagens de erro ficam associadas aos campos.

### UAT-UX-03 - Estados vazios e erro

1. Teste catalogo sem resultados.
2. Teste falha de rede em APIs, se possivel.
3. Teste paginas `loading`/erro com refresh.

Esperado:

- Estado vazio orienta sem quebrar layout.
- Erro nao expoe stack trace.
- Usuario consegue tentar novamente ou voltar.

## P10 - Checklist final de release

- [ ] Landing e rotas publicas testadas.
- [ ] Google login testado com conta nova e conta existente.
- [ ] E-mail/senha, confirmacao e recuperacao testados.
- [ ] Cadastro creator testado com sucesso e erros.
- [ ] Cadastro empresa testado com sucesso e erros.
- [ ] Moderacao aprovar/corrigir testada para creator e empresa.
- [ ] Estados pendente, correcao, aprovado, suspenso e bloqueado testados.
- [ ] Catalogo de empresa aprovado testado.
- [ ] Visao de creator aprovado testada.
- [ ] Contato via WhatsApp/e-mail/social testado com e sem consentimento.
- [ ] Edicao de perfil e upload de midia testados.
- [ ] Backoffice: fila, contas, dashboard, patrocinio, e-mails e auditoria
      testados.
- [ ] Permissoes negativas testadas sem login, nao admin e status nao aprovado.
- [ ] Mobile e teclado testados nas telas criticas.
- [ ] Evidencias salvas fora do repositorio, sem dados sensiveis.
