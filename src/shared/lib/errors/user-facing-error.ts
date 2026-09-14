/**
 * Turns an error from any layer (Supabase Auth/Storage, Postgres, Vercel/Next,
 * a bare network failure) into copy an end user can act on, instead of a raw
 * error object or a one-size-fits-all "something went wrong". Every branch
 * below traces back to a mapping entry in `revisao_03.md` block E1 — keep
 * this the single place that decides that mapping so the same failure reads
 * the same way everywhere it can occur.
 */

export type ErrorOperation =
  | "moderation"
  | "reset_password"
  | "resend_email"
  | "save_profile"
  | "sign_in"
  | "sign_up"
  | "upload_media"
  | "verify_code"
  | "whatsapp_contact";

export interface ErrorContext {
  operation: ErrorOperation;
  /** Included in the fallback message ("Código: {requestId8}") for support. */
  requestId?: string;
  role?: "ADMIN" | "COMPANY" | "INFLUENCER";
}

export interface UserFacingError {
  /** Stable identifier for the matched branch — lets callers special-case one (e.g. "auth.user_already_exists" opens a modal instead of showing text). */
  code: string;
  fieldErrors?: Record<string, string[]>;
  message: string;
  retryable: boolean;
  title: string;
}

const operationTitles: Record<ErrorOperation, string> = {
  moderation: "Não foi possível concluir a ação de moderação",
  resend_email: "Não foi possível reenviar o e-mail",
  reset_password: "Não foi possível alterar sua senha",
  save_profile: "Não foi possível salvar seu perfil",
  sign_in: "Não foi possível entrar na sua conta",
  sign_up: "Não foi possível criar sua conta",
  upload_media: "Não foi possível enviar a imagem",
  verify_code: "Não foi possível confirmar o código",
  whatsapp_contact: "Não foi possível registrar o contato",
};

const operationVerbs: Record<ErrorOperation, string> = {
  moderation: "concluir a ação",
  resend_email: "reenviar o e-mail",
  reset_password: "alterar sua senha",
  save_profile: "salvar seu perfil",
  sign_in: "entrar na sua conta",
  sign_up: "enviar o cadastro",
  upload_media: "enviar a imagem",
  verify_code: "confirmar o código",
  whatsapp_contact: "registrar o contato",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const field = value[key];
  return typeof field === "string" ? field : undefined;
}

function numberField(value: unknown, key: string): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const field = value[key];
  return typeof field === "number" ? field : undefined;
}

/** Postgres errors surface through a `cause` chain (postgres.js wraps them); Supabase/Vercel errors are usually flat. */
function findInChain(
  error: unknown,
  predicate: (candidate: Record<string, unknown>) => boolean,
  depth = 0,
): Record<string, unknown> | null {
  if (depth > 5 || !isRecord(error)) {
    return null;
  }

  if (predicate(error)) {
    return error;
  }

  return "cause" in error ? findInChain(error.cause, predicate, depth + 1) : null;
}

function shortRequestId(requestId: string | undefined) {
  return requestId ? requestId.replace(/-/gu, "").slice(0, 8) : undefined;
}

function fallback(context: ErrorContext, retryable = true): UserFacingError {
  const shortId = shortRequestId(context.requestId);

  return {
    code: "unknown",
    message: shortId
      ? `Algo deu errado ao tentar ${operationVerbs[context.operation]}. Tente novamente. Código: ${shortId}`
      : `Algo deu errado ao tentar ${operationVerbs[context.operation]}. Tente novamente.`,
    retryable,
    title: operationTitles[context.operation],
  };
}

function result(
  context: ErrorContext,
  overrides: Partial<UserFacingError> & Pick<UserFacingError, "code" | "message">,
): UserFacingError {
  return {
    retryable: false,
    title: operationTitles[context.operation],
    ...overrides,
  };
}

const supabaseAuthRateLimitCodes = new Set([
  "over_email_send_rate_limit",
  "email_rate_limit_exceeded",
  "over_request_rate_limit",
]);

const postgresUniqueConstraintFields: Record<string, string> = {
  company_profiles_cnpj_uidx: "cnpj",
  social_profiles_owner_account_id_platform_uidx: "socialChannels",
};

function mapSupabaseAuthError(
  authError: Record<string, unknown>,
  context: ErrorContext,
): UserFacingError | null {
  const code = stringField(authError, "code");
  const status = numberField(authError, "status");

  if ((code && supabaseAuthRateLimitCodes.has(code)) || status === 429) {
    return result(context, {
      code: "auth.rate_limited",
      message:
        "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.",
      retryable: true,
    });
  }

  if (code === "weak_password") {
    return result(context, {
      code: "auth.weak_password",
      fieldErrors: {
        password: [
          "Use pelo menos 8 caracteres com letra maiúscula, minúscula e número.",
        ],
      },
      message: "A senha não atende aos requisitos mínimos de segurança.",
    });
  }

  if (code === "same_password") {
    return result(context, {
      code: "auth.same_password",
      fieldErrors: { password: ["Escolha uma senha diferente da atual."] },
      message: "A nova senha precisa ser diferente da atual.",
    });
  }

  if (code === "email_address_invalid" || code === "validation_failed") {
    return result(context, {
      code: "auth.invalid_email",
      fieldErrors: { email: ["Informe um e-mail válido."] },
      message: "Não foi possível validar o e-mail informado.",
    });
  }

  if (code === "otp_expired" || code === "invalid_otp") {
    return result(context, {
      code: "auth.invalid_otp",
      message: "Código inválido ou expirado. Peça um novo código.",
      retryable: true,
    });
  }

  if (code === "user_already_exists" || code === "email_exists") {
    return result(context, {
      code: "auth.user_already_exists",
      message:
        "Encontramos uma conta com este e-mail. Acesse o login para continuar de onde parou.",
    });
  }

  if (code === "session_not_found" || code === "refresh_token_not_found") {
    return result(context, {
      code: "auth.session_expired",
      message: "Sua sessão expirou. Entre novamente.",
    });
  }

  if (code === "signup_disabled" || code === "provider_disabled") {
    return result(context, {
      code: "auth.signup_disabled",
      message: "Cadastro temporariamente indisponível.",
    });
  }

  if (code === "unexpected_failure") {
    return result(context, {
      code: "auth.email_delivery_failed",
      message:
        "Não conseguimos enviar o e-mail agora. Tente reenviar em alguns minutos.",
      retryable: true,
    });
  }

  return null;
}

function mapPostgresError(
  pgError: Record<string, unknown>,
  context: ErrorContext,
): UserFacingError | null {
  const code = stringField(pgError, "code");

  if (code === "23505") {
    const constraintName = stringField(pgError, "constraint_name");
    const field = constraintName
      ? postgresUniqueConstraintFields[constraintName]
      : undefined;

    if (field === "cnpj") {
      return result(context, {
        code: "db.unique.cnpj",
        fieldErrors: { cnpj: ["Este CNPJ já está cadastrado."] },
        message: "Este CNPJ já está cadastrado.",
      });
    }

    return result(context, {
      code: "db.unique_violation",
      message: "Algum dado informado já está em uso.",
    });
  }

  if (code === "23514") {
    return result(context, {
      code: "db.check_violation",
      message: "Algum dado está em formato inválido. Revise os campos.",
    });
  }

  if (code === "42501") {
    return result(context, {
      code: "db.permission_denied",
      message:
        "Você não tem permissão para esta ação. Recarregue a página.",
    });
  }

  if (code === "40001" || code === "40P01") {
    return result(context, {
      code: "db.serialization_conflict",
      message: "Conflito ao salvar. Tente novamente.",
      retryable: true,
    });
  }

  if (
    code === "57014" ||
    code === "53300" ||
    (code?.startsWith("08") ?? false)
  ) {
    return result(context, {
      code: "db.unavailable",
      message:
        "Nosso servidor está instável agora. Seus dados não foram perdidos; tente de novo em instantes.",
      retryable: true,
    });
  }

  return null;
}

function isNetworkError(error: unknown): boolean {
  if (
    error instanceof TypeError &&
    /failed to fetch|networkerror|load failed/iu.test(error.message)
  ) {
    return true;
  }

  const code = stringField(error, "code");
  return code === "ECONNRESET" || code === "ETIMEDOUT";
}

export function toUserFacingError(
  error: unknown,
  context: ErrorContext,
): UserFacingError {
  if (isNetworkError(error)) {
    return result(context, {
      code: "network.offline",
      message: "Sem conexão com a internet. Verifique e tente novamente.",
      retryable: true,
    });
  }

  const status = numberField(error, "status");

  if (status === 413) {
    return result(context, {
      code: "payload.too_large",
      message: "A imagem é grande demais. Envie um arquivo menor.",
    });
  }

  if (status === 504) {
    return result(context, {
      code: "gateway.timeout",
      message:
        "A operação demorou demais. Verifique sua conexão e tente de novo.",
      retryable: true,
    });
  }

  const message = stringField(error, "message") ?? "";

  if (/failed to find server action/iu.test(message)) {
    return result(context, {
      code: "next.stale_deployment",
      message: "O site foi atualizado. Recarregue a página para continuar.",
    });
  }

  const authError = findInChain(
    error,
    (candidate) =>
      typeof candidate.code === "string" &&
      (candidate.__isAuthError === true || candidate.name === "AuthApiError"),
  );

  if (authError) {
    const mapped = mapSupabaseAuthError(authError, context);
    if (mapped) {
      return mapped;
    }
  }

  const postgresError = findInChain(
    error,
    (candidate) =>
      typeof candidate.code === "string" &&
      /^[0-9A-Z]{5}$/u.test(candidate.code as string),
  );

  if (postgresError) {
    const mapped = mapPostgresError(postgresError, context);
    if (mapped) {
      return mapped;
    }
  }

  return fallback(context);
}
