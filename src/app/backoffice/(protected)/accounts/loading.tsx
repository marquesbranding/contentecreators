import { Skeleton } from "@/shared/components/ui/skeleton";

export default function BackofficeAccountsLoading() {
  return (
    <div aria-live="polite" className="space-y-6" role="status">
      <span className="sr-only">Carregando gestão de contas</span>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
