## ADDED Requirements

### Requirement: Third-party tags load only after consent and configuration

As tags Google Ads (gtag.js) e Meta Pixel (fbevents.js) SHALL ser carregadas apenas quando `ads` for verdadeiro no consentimento válido E o respectivo ID público estiver configurado no ambiente. Antes disso, o navegador MUST NOT fazer requisição a domínios do Google Ads ou da Meta.

#### Scenario: Sem escolha

- **WHEN** o visitante carrega o site sem escolha
- **THEN** a aba Network não contém requisições a `googletagmanager.com`, `connect.facebook.net` nem `facebook.com/tr`

#### Scenario: Aceite com IDs configurados

- **WHEN** o visitante aceita em ambiente com ambos os IDs configurados
- **THEN** as duas tags são carregadas e disparam visualização de página

#### Scenario: Aceite sem IDs

- **WHEN** o visitante aceita em ambiente sem IDs
- **THEN** nenhuma tag é carregada e nenhum erro aparece no console

### Requirement: Events carry no personal data

Os eventos SHALL incluir apenas visualização de página e conclusão de cadastro, sem nome, e-mail, telefone, identificador de conta ou conteúdo de perfil.

#### Scenario: Cadastro concluído

- **WHEN** um usuário que aceitou conclui o cadastro
- **THEN** é enviado um evento de conclusão de cadastro sem dados pessoais

#### Scenario: Cadastro concluído sem aceite

- **WHEN** um usuário que recusou conclui o cadastro
- **THEN** nenhum evento é enviado

### Requirement: CSP allows third-party origins only when configured

A Content-Security-Policy SHALL incluir as origens do Google e da Meta necessárias às tags somente quando ao menos um ID de medição estiver configurado; sem IDs, as diretivas permanecem restritas a `'self'` e Supabase.

#### Scenario: Sem IDs

- **WHEN** os cabeçalhos são gerados sem IDs
- **THEN** `script-src` e `connect-src` não contêm origens do Google nem da Meta

#### Scenario: Com IDs

- **WHEN** os cabeçalhos são gerados com ambos os IDs
- **THEN** as origens necessárias aparecem em `script-src`, `connect-src` e `img-src`
