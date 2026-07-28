import {
  AccountManagementScreen,
  parseAccountManagementSearchParams,
} from "@/features/backoffice";

type AccountPageSearchParams = Record<string, string | string[] | undefined>;

function toUrlSearchParams(searchParams: AccountPageSearchParams) {
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

export default async function BackofficeAccountsPage({
  searchParams,
}: {
  searchParams: Promise<AccountPageSearchParams>;
}) {
  const filters = parseAccountManagementSearchParams(
    toUrlSearchParams(await searchParams),
  );

  return <AccountManagementScreen filters={filters} />;
}
