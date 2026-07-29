import type { Metadata } from "next";

import {
  ModerationQueueScreen,
  parseModerationQueueSearchParams,
} from "@/features/backoffice";

export const metadata: Metadata = {
  title: "Fila de moderação",
};

type QueuePageSearchParams = Record<string, string | string[] | undefined>;

function toUrlSearchParams(searchParams: QueuePageSearchParams) {
  const result = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      result.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      result.set(key, value[0]);
    }
  }

  return result;
}

export default async function BackofficeModerationPage({
  searchParams,
}: {
  searchParams: Promise<QueuePageSearchParams>;
}) {
  const filters = parseModerationQueueSearchParams(
    toUrlSearchParams(await searchParams),
  );

  return <ModerationQueueScreen filters={filters} />;
}
