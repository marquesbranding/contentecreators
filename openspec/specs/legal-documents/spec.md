# legal-documents Specification

## Purpose

Publish the official Terms of Use and Privacy Policy as versioned, hash-verified PDFs.

## Requirements

### Requirement: Public pages show the official PDFs

O sistema SHALL servir os PDFs oficiais assinados dos Termos de Uso em `/terms` e da Política de Privacidade em `/privacy`, sem autenticação, exibindo o PDF embutido na própria página, com versão e data de atualização, e oferecendo as ações "Baixar PDF" e "Abrir em nova aba". As páginas MUST NOT exibir aviso de conteúdo preliminar ou de lançamento bloqueado.

#### Scenario: Visitante lê os Termos

- **WHEN** um visitante anônimo acessa `/terms`
- **THEN** a página mostra "Termos de Uso", versão 1.0, atualização em 01/10/2026 e o PDF oficial embutido

#### Scenario: Visitante baixa a Política

- **WHEN** o visitante aciona "Baixar PDF" em `/privacy`
- **THEN** o navegador baixa o PDF oficial da Política v1.0

#### Scenario: Navegador sem visualizador de PDF

- **WHEN** o navegador não renderiza PDF embutido (ex.: alguns móveis)
- **THEN** os botões "Baixar PDF" e "Abrir em nova aba" continuam visíveis acima do visualizador, com texto de apoio

#### Scenario: Sem aviso de placeholder

- **WHEN** qualquer das duas páginas é renderizada
- **THEN** não existe o texto "Conteúdo preliminar" nem lista de pendências

### Requirement: PDFs are framable only by the application itself

Os PDFs em `/legal/` SHALL ser servidos com `X-Frame-Options: SAMEORIGIN` e `X-Content-Type-Options: nosniff`, sem CSP restritiva que bloqueie o visualizador; as demais rotas MUST manter `frame-ancestors 'none'` e `X-Frame-Options: DENY`, com `frame-src 'self'`.

#### Scenario: Página legal embute o PDF

- **WHEN** `/terms` é aberta
- **THEN** o iframe do PDF carrega sem violação de CSP

#### Scenario: Terceiro tenta embutir

- **WHEN** outro domínio tenta embutir `/terms` ou o PDF
- **THEN** o navegador bloqueia o enquadramento

### Requirement: Legal files are versioned and hash-verified

Cada documento SHALL ter arquivo versionado no repositório (`public/legal/<nome>-v<versão>.pdf`) e um registro em `legal_documents` com `version_label`, `published_at`, `active_from` e `content_hash` igual ao SHA-256 dos bytes do arquivo (para CONTACT_VISIBILITY, do texto exibido). Arquivo de versão publicada MUST NOT ser substituído; mudança de texto SHALL criar nova versão e novo arquivo.

#### Scenario: Hash confere

- **WHEN** a suíte de testes roda
- **THEN** o hash do PDF de TERMS 1.0 e PRIVACY 1.0 consta nas migrations

#### Scenario: Arquivo publicado alterado

- **WHEN** um PDF publicado é substituído sem nova versão
- **THEN** o teste de hash falha

### Requirement: Active version resolution

O sistema SHALL tratar como vigente, por tipo, o documento sem `retired_at` com `active_from` ≤ agora e maior `active_from`. Documentos placeholder MUST NOT ficar ativos em ambientes hospedados.

#### Scenario: Nova versão publicada

- **WHEN** versão 1.1 de PRIVACY alcança `active_from`
- **THEN** novos aceites referenciam 1.1 e aceites anteriores continuam ligados à 1.0

#### Scenario: Placeholder em ambiente hospedado

- **WHEN** a migration de publicação é aplicada
- **THEN** linhas `LOCAL-PLACEHOLDER-*` existentes recebem `retired_at`
