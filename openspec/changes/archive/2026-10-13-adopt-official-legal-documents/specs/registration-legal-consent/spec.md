## ADDED Requirements

### Requirement: Registration requires explicit acceptance of current Terms and Privacy Policy

O formulário de cadastro (influenciador, UGC e empresa) SHALL exibir duas caixas separadas e inicialmente desmarcadas: "Li e aceito os Termos de Uso" e "Li e aceito a Política de Privacidade", cada uma com link para `/terms` e `/privacy` abrindo em nova aba. A submissão MUST ser rejeitada se qualquer uma estiver desmarcada.

#### Scenario: Caixas desmarcadas

- **WHEN** o formulário é aberto
- **THEN** ambas as caixas obrigatórias estão desmarcadas

#### Scenario: Submissão sem aceite

- **WHEN** o usuário envia com Termos desmarcado
- **THEN** a submissão é recusada com "Você precisa aceitar para continuar." no campo

### Requirement: Acceptance is recorded against the exact active document version

Ao submeter, o sistema SHALL gravar em `account_consents`, na mesma transação da submissão, um registro por documento TERMS e PRIVACY vigente (versão, hash via `legal_documents`, `accepted_at`, request id, hashes de rede e user agent), com `context.legalCopyApproved = true` quando o documento for oficial. Se faltar documento ativo, a submissão MUST falhar sem criar dados parciais.

#### Scenario: Aceite oficial

- **WHEN** um cadastro válido é submetido com versões 1.0 ativas
- **THEN** existem dois registros em `account_consents` ligados a TERMS 1.0 e PRIVACY 1.0 com `legalCopyApproved = true`

#### Scenario: Documento ativo ausente

- **WHEN** não há TERMS ativo
- **THEN** a submissão falha e nenhuma conta/consentimento parcial é persistido

### Requirement: Contact visibility authorization is optional and independent

Para influenciadores/UGC, o formulário SHALL oferecer caixa separada, desmarcada, opcional, com texto da finalidade única (permitir que empresas aprovadas vejam telefone/WhatsApp e e-mail para falar sobre oportunidades). Aceitar Termos e Política MUST NOT habilitar essa autorização. Quando marcada, o sistema SHALL gravar o consentimento ligado ao documento CONTACT_VISIBILITY vigente e só então expor contatos a empresas aprovadas.

#### Scenario: Apenas Termos e Política aceitos

- **WHEN** o creator envia sem marcar a autorização de contato
- **THEN** telefone e e-mail permanecem invisíveis para empresas

#### Scenario: Autorização marcada

- **WHEN** o creator marca a autorização e é aprovado
- **THEN** empresa aprovada vê os contatos e existe consentimento ligado a CONTACT_VISIBILITY vigente

### Requirement: Adult-only declaration

O cadastro SHALL informar que a plataforma é restrita a maiores de 18 anos e que o aceite dos Termos confirma essa condição (Termos 2.2; Política cap. 2 e 10).

#### Scenario: Texto de idade visível

- **WHEN** o usuário vê a seção "Termos e privacidade"
- **THEN** há indicação de que o uso exige 18 anos ou mais

### Requirement: Reviewers can see accepted versions

O backoffice SHALL exibir, na revisão e no detalhe da conta, tipo, versão e data de aceite de cada documento aceito.

#### Scenario: Admin abre detalhe

- **WHEN** um admin abre a conta aprovada
- **THEN** vê TERMS 1.0 e PRIVACY 1.0 com a data do aceite
