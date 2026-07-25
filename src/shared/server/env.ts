import "server-only";

import { parseServerEnv } from "@/shared/lib/env/server-env-schema";

export function getServerEnv() {
  return parseServerEnv(process.env);
}
