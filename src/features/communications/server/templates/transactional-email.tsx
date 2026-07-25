import type { CSSProperties } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "react-email";

interface TransactionalEmailProps {
  actionLabel: string;
  actionUrl: string;
  body: readonly string[];
  heading: string;
  logoUrl: string;
  preview: string;
  reason?: string;
}

const colors = {
  accent: "#ff0084",
  background: "#f4f7ff",
  border: "#d9e2ff",
  brand: "#1267f6",
  muted: "#526079",
  surface: "#ffffff",
  text: "#101828",
};

export function TransactionalEmail({
  actionLabel,
  actionUrl,
  body,
  heading,
  logoUrl,
  preview,
  reason,
}: TransactionalEmailProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={brandBarStyle}>
            <Img
              alt="Contente Creators"
              height="90"
              src={logoUrl}
              style={brandLogoStyle}
              width="240"
            />
          </Section>

          <Section style={contentStyle}>
            <Heading as="h1" style={headingStyle}>
              {heading}
            </Heading>

            {body.map((paragraph) => (
              <Text key={paragraph} style={paragraphStyle}>
                {paragraph}
              </Text>
            ))}

            {reason ? (
              <Section style={reasonStyle}>
                <Text style={reasonLabelStyle}>Orientação da análise</Text>
                <Text style={reasonTextStyle}>{reason}</Text>
              </Section>
            ) : null}

            <Section style={actionStyle}>
              <Button href={actionUrl} style={buttonStyle}>
                {actionLabel}
              </Button>
            </Section>

            <Hr style={dividerStyle} />
            <Text style={supportStyle}>
              Se precisar de ajuda, use os canais oficiais de suporte exibidos
              na plataforma. Nossa equipe orientará você pelos próximos passos.
            </Text>
            <Text style={footerStyle}>
              Esta é uma mensagem transacional da Contente Creators.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: CSSProperties = {
  backgroundColor: colors.background,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  margin: 0,
  padding: "24px 12px",
};

const containerStyle: CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: "20px",
  margin: "0 auto",
  maxWidth: "600px",
  overflow: "hidden",
  width: "100%",
};

const brandBarStyle: CSSProperties = {
  backgroundColor: colors.brand,
  borderBottom: `6px solid ${colors.accent}`,
  padding: "20px 28px 16px",
};

const brandLogoStyle: CSSProperties = {
  display: "block",
  height: "90px",
  margin: 0,
  objectFit: "cover",
  width: "240px",
};

const contentStyle: CSSProperties = {
  padding: "28px",
};

const headingStyle: CSSProperties = {
  color: colors.text,
  fontSize: "28px",
  lineHeight: "1.25",
  margin: "0 0 20px",
};

const paragraphStyle: CSSProperties = {
  color: colors.text,
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 14px",
};

const reasonStyle: CSSProperties = {
  backgroundColor: "#f8faff",
  border: `1px solid ${colors.border}`,
  borderLeft: `4px solid ${colors.accent}`,
  borderRadius: "10px",
  margin: "22px 0",
  padding: "16px 18px",
};

const reasonLabelStyle: CSSProperties = {
  color: colors.muted,
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  margin: "0 0 6px",
  textTransform: "uppercase",
};

const reasonTextStyle: CSSProperties = {
  color: colors.text,
  fontSize: "16px",
  lineHeight: "1.55",
  margin: 0,
  whiteSpace: "pre-wrap",
};

const actionStyle: CSSProperties = {
  margin: "26px 0",
};

const buttonStyle: CSSProperties = {
  backgroundColor: colors.brand,
  borderRadius: "10px",
  boxSizing: "border-box",
  color: colors.surface,
  display: "inline-block",
  fontSize: "16px",
  fontWeight: 700,
  lineHeight: "1.2",
  padding: "14px 20px",
  textAlign: "center",
  textDecoration: "none",
};

const dividerStyle: CSSProperties = {
  borderColor: colors.border,
  margin: "28px 0 20px",
};

const supportStyle: CSSProperties = {
  color: colors.muted,
  fontSize: "14px",
  lineHeight: "1.55",
  margin: "0 0 10px",
};

const footerStyle: CSSProperties = {
  color: colors.muted,
  fontSize: "12px",
  lineHeight: "1.5",
  margin: 0,
};
