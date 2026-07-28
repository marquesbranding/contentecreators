import { Skeleton } from "@/shared/components/ui/skeleton";

export default function BackofficeLoading() {
  return (
    <section
      aria-label="Carregando conteúdo do backoffice"
      aria-live="polite"
      className="space-y-6"
      role="status"
    >
      <span className="sr-only">Carregando conteúdo do backoffice</span>
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            className="space-y-4 rounded-2xl border bg-white p-5"
            key={index}
          >
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </section>
  );
}
