import {
  AdminEmailOutboxScreen,
  parseAdminEmailOutboxSearchParams,
} from "@/features/communications";
import { retryFailedEmailAction } from "@/features/communications/server";

type EmailPageSearchParams = Record<string, string | string[] | undefined>;

function toUrlSearchParams(searchParams: EmailPageSearchParams) {
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

export default async function BackofficeEmailsPage({
  searchParams,
}: {
  searchParams: Promise<EmailPageSearchParams>;
}) {
  const filters = parseAdminEmailOutboxSearchParams(
    toUrlSearchParams(await searchParams),
  );

  return (
    <AdminEmailOutboxScreen
      filters={filters}
      retryAction={retryFailedEmailAction}
    />
  );
}
