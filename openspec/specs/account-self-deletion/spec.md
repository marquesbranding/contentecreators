# account-self-deletion Specification

## Purpose

TBD - created by archiving change add-self-service-account-deletion. Update Purpose after archive.

## Requirements

### Requirement: Authenticated user can request deletion of their own account

A área autenticada SHALL oferecer, em `/app/profile`, a ação "Excluir minha conta" para creators e empresas, em qualquer status exceto o de conta banida. A tela MUST explicar em pt-BR o que será removido, o que será retido e por quanto tempo, e o prazo máximo de eliminação definido na Política de Privacidade.

#### Scenario: Creator abre a zona de exclusão

- **WHEN** um creator aprovado abre `/app/profile`
- **THEN** vê a seção "Excluir conta" com a explicação e o botão de iniciar a exclusão

#### Scenario: Conta banida

- **WHEN** uma conta banida acessa o perfil
- **THEN** a exclusão não é oferecida e a tela indica o canal de contato

### Requirement: Deletion requires reauthentication and explicit confirmation

A solicitação SHALL exigir reautenticação (senha, ou login com Google realizado nos últimos 5 minutos) e confirmação explícita (digitar "EXCLUIR" e marcar a ciência de que a ação é irreversível). Sem ambas, a solicitação MUST ser recusada sem alterar a conta.

#### Scenario: Senha incorreta

- **WHEN** o usuário confirma a exclusão com senha incorreta
- **THEN** a solicitação é recusada, a conta não muda e a mensagem não revela detalhes do provedor

#### Scenario: Confirmação incompleta

- **WHEN** o usuário não digita "EXCLUIR"
- **THEN** o botão final permanece desabilitado

### Requirement: Request has immediate visible effects

Ao aceitar a solicitação, o sistema SHALL, na mesma transação auditada: registrar `deletion_requested_at` e `deletion_due_at` (no máximo 120 dias depois), retirar o perfil do catálogo, das buscas, do detalhe e da vitrine da página inicial, revogar a autorização de contato (visibilidade falsa), invalidar as sessões e impedir novo login, e enfileirar e-mail de confirmação. Nenhum outro usuário MUST conseguir ler o perfil, contatos ou mídia da conta.

#### Scenario: Perfil some para os outros usuários

- **WHEN** um creator aprovado solicita a exclusão
- **THEN** empresas aprovadas deixam de ver seu perfil no catálogo e no detalhe, e a vitrine da home deixa de exibi-lo

#### Scenario: Contato revogado

- **WHEN** a exclusão é solicitada por um creator com autorização de contato ativa
- **THEN** telefone e e-mail deixam de ser visíveis para qualquer empresa

#### Scenario: Sessão encerrada

- **WHEN** a solicitação é concluída
- **THEN** o usuário é desconectado, vai para a página de conta excluída e não consegue entrar novamente

### Requirement: User receives confirmation with deadline and contact channel

O sistema SHALL enviar e-mail ao endereço da conta informando que a conta pode ser recuperada em até 30 dias pelo canal de contato, com a data limite de eliminação, o que é retido por obrigação legal e o canal de contato da Política. Falha no envio MUST ser retentada pelo mecanismo existente de e-mails sem desfazer a exclusão.

#### Scenario: E-mail enviado

- **WHEN** a exclusão é aceita
- **THEN** existe uma mensagem transacional pendente de envio com data limite e canal de contato

### Requirement: Backoffice lists accounts pending elimination

O backoffice SHALL listar contas com exclusão solicitada, exibindo data da solicitação, fim da janela de recuperação, data limite e estado da rotina.

#### Scenario: Admin consulta

- **WHEN** um admin filtra por "Exclusão solicitada"
- **THEN** vê a conta com data de solicitação, fim da janela de 30 dias, `deletion_due_at` e estado

### Requirement: Administrator can recover an account within 30 days

Na tela da conta, o backoffice SHALL oferecer "Recuperar conta" enquanto a janela de 30 dias não tiver terminado, exigindo motivo obrigatório e registrando a ação em auditoria. A recuperação SHALL limpar os campos de exclusão, restaurar o perfil ao estado anterior à solicitação, reabilitar o login e notificar o usuário por e-mail. A autorização de contato MUST permanecer revogada até o usuário autorizar novamente. Após a janela, a ação MUST NOT estar disponível.

#### Scenario: Recuperação dentro da janela

- **WHEN** um admin recupera, com motivo, uma conta com exclusão solicitada há 10 dias
- **THEN** o usuário volta a conseguir entrar, o perfil volta ao estado anterior e a auditoria registra admin, motivo e data

#### Scenario: Contato continua revogado

- **WHEN** uma conta com autorização de contato é recuperada
- **THEN** as visibilidades de contato continuam falsas até o usuário autorizar de novo

#### Scenario: Sem motivo

- **WHEN** um admin tenta recuperar sem informar motivo
- **THEN** a operação é recusada

#### Scenario: Janela encerrada

- **WHEN** passaram mais de 30 dias da solicitação
- **THEN** "Recuperar conta" não é oferecida e a função recusa a operação

#### Scenario: Perfil já arquivado antes da solicitação

- **WHEN** uma conta cujo perfil já estava arquivado por outro motivo é recuperada
- **THEN** o perfil continua arquivado
