export const employeeRangeLabels = {
  "11_TO_50": "11 a 50 colaboradores",
  "201_TO_500": "201 a 500 colaboradores",
  "51_TO_200": "51 a 200 colaboradores",
  MORE_THAN_500: "Mais de 500 colaboradores",
  UP_TO_10: "Até 10 colaboradores",
} as const;

export function formatEmployeeRange(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return Object.hasOwn(employeeRangeLabels, value)
    ? employeeRangeLabels[value as keyof typeof employeeRangeLabels]
    : value;
}
