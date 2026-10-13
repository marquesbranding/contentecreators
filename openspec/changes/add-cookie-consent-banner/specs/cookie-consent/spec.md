## ADDED Requirements

### Requirement: Banner asks for advertising and measurement consent on first visit

O site SHALL exibir, em qualquer rota e na primeira visita sem escolha válida, um banner de cookies com os botões "Aceitar" e "Recusar" de mesmo destaque visual e um link para o aviso `/cookies`. Nenhuma opção SHALL vir pré-selecionada. O banner MUST NOT impedir o uso do site nem do cadastro.

#### Scenario: Primeira visita

- **WHEN** um visitante sem cookie `cc_cookie_consent` abre qualquer página
- **THEN** o banner aparece com "Aceitar", "Recusar" e link "Aviso de cookies"

#### Scenario: Uso sem escolher

- **WHEN** o visitante ignora o banner e navega ou se cadastra
- **THEN** o site funciona normalmente e nenhuma tag de publicidade ou medição é carregada

### Requirement: Essential cookies need no consent

Cookies e armazenamento estritamente necessários (sessão, autenticação, escolha de cookies, segurança, `cc_signup_email`) SHALL funcionar independentemente da escolha e MUST ser descritos no aviso como essenciais.

#### Scenario: Visitante recusa

- **WHEN** o visitante clica em "Recusar" e depois faz login
- **THEN** o login funciona e apenas cookies essenciais existem

### Requirement: Choice is persisted, versioned and expires

A escolha SHALL ser gravada no cookie `cc_cookie_consent` com versão da lista de tecnologias, decisão, data e validade de 12 meses (`SameSite=Lax`, `Secure` em produção). Escolha ausente, expirada ou de versão anterior MUST reabrir o banner.

#### Scenario: Escolha lembrada

- **WHEN** o visitante aceita e volta no dia seguinte
- **THEN** o banner não aparece e o estado "aceito" é aplicado já na renderização inicial

#### Scenario: Lista de tecnologias muda

- **WHEN** a versão do registro de cookies é incrementada
- **THEN** visitantes com a versão anterior veem o banner novamente

### Requirement: Visitor can change or revoke the choice at any time

Rodapés do site e da área autenticada SHALL ter o controle "Preferências de cookies", que reabre o painel com a opção "Publicidade e medição" (ativada ou não conforme a escolha atual) e botão de salvar. Revogar SHALL parar o envio de eventos, remover os cookies de publicidade e medição acessíveis ao domínio e descarregar as tags.

#### Scenario: Revogação

- **WHEN** um visitante que aceitou desativa "Publicidade e medição" e salva
- **THEN** o cookie de consentimento passa a `ads=false`, `_fbp`, `_fbc`, `_ga*` e `_gcl_*` do domínio são removidos e nenhuma nova requisição a Google/Meta é feita

### Requirement: Banner is accessible and responsive

O banner e o painel SHALL ser operáveis por teclado, ter nome acessível, contraste AA, foco visível e não prender o foco, e SHALL funcionar em 320px sem rolagem horizontal.

#### Scenario: Teclado

- **WHEN** o usuário navega por Tab
- **THEN** alcança "Aceitar", "Recusar" e o link do aviso, e Escape não grava escolha

#### Scenario: Tela estreita

- **WHEN** o banner é aberto em 320px
- **THEN** todo o texto e os botões ficam visíveis sem rolagem horizontal
