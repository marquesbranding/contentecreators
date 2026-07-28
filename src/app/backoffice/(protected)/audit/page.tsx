import {
  AuditHistoryScreen,
  parseAuditHistorySearchParams,
} from "@/features/audit";

type AuditPageSearchParams = Record<string, string | string[] | undefined>;

function toUrlSearchParams(searchParams: AuditPageSearchParams) {
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

export default async function BackofficeAuditPage({
  searchParams,
}: {
  searchParams: Promise<AuditPageSearchParams>;
}) {
  const filters = parseAuditHistorySearchParams(
    toUrlSearchParams(await searchParams),
  );

  return <AuditHistoryScreen filters={filters} />;
}
