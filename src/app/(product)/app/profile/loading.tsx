import { AuthenticatedProductShell } from "@/features/identity";
import { signOutAction } from "@/features/identity/server";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <AuthenticatedProductShell signOutAction={signOutAction}>
      <main
        aria-live="polite"
        className="bg-brand-canvas min-h-screen px-4 py-5 sm:px-8 sm:py-9"
        id="main-content"
        role="status"
        tabIndex={-1}
      >
        <span className="sr-only">Carregando perfil</span>
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl bg-white shadow-[0_28px_80px_rgba(8,8,8,0.1)]">
            <div className="space-y-4 border-b px-5 py-6 sm:px-9 sm:py-8">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-5 w-full max-w-xl" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div className="space-y-6 px-5 py-6 sm:px-9 sm:py-8">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <div className="grid gap-5 sm:grid-cols-2">
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
              </div>
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </AuthenticatedProductShell>
  );
}
