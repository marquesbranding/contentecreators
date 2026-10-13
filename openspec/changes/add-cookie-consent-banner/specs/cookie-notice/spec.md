## ADDED Requirements

### Requirement: Public cookie notice lists every technology

`/cookies` SHALL ser pública e listar, em tabela, cada cookie ou tecnologia com: nome, fornecedor, finalidade, categoria (essencial ou publicidade e medição) e prazo. A página MUST ser gerada do mesmo registro que define a versão do consentimento e SHALL indicar a versão e a data da lista, citar a Política de Privacidade e informar como bloquear cookies no navegador.

#### Scenario: Visitante abre o aviso

- **WHEN** um visitante acessa `/cookies`
- **THEN** vê as tabelas de essenciais (sessão, autenticação, escolha de cookies, `cc_signup_email`) e de publicidade e medição (Google Ads, Meta Pixel) com fornecedor, finalidade e prazo

#### Scenario: Lista e banner em sincronia

- **WHEN** um item é adicionado ao registro de tecnologias
- **THEN** a página `/cookies` o mostra e a versão do consentimento exige novo incremento no teste

### Requirement: Notice offers access to preferences

A página SHALL conter o controle "Preferências de cookies" para alterar a escolha.

#### Scenario: Alterar pelo aviso

- **WHEN** o visitante aciona "Preferências de cookies" em `/cookies`
- **THEN** o painel de preferências abre com a escolha atual
