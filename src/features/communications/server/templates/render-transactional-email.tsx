import { render } from "react-email";

import {
  parseTransactionalEmailInput,
  type ParsedTransactionalEmailInput,
  type TransactionalEmailTemplate,
} from "../../schemas/transactional-email.schema";
import { TransactionalEmail } from "./transactional-email";

interface EmailCopy {
  actionLabel: string;
  body: readonly string[];
  heading: string;
  path: string;
  preview: string;
  subject: string;
}

const templateCopy = {
  ONBOARDING_RECEIVED: {
    actionLabel: "Acompanhar cadastro",
    body: [
      "Recebemos suas informações e seu cadastro entrou na etapa de análise.",
      "Nossa equipe fará uma avaliação manual. Você poderá acompanhar a situação pela plataforma.",
    ],
    heading: "Seu cadastro está em análise",
    path: "/app",
    preview: "Recebemos seu cadastro e iniciaremos a análise.",
    subject: "Recebemos seu cadastro",
  },
  CHANGES_REQUESTED: {
    actionLabel: "Corrigir cadastro",
    body: [
      "Analisamos seu cadastro e precisamos que algumas informações sejam ajustadas.",
      "Faça as correções indicadas e reenvie o cadastro para uma nova análise.",
    ],
    heading: "Precisamos de alguns ajustes",
    path: "/app/profile",
    preview: "Há orientações para corrigir e reenviar seu cadastro.",
    subject: "Precisamos de ajustes no seu cadastro",
  },
  APPROVED: {
    actionLabel: "Acessar a plataforma",
    body: [
      "Seu cadastro foi aprovado e seu acesso ao catálogo já está disponível.",
      "Entre na plataforma para conhecer as oportunidades de conexão.",
    ],
    heading: "Cadastro aprovado",
    path: "/app/catalog",
    preview: "Seu cadastro foi aprovado pela equipe Contente Creators.",
    subject: "Seu cadastro foi aprovado",
  },
  SUSPENDED: {
    actionLabel: "Ver situação da conta",
    body: [
      "Seu acesso à plataforma foi suspenso temporariamente após uma análise administrativa.",
      "Enquanto a suspensão estiver ativa, o catálogo e a exibição do perfil ficarão indisponíveis.",
    ],
    heading: "Acesso suspenso",
    path: "/app",
    preview: "Seu acesso à Contente Creators foi suspenso.",
    subject: "Seu acesso foi suspenso",
  },
  RESTORED: {
    actionLabel: "Voltar à plataforma",
    body: [
      "Seu acesso foi restaurado e as funcionalidades correspondentes ao seu perfil estão disponíveis novamente.",
    ],
    heading: "Acesso restaurado",
    path: "/app/catalog",
    preview: "Seu acesso à Contente Creators foi restaurado.",
    subject: "Seu acesso foi restaurado",
  },
  BANNED: {
    actionLabel: "Ver orientações",
    body: [
      "Seu acesso à plataforma foi bloqueado após uma análise administrativa.",
      "Não será possível criar outro cadastro com esta mesma identidade enquanto o bloqueio estiver ativo.",
    ],
    heading: "Acesso bloqueado",
    path: "/app",
    preview: "Seu acesso à Contente Creators foi bloqueado.",
    subject: "Seu acesso foi bloqueado",
  },
  ADMIN_PROVISIONED: {
    actionLabel: "Acessar o backoffice",
    body: [
      "Seu acesso administrativo foi provisionado pela equipe Contente Creators.",
      "Use a entrada exclusiva do backoffice e nunca compartilhe suas credenciais.",
    ],
    heading: "Acesso administrativo disponível",
    path: "/backoffice",
    preview: "Seu acesso administrativo à Contente Creators está disponível.",
    subject: "Seu acesso administrativo está disponível",
  },
} satisfies Record<TransactionalEmailTemplate, EmailCopy>;

export interface RenderedTransactionalEmail {
  actionUrl: string;
  html: string;
  subject: string;
  template: TransactionalEmailTemplate;
  text: string;
}

export async function renderTransactionalEmail(
  input: unknown,
): Promise<RenderedTransactionalEmail> {
  const parsed = parseTransactionalEmailInput(input);
  const copy = templateCopy[parsed.template];
  const actionUrl = new URL(copy.path, `${parsed.appUrl}/`).toString();
  const logoUrl = new URL(
    "/brand/official/contente-creators-blue.png",
    `${parsed.appUrl}/`,
  ).toString();
  const reason = getReason(parsed);
  const component = (
    <TransactionalEmail
      actionLabel={copy.actionLabel}
      actionUrl={actionUrl}
      body={copy.body}
      heading={copy.heading}
      logoUrl={logoUrl}
      preview={copy.preview}
      reason={reason}
    />
  );

  const [html, text] = await Promise.all([
    render(component),
    render(component, { plainText: true }),
  ]);

  return {
    actionUrl,
    html,
    subject: copy.subject,
    template: parsed.template,
    text,
  };
}

function getReason(input: ParsedTransactionalEmailInput): string | undefined {
  if (
    input.template === "CHANGES_REQUESTED" ||
    input.template === "SUSPENDED" ||
    input.template === "BANNED"
  ) {
    return input.payload.reason;
  }

  return undefined;
}
