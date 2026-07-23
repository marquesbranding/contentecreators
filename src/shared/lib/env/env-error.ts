import type { ZodError } from "zod";

export function createEnvironmentError(
  scope: "public" | "server",
  error: ZodError,
) {
  const keys = [
    ...new Set(
      error.issues.map((issue) => String(issue.path[0] ?? "environment")),
    ),
  ].sort();

  return new Error(
    `Invalid ${scope} environment variables: ${keys.join(", ")}`,
  );
}
