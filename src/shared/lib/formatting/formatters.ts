const PRODUCT_TIME_ZONE = "America/Sao_Paulo";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCnpj(value: string) {
  const digits = digitsOnly(value);

  if (digits.length !== 14) {
    return value.trim();
  }

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

export function formatPhone(value: string) {
  const digits = digitsOnly(value);

  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }

  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }

  return value.trim();
}

export function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: PRODUCT_TIME_ZONE,
  }).format(date);
}

export function formatNumber(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPercentage(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
