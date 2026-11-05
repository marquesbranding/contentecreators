export function normalizeWhatsapp(value: string) {
  const digits = value.replace(/\D/gu, "");
  const hasCountryCode =
    digits.startsWith("55") && (digits.length === 12 || digits.length === 13);

  return hasCountryCode ? `+${digits}` : `+55${digits}`;
}
