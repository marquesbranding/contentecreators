import "server-only";

import { parseServerEnv } from "@/shared/lib/env/server-env-schema";

export const serverEnv = parseServerEnv(process.env);
