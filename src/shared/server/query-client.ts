import "server-only";

import { cache } from "react";

import { createQueryClient } from "@/shared/query/query-client";

export const getServerQueryClient = cache(createQueryClient);
