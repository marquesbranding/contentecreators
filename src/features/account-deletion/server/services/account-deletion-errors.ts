import "server-only";

export function collectErrorMessages(error: unknown): string {
  if (error instanceof Error) {
    const cause =
      "cause" in error && error.cause ? collectErrorMessages(error.cause) : "";

    return `${error.message} ${cause}`.trim();
  }

  return String(error);
}
