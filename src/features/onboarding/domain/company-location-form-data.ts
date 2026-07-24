const locationFields = new Set([
  "city",
  "complement",
  "label",
  "neighborhood",
  "number",
  "postalCode",
  "state",
  "street",
] as const);

type LocationField =
  typeof locationFields extends Set<infer Field> ? Field : never;

export type AdditionalCompanyLocationFormValue = Partial<
  Record<LocationField, string>
>;

const locationFieldPattern =
  /^additionalLocations\.([A-Za-z0-9_-]{1,80})\.([A-Za-z]+)$/u;

export function readAdditionalCompanyLocations(
  formData: FormData,
): AdditionalCompanyLocationFormValue[] {
  const locations = new Map<string, AdditionalCompanyLocationFormValue>();

  for (const [name, value] of formData.entries()) {
    if (typeof value !== "string") {
      continue;
    }

    const match = locationFieldPattern.exec(name);
    const clientId = match?.[1];
    const field = match?.[2];

    if (!clientId || !field || !locationFields.has(field as LocationField)) {
      continue;
    }

    const location = locations.get(clientId) ?? {};
    location[field as LocationField] = value;
    locations.set(clientId, location);
  }

  return [...locations.values()];
}
