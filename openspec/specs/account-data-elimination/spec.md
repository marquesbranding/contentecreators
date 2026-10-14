# account-data-elimination Specification

## Purpose

TBD - created by archiving change add-self-service-account-deletion. Update Purpose after archive.

## Requirements

### Requirement: Elimination runs automatically before the legal deadline

Uma rotina agendada diariamente (Vercel Cron, rota `/api/cron/account-elimination`) SHALL eliminar ou anonimizar os dados de toda conta com exclusão solicitada somente depois da janela de recuperação de 30 dias e sempre antes de `deletion_due_at` (120 dias). A rotina MUST ser idempotente, processar em lotes limitados, operar em dry-run por padrão fora de produção e ser invocável apenas com segredo de servidor.

#### Scenario: Conta elegível

- **WHEN** a rotina roda e encontra conta com exclusão solicitada fora da janela de recuperação de 30 dias
- **THEN** executa a matriz de disposição e marca a conta como eliminada

#### Scenario: Conta ainda na janela de recuperação

- **WHEN** a rotina roda e a conta foi solicitada há menos de 30 dias
- **THEN** a conta não é processada

#### Scenario: Chamada sem segredo

- **WHEN** o endpoint da rotina é chamado sem `Authorization: Bearer $CRON_SECRET`
- **THEN** a chamada é recusada sem efeito

#### Scenario: Reexecução

- **WHEN** a rotina roda duas vezes sobre a mesma conta
- **THEN** a segunda execução não altera nada

### Requirement: Disposition matrix per data class is applied

A rotina SHALL aplicar, por classe de dado, exatamente uma disposição aprovada: DELETE (conta, perfil, canais, métricas, localização, nichos, preferências, rascunhos, mídia no Storage e identidade/provedores no Auth), ANONYMIZE (dados pessoais em auditoria, moderação e consentimentos, retendo apenas o mínimo para comprovar aceite) ou RETAIN (registros de acesso por 6 meses e identidade banida). Linhas protegidas por chave estrangeira MUST ser tratadas conforme a matriz, nunca por exclusão direta de histórico imutável.

#### Scenario: Dados pessoais removidos

- **WHEN** a eliminação conclui para um creator
- **THEN** não existem nome, e-mail, telefone, redes, descrição nem mídia dele no banco ou no Storage

#### Scenario: Prova de aceite preservada

- **WHEN** a eliminação conclui
- **THEN** resta registro de aceite com versão e hash do documento e data, sem dados pessoais

#### Scenario: Identidade banida

- **WHEN** a conta eliminada estava banida
- **THEN** o bloqueio por hash permanece ativo

### Requirement: Anonymization of immutable history is a dedicated audited operation

A anonimização de snapshots de auditoria e moderação SHALL ocorrer apenas por operação própria, restrita à rotina autorizada, que redige somente campos de dados pessoais listados e registra a própria execução. Atualizações ou exclusões diretas dessas tabelas por usuários, administradores ou código de aplicação MUST continuar rejeitadas.

#### Scenario: Update direto

- **WHEN** um administrador tenta editar uma revisão de auditoria
- **THEN** a operação é rejeitada

#### Scenario: Operação de anonimização

- **WHEN** a rotina anonimiza snapshots de uma conta
- **THEN** os campos pessoais são redigidos e existe revisão registrando a operação

### Requirement: Failures are visible and deadline is protected

Falha em qualquer etapa SHALL deixar a conta em estado de falha com motivo seguro, repetir com retry controlado e gerar alerta operacional; contas a 15 dias ou menos do prazo sem eliminação concluída MUST gerar alerta de prioridade alta.

#### Scenario: Falha no Storage

- **WHEN** a remoção de mídia falha
- **THEN** a conta fica em `DELETION_FAILED`, nada no Auth é apagado e há alerta

#### Scenario: Prazo próximo

- **WHEN** uma conta com exclusão pendente está a 15 dias do prazo
- **THEN** a rotina emite alerta de prioridade alta

### Requirement: Elimination is reported with evidence

Cada execução SHALL produzir relatório com contas processadas, disposição por classe, contagens e fingerprint, sem dados pessoais, e registrar o resultado em auditoria.

#### Scenario: Relatório

- **WHEN** a rotina termina um lote
- **THEN** o relatório lista contagens por classe e inclui fingerprint, sem nomes, e-mails ou caminhos de mídia
