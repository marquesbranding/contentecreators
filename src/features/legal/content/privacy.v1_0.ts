import type { LegalDocument } from "@/features/legal/types/legal-document.types";

export const privacyV1_0: LegalDocument = {
  documentType: "PRIVACY",
  title: "Política de Privacidade e Proteção de Dados da Contente Creators",
  versionLabel: "1.0",
  publishedOn: "2026-10-01",
  updatedLabel: "01/10/2026",
  intro: [
    "Que bom ter você na Contente Creators!",
    "Esta Política explica como a Marques Branding Ltda trata os dados pessoais na Contente Creators. Registra-se o que coletamos, para quê, com qual base legal, com quem compartilhamos, onde os dados ficam, por quanto tempo e como você exerce seus direitos.",
    "Ela vale para creators (influenciadores e UGCs), para representantes de empresas cadastradas, para visitantes do site e para quem fala com a gente pelos nossos canais.",
  ],
  summary: [
    {
      question: "Quem cuida dos dados?",
      answer: "A Marques Branding Ltda, que opera a Contente Creators",
    },
    {
      question: "O que coletamos?",
      answer:
        "Dados de cadastro e perfil que você informa, dados básicos do login com Google, registros técnicos de acesso e, se você aceitar, dados de cookies de publicidade e medição",
    },
    {
      question: "Para quê?",
      answer:
        "Criar sua conta, fazer a curadoria, exibir seu perfil a usuários aprovados e na página inicial, manter a plataforma segura, cumprir a lei e medir nossas campanhas",
    },
    {
      question: "Seus contatos",
      answer: "Telefone e e-mail só aparecem para empresas",
    },
    {
      question: "Redes sociais",
      answer:
        "Não temos acesso às suas contas nem importamos dados delas. Na curadoria, podemos consultar as páginas públicas dos perfis que você indicar",
    },
    {
      question: "Onde ficam?",
      answer:
        "Principalmente no Canadá, no Supabase. Alguns fornecedores tratam dados em outros países (capítulo 6)",
    },
    {
      question: "Seus direitos",
      answer:
        "Confirmar, acessar, corrigir, pedir a eliminação, revogar autorizações e os demais previstos na LGPD (capítulo 9)",
    },
    { question: "Contato", answer: "contato@marquesbranding.com" },
  ],
  chapters: [
    {
      number: 1,
      title: "Quem é o responsável pelos seus dados",
      blocks: [
        {
          kind: "paragraph",
          text: "A controladora dos seus dados pessoais é a MARQUES BRANDING LTDA, inscrita no CNPJ sob o nº 41.308.988/0001-38, com sede na Rua Salgado Filho, nº 394, sala 101, Edifício Europa, Centro, Joaçaba/SC, CEP 89600-000. A Contente Creators é uma marca e plataforma digital operada por ela, e não uma empresa separada.",
        },
        {
          kind: "paragraph",
          text: "A Marques Branding se enquadra como microempresa (ME), por isso, não indicou encarregado pelo tratamento de dados pessoais (Resolução CD/ANPD nº 2/2022, art. 11). O canal do capítulo 13 recebe pedidos, dúvidas e reclamações sobre dados pessoais, além das comunicações da Agência Nacional de Proteção de Dados (ANPD).",
        },
      ],
    },
    {
      number: 2,
      title: "Quais dados tratamos",
      blocks: [
        {
          kind: "table",
          caption: "Dados tratados pela Contente Creators",
          headers: ["Tipo", "Dados", "Obrigatório?"],
          rows: [
            [
              "Cadastro de creator",
              "Nome, e-mail, telefone/WhatsApp, cidade, tipo de perfil (influenciador ou UGC), se é associado à CDL e senha (quando não usar o Google)",
              "Sim",
            ],
            [
              "Cadastro de empresa",
              "Nome e CNPJ da empresa, segmento e cidade",
              "Sim",
            ],
            [
              "Perfil do creator",
              "Redes sociais e links, foto de perfil, foto de capa, nicho, descrição, métricas e outras informações que você decidir incluir",
              "Não",
            ],
            [
              "Perfil da empresa",
              "Logotipo, descrição, redes sociais e outras informações que a empresa decidir incluir",
              "Não",
            ],
            [
              "Login com Google",
              "Nome, e-mail, identificador da conta e foto, conforme as permissões que você autorizar no Google",
              "Só se você usar o Google",
            ],
            [
              "Declaração de idade",
              "Ao se cadastrar, você confirma que tem 18 anos ou mais",
              "Sim",
            ],
            [
              "Registros técnicos",
              "Endereço IP, data e hora de acesso, porta lógica de origem, tipo de navegador e de dispositivo e dados de sessão e autenticação",
              "Gerados pelo uso",
            ],
            [
              "Cookies de publicidade e medição",
              "Identificadores do navegador, páginas visitadas e ações no site, como a conclusão do cadastro",
              "Só se você aceitar",
            ],
            [
              "Atendimento e denúncias",
              "O que você nos enviar por e-mail, telefone ou WhatsApp, inclusive denúncias sobre perfis e conteúdos",
              "Conforme o pedido",
            ],
          ],
        },
        {
          kind: "paragraph",
          text: "Não pedimos dados pessoais sensíveis, como informações sobre saúde, religião, origem racial ou étnica ou opinião política. Evite incluí-los na descrição do perfil.",
        },
        {
          kind: "paragraph",
          text: "Se você incluir no perfil dados ou imagens de outras pessoas, precisa ter autorização delas (Termos de Uso, item 7.1).",
        },
      ],
    },
    {
      number: 3,
      title: "Como coletamos",
      blocks: [
        {
          kind: "paragraph",
          text: "Com você, quando se cadastra, preenche o perfil, autoriza recursos opcionais ou fala com a gente.",
        },
        {
          kind: "paragraph",
          text: "Com o Google, se você entrar com a conta Google. Recebemos apenas os dados básicos de autenticação mostrados na tela de permissões do Google.",
        },
        {
          kind: "paragraph",
          text: "Nas páginas públicas que você indicar, durante a curadoria. Nossa equipe pode visitar os perfis públicos de redes sociais informados no cadastro para conferir a consistência das informações e registra apenas o resultado da análise.",
        },
        {
          kind: "paragraph",
          text: "Automaticamente, quando você acessa o site. São os registros técnicos necessários para o login, a segurança e o cumprimento da lei.",
        },
        {
          kind: "paragraph",
          text: "Por cookies de publicidade e medição, somente se você aceitar (capítulo 11).",
        },
        {
          kind: "paragraph",
          text: "Não temos acesso às suas contas em redes sociais, como Instagram, Facebook ou TikTok, e não importamos dados delas por integração. As métricas do seu perfil são as que você mesmo informa.",
        },
      ],
    },
    {
      number: 4,
      title: "Para que usamos seus dados",
      blocks: [
        {
          kind: "table",
          caption: "Finalidades, dados usados e bases legais (LGPD)",
          headers: ["Finalidade", "Dados usados", "Base legal (LGPD)"],
          rows: [
            [
              "Criar e manter sua conta e permitir o login",
              "Cadastro, login com Google e registros técnicos",
              "Execução de contrato (art. 7º, V)",
            ],
            [
              "Fazer a curadoria do cadastro, inclusive com consulta às páginas públicas dos perfis indicados",
              "Cadastro, perfil e páginas públicas indicadas",
              "Execução de contrato e de procedimentos preliminares (art. 7º, V)",
            ],
            [
              "Exibir seu perfil a usuários aprovados e permitir buscas por filtros",
              "Perfil e cidade",
              "Execução de contrato (art. 7º, V)",
            ],
            [
              "Exibir seu perfil na vitrine da página inicial do site",
              "Nome, foto de perfil e nicho",
              "Consentimento (art. 7º, I)",
            ],
            [
              "Mostrar seus canais de contato a empresas aprovadas",
              "Telefone/WhatsApp e e-mail",
              "Consentimento (art. 7º, I e § 5º)",
            ],
            [
              "Exibir o perfil das empresas aprovadas aos creators",
              "Perfil da empresa",
              "Execução de contrato (art. 7º, V) e, quanto aos dados do representante, legítimo interesse (art. 7º, IX)",
            ],
            [
              "Gerenciar a conta da empresa e falar com seu representante",
              "Dados do representante",
              "Legítimo interesse (art. 7º, IX)",
            ],
            [
              "Enviar avisos sobre a conta, a curadoria e mudanças nos documentos",
              "Nome e e-mail",
              "Execução de contrato (art. 7º, V)",
            ],
            [
              "Enviar novidades da Contente por e-mail, com descadastro em cada mensagem",
              "Nome e e-mail",
              "Legítimo interesse (art. 7º, IX, e art. 10, I)",
            ],
            [
              "Medir campanhas e exibir anúncios da Contente em outros sites e redes",
              "Dados de cookies de publicidade e medição",
              "Consentimento (art. 7º, I)",
            ],
            [
              "Proteger a plataforma e prevenir fraudes e usos indevidos",
              "Registros técnicos e da plataforma",
              "Legítimo interesse (art. 7º, IX)",
            ],
            [
              "Receber e apurar denúncias e moderar conteúdos",
              "Dados da denúncia, do denunciante e do perfil denunciado",
              "Legítimo interesse e exercício regular de direitos (art. 7º, IX e VI)",
            ],
            [
              "Guardar registros de acesso por 6 meses",
              "IP, data, hora e porta lógica de origem",
              "Obrigação legal (art. 7º, II; Marco Civil da Internet, art. 15)",
            ],
            [
              "Comprovar aceites, autorizações e decisões da curadoria e nos defender em processos",
              "Registros da plataforma",
              "Obrigação legal e exercício regular de direitos (art. 7º, II e VI)",
            ],
            [
              "Responder a atendimentos e a pedidos sobre seus dados",
              "Dados do atendimento",
              "Execução de contrato, legítimo interesse, para quem não tem conta, e obrigação legal (art. 7º, V, IX e II)",
            ],
          ],
        },
        {
          kind: "paragraph",
          text: "Os dados obrigatórios do capítulo 2 são necessários para criar a conta e usar a plataforma. Sem eles, não conseguimos prestar o serviço. Os dados opcionais e as autorizações pedidas em caixa própria podem ser recusados sem prejuízo do cadastro. Seus direitos estão no capítulo 9.",
        },
        {
          kind: "paragraph",
          text: "Quando usamos o legítimo interesse, avaliamos antes se o tratamento é necessário e se respeita suas expectativas e seus direitos. Você pode se opor a esses tratamentos pelo canal do capítulo 13. O descadastro de e-mails promocionais vale sempre, sem necessidade de justificativa.",
        },
        {
          kind: "paragraph",
          text: "A aprovação ou a recusa do cadastro e a suspensão ou o encerramento de contas são decididos por pessoas.",
        },
        {
          kind: "paragraph",
          text: "Marcar a caixa da Política no cadastro registra que você teve acesso a estas informações.",
        },
        {
          kind: "paragraph",
          text: "Não usamos seu nome, sua imagem ou seu conteúdo em anúncios, redes sociais ou materiais da Contente fora da plataforma sem sua autorização específica.",
        },
      ],
    },
    {
      number: 5,
      title: "Com quem compartilhamos",
      blocks: [
        {
          kind: "paragraph",
          text: "Não vendemos dados pessoais e compartilhamos dados somente nas hipóteses abaixo, limitados ao necessário para cada finalidade.",
        },
        { kind: "subheading", number: "5.1", text: "Usuários aprovados" },
        {
          kind: "paragraph",
          text: "Seu perfil fica visível para empresas e creators aprovados, na área restrita da plataforma e na vitrine da página inicial do site. Da mesma forma, os creators aprovados veem o perfil das empresas aprovadas.",
        },
        {
          kind: "subheading",
          number: "5.2",
          text: "Vitrine da página inicial",
        },
        {
          kind: "paragraph",
          text: "Seu nome, sua foto de perfil e seu nicho podem aparecer na página inicial do site, aberta ao público. Telefone e e-mail nunca aparecem na página inicial.",
        },
        {
          kind: "paragraph",
          text: "Cópias feitas por terceiros ou mantidas por buscadores depois da retirada não estão sob nosso controle. Nesse caso, você pode pedir a remoção diretamente a eles.",
        },
        {
          kind: "subheading",
          number: "5.3",
          text: "Empresas, com a sua autorização de contato",
        },
        {
          kind: "paragraph",
          text: "No cadastro, há uma caixa separada em que você pode autorizar empresas aprovadas a ver seus canais de contato, telefone/WhatsApp e e-mail, para falar com você sobre oportunidades. Essa autorização:",
          bullets: [
            "É opcional: você decide livremente;",
            "Começa desmarcada: só vale se você marcar;",
            "Tem uma única finalidade: permitir que empresas aprovadas falem com você sobre oportunidades de parceria;",
            "Não se confunde com o cadastro: aceitar os Termos de Uso e esta Política não autoriza o compartilhamento dos seus contatos;",
          ],
        },
        {
          kind: "subheading",
          number: "5.4",
          text: "Fornecedores que tratam dados em nosso nome",
        },
        {
          kind: "paragraph",
          text: "Contamos com fornecedores que tratam dados em nosso nome, sob nossas instruções e com contrato (operadores). Eles só podem usar os dados para prestar o serviço contratado:",
          bullets: [
            "Supabase (Supabase Pte. Ltd., Singapura): banco de dados, autenticação e armazenamento de arquivos (capítulo 6).",
          ],
        },
        {
          kind: "paragraph",
          text: "Esses fornecedores somente poderão acessar e tratar os dados pessoais estritamente necessários à prestação dos serviços contratados, permanecendo sujeitos às nossas instruções e às obrigações legais e contratuais de proteção de dados.",
        },
        {
          kind: "subheading",
          number: "5.5",
          text: "Empresas que tratam dados por conta própria",
        },
        {
          kind: "paragraph",
          text: "Algumas empresas recebem dados e os tratam como controladoras, para finalidades próprias e conforme as próprias políticas de privacidade:",
          bullets: [
            "Google, no login com Google;",
            "Google e Meta, nas tecnologias de publicidade e medição, somente se você aceitar (capítulo 11);",
            "WhatsApp, quando você fala com a gente por esse aplicativo.",
          ],
        },
        {
          kind: "paragraph",
          text: "Isso não afasta as responsabilidades da Marques Branding previstas na LGPD.",
        },
        {
          kind: "subheading",
          number: "5.6",
          text: "Assessores profissionais e autoridades",
        },
        {
          kind: "paragraph",
          text: "Podemos compartilhar dados com prestadores de serviços profissionais, como contabilidade e advocacia, quando necessário para cumprir obrigações legais ou defender direitos, sob dever de sigilo.",
        },
        {
          kind: "paragraph",
          text: "Também podemos compartilhar dados para cumprir a lei, ordem judicial ou requisição de autoridade competente. Registros de acesso a aplicações só são fornecidos a terceiros por ordem judicial, nos termos do Marco Civil da Internet. Dados cadastrais podem ser requisitados por autoridades administrativas que tenham competência legal para isso.",
        },
        { kind: "subheading", number: "5.7", text: "Mudança na operação" },
        {
          kind: "paragraph",
          text: "Se a operação da Contente passar a outra empresa, como em reorganização societária ou na criação de empresa própria para a marca, os dados poderão ser transferidos a ela, que assumirá os compromissos desta Política.",
        },
      ],
    },
    {
      number: 6,
      title: "Onde seus dados ficam e transferência internacional",
      blocks: [
        {
          kind: "paragraph",
          text: "Os dados da plataforma ficam armazenados no Supabase, em servidores no Canadá. O serviço é contratado com a Supabase Pte. Ltd., com sede em Singapura, que usa suboperadores em outros países, principalmente nos Estados Unidos, para suporte, segurança, monitoramento e infraestrutura. A lista de suboperadores é publicada pelo próprio Supabase.",
        },
        {
          kind: "paragraph",
          text: "Por isso, há transferência internacional de dados.",
        },
        {
          kind: "paragraph",
          text: "Canadá, Singapura e Estados Unidos não têm, na data desta versão, decisão de adequação da ANPD. Por isso, a transferência ao Supabase segue as cláusulas-padrão contratuais aprovadas pela ANPD, incorporadas sem alterações ao contrato com o fornecedor (LGPD, art. 33, II, “b”; Resolução CD/ANPD nº 19/2024).",
        },
        {
          kind: "paragraph",
          text: "Essas cláusulas obrigam o fornecedor a respeitar os princípios, os direitos dos titulares e as regras de proteção da LGPD, inclusive em relação aos seus suboperadores, sob fiscalização da ANPD.",
        },
        {
          kind: "paragraph",
          text: "Sobre essa transferência:",
          bullets: [
            "Forma: armazenamento em nuvem e acesso remoto pelo fornecedor e por seus suboperadores;",
            "Finalidade: hospedar e operar a plataforma (banco de dados, login e arquivos);",
            "Duração: enquanto os dados forem guardados, conforme o capítulo 8;",
            "Uso compartilhado: o Supabase não pode usar os dados para finalidades próprias; os demais compartilhamentos estão no capítulo 5;",
            "Responsabilidades: a Marques Branding, como controladora, atende os titulares e comunica incidentes; o Supabase, como operador, trata os dados conforme nossas instruções e as cláusulas e adota as medidas de segurança nelas previstas;",
            "Seus direitos: os do capítulo 9, pelo canal do capítulo 13, inclusive o de receber a íntegra das cláusulas usadas, em até 15 dias do pedido, ressalvados os segredos comercial e industrial, e o de peticionar contra a Marques Branding perante a ANPD.",
          ],
        },
        {
          kind: "paragraph",
          text: "Outros fornecedores do item 5.4 que tratem dados fora do Brasil seguirão um dos mecanismos do art. 33 da LGPD, informado nesta Política.",
        },
        {
          kind: "paragraph",
          text: "Nas tecnologias de publicidade e medição, Google e Meta tratam os dados em seus próprios servidores, que podem estar fora do Brasil, apenas se você aceitar os cookies (capítulo 11).",
        },
      ],
    },
    {
      number: 7,
      title: "Segurança",
      blocks: [
        {
          kind: "paragraph",
          text: "Adotamos medidas técnicas e administrativas compatíveis com os riscos do tratamento para proteger seus dados contra acessos não autorizados, perda, alteração e vazamento (LGPD, art. 46).",
        },
        {
          kind: "paragraph",
          text: "Nenhum sistema é totalmente imune a falhas e, se ocorrer incidente de segurança que possa causar risco ou dano relevante aos titulares, vamos comunicá-lo à ANPD e às pessoas afetadas, nos prazos e na forma da regulamentação da ANPD, e adotar medidas para reduzir seus efeitos.",
        },
        {
          kind: "paragraph",
          text: "Você também ajuda quando usa uma senha forte e exclusiva, não a compartilha e avisa pelo canal do capítulo 13 se notar acesso indevido à sua conta.",
        },
      ],
    },
    {
      number: 8,
      title: "Por quanto tempo guardamos",
      blocks: [
        {
          kind: "table",
          caption: "Prazos de guarda dos dados",
          headers: ["Dados", "Prazo"],
          rows: [
            ["Conta e perfil", "Enquanto sua conta existir"],
            [
              "Dados da conta após a exclusão",
              "Eliminados em até 120 dias, salvo os casos abaixo",
            ],
            [
              "Perfil na vitrine da página inicial",
              "Retirado após a exclusão da conta",
            ],
            [
              "Cadastros não aprovados",
              "Eliminados em até 90 dias após a comunicação da recusa, se não houver pedido de nova análise",
            ],
            [
              "Registros de acesso",
              "6 meses, ou mais se houver requisição de autoridade ou ordem judicial (Marco Civil da Internet, art. 15)",
            ],
            [
              "Cookies de publicidade e medição",
              "Conforme o prazo informado no aviso de cookies",
            ],
            [
              "Cópias de segurança",
              "Eliminadas no ciclo normal de substituição",
            ],
          ],
        },
        {
          kind: "paragraph",
          text: "Nesses casos, guardamos só o necessário para a finalidade que justifica a guarda. Depois dos prazos, os dados são eliminados ou anonimizados.",
        },
        {
          kind: "paragraph",
          text: "Para excluir sua conta, utilize a opção dentro da plataforma ou use o canal do capítulo 13.",
        },
      ],
    },
    {
      number: 9,
      title: "Seus direitos",
      blocks: [
        {
          kind: "paragraph",
          text: "A LGPD (arts. 18 a 20) garante a você o direito de:",
          bullets: [
            "Confirmar se tratamos seus dados e acessá-los;",
            "Corrigir dados incompletos, inexatos ou desatualizados;",
            "Pedir a anonimização, o bloqueio ou a eliminação de dados desnecessários, excessivos ou tratados em desacordo com a lei;",
            "Pedir a portabilidade dos seus dados, conforme a regulamentação da ANPD;",
            "Pedir a eliminação dos dados tratados com base no seu consentimento, ressalvadas as hipóteses de guarda previstas na lei;",
            "Saber com quem compartilhamos seus dados;",
            "Saber que pode não dar consentimento e o que acontece nesse caso;",
            "Revogar o consentimento;",
            "Se opor a tratamento feito com outra base legal, se houver descumprimento da LGPD;",
            "Pedir a revisão de decisão tomada unicamente com base em tratamento automatizado que afete seus interesses, se isso vier a ocorrer.",
          ],
        },
        {
          kind: "paragraph",
          text: "Você pode editar seu perfil, revogar as autorizações e excluir a conta na própria plataforma. Para os demais pedidos, use o canal do capítulo 13.",
        },
        {
          kind: "paragraph",
          text: "Para proteger seus dados, podemos pedir informações que confirmem sua identidade ou, se o pedido for feito por representante, o documento que comprove a representação. O atendimento é gratuito. Respondemos em até 15 dias do pedido, com a confirmação e, se você pedir, a declaração completa, com a origem dos dados, os critérios e a finalidade do tratamento, ressalvados os segredos comercial e industrial.",
        },
        {
          kind: "paragraph",
          text: "Se não pudermos atender algum pedido, no todo ou em parte, explicaremos o motivo, como uma obrigação legal de guarda. Se os dados forem tratados por outra empresa, indicaremos quem é, sempre que possível.",
        },
      ],
    },
    {
      number: 10,
      title: "Crianças e adolescentes",
      blocks: [
        {
          kind: "paragraph",
          text: "A Contente Creators é destinada apenas a maiores de 18 anos, inclusive para emancipados (Termos de Uso, item 2.2). A plataforma não é direcionada a crianças e adolescentes, e não coletamos intencionalmente dados deles.",
        },
        {
          kind: "paragraph",
          text: "No cadastro, você declara ter 18 anos ou mais, e a curadoria recusa perfis com indícios de que o titular é menor de idade.",
        },
        {
          kind: "paragraph",
          text: "Se houver indício depois da aprovação, a conta poderá ser suspensa, e poderemos pedir comprovação de idade, usada só para essa finalidade e descartada logo após a conferência. Confirmada a menoridade, a conta será encerrada e os dados serão eliminados, ressalvada a guarda exigida por lei.",
        },
        {
          kind: "paragraph",
          text: "Pais ou responsáveis que souberem de uma conta assim, e qualquer pessoa que identificar conteúdo que viole direitos de crianças ou adolescentes, podem nos avisar pelo canal do capítulo 13.",
        },
      ],
    },
    {
      number: 11,
      title: "Cookies e tecnologias semelhantes",
      blocks: [
        {
          kind: "paragraph",
          text: "Essenciais. Usamos cookies e armazenamento local do navegador para manter você conectado, guardar suas escolhas sobre cookies e proteger a plataforma. Essas tecnologias não dependem de consentimento e se baseiam na execução do contrato e no legítimo interesse (LGPD, art. 7º, V e IX). Você pode bloqueá-las no navegador, mas o login pode deixar de funcionar.",
        },
        {
          kind: "paragraph",
          text: "Publicidade e medição. Se você aceitar no aviso de cookies, usamos tecnologias do Google (Google Ads) e da Meta (Meta Pixel) para medir o resultado das nossas campanhas e exibir anúncios da Contente em outros sites e redes sociais. Elas registram, por exemplo, as páginas visitadas e a conclusão do cadastro, associadas a identificadores do navegador. A base legal é o consentimento (LGPD, art. 7º, I).",
        },
        {
          kind: "paragraph",
          text: "Essas tecnologias ficam desativadas até que você aceite. Recusar não impede o uso da plataforma. A lista das tecnologias, com fornecedor, finalidade e prazo, está no aviso de cookies.",
        },
        {
          kind: "paragraph",
          text: "Google e Meta podem tratar esses dados fora do Brasil e, para as finalidades próprias deles, seguem as próprias políticas de privacidade (item 5.5).",
        },
      ],
    },
    {
      number: 12,
      title: "Mudanças nesta Política",
      blocks: [
        {
          kind: "paragraph",
          text: "Esta Política pode ser atualizada para acompanhar mudanças na plataforma ou na lei. A versão e a data ficam no topo, e as versões anteriores podem ser pedidas pelo canal do capítulo 13.",
        },
        {
          kind: "paragraph",
          text: "Mudanças relevantes, como novas finalidades, novas categorias de destinatários ou a troca do controlador, serão avisadas com destaque e antecedência razoável, por e-mail ou na plataforma, salvo quando a mudança decorrer de exigência legal ou de autoridade com prazo menor. Se a mudança afetar tratamento baseado no seu consentimento, você será informado antes e poderá revogá-lo.",
        },
      ],
    },
    {
      number: 13,
      title: "Fale com a gente",
      blocks: [
        {
          kind: "paragraph",
          text: "Para dúvidas, pedidos sobre seus dados, exercício dos seus direitos e denúncias:",
          bullets: [
            "E-mail: contato@marquesbranding.com",
            "WhatsApp: (48) 99932-6846",
            "Responsável: Marques Branding Ltda, CNPJ 41.308.988/0001-38, Rua Salgado Filho, nº 394, sala 101, Edifício Europa, Centro, Joaçaba/SC, CEP 89600-000.",
          ],
        },
        {
          kind: "paragraph",
          text: "Pedidos sobre dados pessoais podem ser feitos por qualquer desses canais. Pelo e-mail, o registro do pedido é mais simples.",
        },
      ],
    },
  ],
  closing: [
    "Última atualização em 01 de outubro de 2026",
    "Marques Branding Ltda, CNPJ 41.308.988/0001-38",
    "Elaboração jurídica: Candeia & Leorato Advogados",
    "Assinado por Pedro Henrique Costa Coppini, OAB/SC 78.001",
  ],
};
