import { Skeleton } from "@/shared/components/ui/skeleton";

export default function AnalysisStatusLoading() {
  return (
    <main
      aria-live="polite"
      className="bg-brand-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10"
      id="main-content"
      role="status"
      tabIndex={-1}
    >
      <span className="sr-only">Carregando status do cadastro</span>
      <div
        aria-hidden="true"
        className="bg-brand-blue/15 absolute -top-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full blur-3xl"
      />
      <div className="relative w-full max-w-2xl">
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_28px_80px_rgba(8,8,8,0.1)]">
          <div className="space-y-4 border-b px-6 py-7 sm:px-9 sm:py-9">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-5 w-full" />
          </div>
          <div className="space-y-4 px-6 py-7 sm:px-9">
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
