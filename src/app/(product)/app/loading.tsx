import { AuthenticatedProductShell } from "@/features/identity";
import { signOutAction } from "@/features/identity/server";
import { Spinner } from "@/shared/components/ui/spinner";

export default function AppSectionLoading() {
  return (
    <AuthenticatedProductShell signOutAction={signOutAction}>
      <main
        aria-live="polite"
        className="flex min-h-[60vh] items-center justify-center"
        id="main-content"
        role="status"
        tabIndex={-1}
      >
        <span className="sr-only">Carregando</span>
        <Spinner className="text-muted-foreground size-8" />
      </main>
    </AuthenticatedProductShell>
  );
}
