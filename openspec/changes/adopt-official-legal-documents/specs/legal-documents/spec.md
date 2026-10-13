## ADDED Requirements

### Requirement: Public pages publish the official legal documents

O sistema SHALL servir o texto integral dos Termos de Uso em `/terms` e da Política de Privacidade em `/privacy`, sem autenticação, com número de versão, data de atualização, identificação da Marques Branding Ltda (CNPJ 41.308.988/0001-38), elaboração jurídica e signatário conforme o documento oficial. As páginas MUST NOT exibir aviso de conteúdo preliminar ou de lançamento bloqueado.

#### Scenario: Visitante abre os Termos

- **WHEN** um visitante anônimo acessa `/terms`
- **THEN** a página mostra "Termos de Uso da Contente Creators", versão 1.0, atualização em 01/10/2026 e os 13 capítulos oficiais

#### Scenario: Visitante abre a Política

- **WHEN** um visitante anônimo acessa `/privacy`
- **THEN** a página mostra a Política com versão 1.0, o resumo, os 13 capítulos e as tabelas de dados, finalidades/bases legais e retenção

#### Scenario: Sem aviso de placeholder

- **WHEN** qualquer das duas páginas é renderizada
- **THEN** não existe o texto "Conteúdo preliminar" nem lista de pendências

### Requirement: Legal pages are navigable and accessible

As páginas SHALL oferecer índice de capítulos com âncoras, âncoras estáveis por item numerado (ex.: item 4.3), tabelas semânticas com cabeçalhos associados, hierarquia de títulos válida, layout legível a partir de 320px e navegação por teclado. As páginas SHALL ser indexáveis por buscadores.

#### Scenario: Referência cruzada para item

- **WHEN** o usuário abre `/terms#item-4-3`
- **THEN** a página rola até o item 4.3 e o item fica visível e focável

#### Scenario: Tabela em tela estreita

- **WHEN** `/privacy` é aberta em viewport de 320px
- **THEN** as tabelas permanecem legíveis sem rolagem horizontal da página

### Requirement: Legal content is versioned and hash-verified

Cada documento SHALL ter conteúdo versionado no repositório e um registro em `legal_documents` com `version_label`, `published_at`, `active_from` e `content_hash` igual ao SHA-256 do conteúdo canônico. Conteúdo de versão publicada MUST NOT ser editado; mudança de texto SHALL criar nova versão.

#### Scenario: Hash confere

- **WHEN** a suíte de testes roda
- **THEN** o hash registrado para TERMS 1.0 e PRIVACY 1.0 é igual ao hash calculado do conteúdo do repositório

#### Scenario: Edição de versão publicada

- **WHEN** o texto de uma versão publicada é alterado sem nova versão
- **THEN** o teste de hash falha

### Requirement: Active version resolution

O sistema SHALL tratar como vigente, por tipo, o documento sem `retired_at` com `active_from` ≤ agora e maior `active_from`. Documentos placeholder MUST NOT ficar ativos em ambientes hospedados.

#### Scenario: Nova versão publicada

- **WHEN** versão 1.1 de PRIVACY alcança `active_from`
- **THEN** novos aceites referenciam 1.1 e aceites anteriores continuam ligados à 1.0

#### Scenario: Placeholder em ambiente hospedado

- **WHEN** a migration de publicação é aplicada
- **THEN** linhas `LOCAL-PLACEHOLDER-*` existentes recebem `retired_at`
