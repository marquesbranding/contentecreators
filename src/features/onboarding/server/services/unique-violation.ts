export function isUniqueViolation(
  error: unknown,
  constraintName: string,
): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  if (
    "code" in error &&
    error.code === "23505" &&
    "constraint_name" in error &&
    error.constraint_name === constraintName
  ) {
    return true;
  }

  return "cause" in error
    ? isUniqueViolation(error.cause, constraintName)
    : false;
}
