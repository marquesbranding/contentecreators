"use client";

import { LogOut, Menu, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";

import { BrandLogo } from "@/shared/components/brand-logo";
import { FormStatusSubmitButton } from "@/shared/components/form-status-submit-button";
import { SocialLinksNav } from "@/shared/components/social-links-nav";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { ptBR } from "@/shared/copy/pt-BR";
import { useHydrated } from "@/shared/hooks/use-hydrated";
import { cn } from "@/shared/lib/cn";
import { getBrowserQueryClient } from "@/shared/query/browser-query-client";

const navigationItems = [
  {
    href: "/app/catalog",
    icon: Search,
    isActive: (pathname: string) =>
      pathname === "/app/catalog" || pathname.startsWith("/app/creators/"),
    label: "Encontrar creators",
  },
  {
    href: "/app/profile",
    icon: UserRound,
    isActive: (pathname: string) => pathname.startsWith("/app/profile"),
    label: "Meu perfil",
  },
] as const;

/** Holds the search's footprint while it waits for the URL to be readable. */
function CatalogHeaderSearchFallback() {
  return (
    <div aria-hidden="true" className="h-11 w-full rounded-xl bg-white/10" />
  );
}

function CatalogHeaderSearch({
  viewerRole,
}: {
  viewerRole?: "COMPANY" | "INFLUENCER";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  // Creators search for companies to work with; companies search for
  // creators. Each role gets its own query param so neither search clears
  // the other's filters when both sections share /app/catalog.
  const searchesCompanies = viewerRole === "INFLUENCER";
  const paramName = searchesCompanies ? "companySearch" : "search";
  const currentSearch = searchParams.get(paramName) ?? "";
  const placeholder = searchesCompanies
    ? "Buscar empresas por nome ou segmento"
    : "Buscar creator por nome ou nicho";

  return (
    <form
      aria-label={
        searchesCompanies
          ? "Buscar empresas no catálogo"
          : "Buscar creators no catálogo"
      }
      className="relative w-full"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const nextParams = new URLSearchParams(searchParams.toString());
        const normalizedSearch = String(formData.get(paramName) ?? "").trim();

        if (normalizedSearch) {
          nextParams.set(paramName, normalizedSearch);
        } else {
          nextParams.delete(paramName);
        }

        if (!searchesCompanies) {
          nextParams.delete("cursor");
        }

        startTransition(() => {
          const query = nextParams.toString();
          router.push(query ? `/app/catalog?${query}` : "/app/catalog");
        });
      }}
      role="search"
    >
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/55"
      />
      <Input
        aria-label={placeholder}
        className="rounded-full border-white/15 bg-white/[0.07] pr-11 pl-10 text-white placeholder:text-white/45 focus-visible:border-white/30 focus-visible:ring-white/25"
        defaultValue={currentSearch}
        disabled={isPending}
        key={`${paramName}-${currentSearch}`}
        name={paramName}
        placeholder={placeholder}
        type="search"
      />
      <Button
        aria-label="Buscar no catálogo"
        className="absolute top-1/2 right-1 size-9 -translate-y-1/2 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
        disabled={isPending}
        size="icon"
        type="submit"
        variant="ghost"
      >
        <Search aria-hidden="true" className="size-4" />
      </Button>
    </form>
  );
}

function ProductNavigation({
  onNavigate,
  pathname,
  presentation,
}: {
  onNavigate?: () => void;
  pathname: string;
  presentation: "desktop" | "mobile";
}) {
  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        presentation === "desktop"
          ? "hidden items-center gap-1 lg:flex"
          : "grid gap-2",
      )}
    >
      {navigationItems.map((item) => {
        const active = item.isActive(pathname);
        const Icon = item.icon;

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              buttonVariants({
                className:
                  presentation === "mobile"
                    ? "h-12 w-full justify-start"
                    : "text-white/75 hover:bg-white/10 hover:text-white",
                variant: "ghost",
              }),
              active &&
                (presentation === "desktop"
                  ? "bg-white/12 text-white"
                  : "bg-brand-blue-soft text-[var(--brand-blue-hover)]"),
            )}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            <Icon aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ProductSignOut({
  action,
  presentation,
}: {
  action: () => Promise<void>;
  presentation: "desktop" | "mobile";
}) {
  return (
    <form
      action={action}
      onSubmit={() => {
        getBrowserQueryClient().clear();
      }}
    >
      <FormStatusSubmitButton
        aria-label="Sair da conta"
        className={cn(
          presentation === "desktop"
            ? "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            : "h-12 w-full justify-start",
        )}
        idleIcon={<LogOut aria-hidden="true" />}
        pendingLabel="Saindo da conta..."
        pendingLogoVariant={presentation === "desktop" ? "white" : "blue"}
        variant="outline"
      >
        Sair
      </FormStatusSubmitButton>
    </form>
  );
}

function AuthenticatedProductFooter() {
  return (
    <footer className="bg-brand-night mt-auto border-t border-white/10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <nav
            aria-label="Links institucionais"
            className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold"
          >
            <Link
              className="text-white/70 hover:text-white focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
              href="/terms"
            >
              {ptBR.marketing.footer.terms}
            </Link>
            <Link
              className="text-white/70 hover:text-white focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-white/70 focus-visible:outline-none"
              href="/privacy"
            >
              {ptBR.marketing.footer.privacy}
            </Link>
          </nav>
          <SocialLinksNav />
        </div>
        <p className="text-xs text-white/60">
          © {new Date().getFullYear()} {ptBR.marketing.footer.copyright}
        </p>
      </div>
    </footer>
  );
}

export function AuthenticatedProductShell({
  children,
  signOutAction,
  viewerRole,
}: {
  children: React.ReactNode;
  signOutAction: () => Promise<void>;
  viewerRole?: "COMPANY" | "INFLUENCER";
}) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const catalogRoute = pathname === "/app/catalog";

  return (
    <div className="bg-brand-canvas flex min-h-screen flex-col">
      <header className="bg-brand-night sticky top-0 z-40 border-b border-white/10 text-white">
        <div className="mx-auto flex min-h-18 max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-8 lg:flex-nowrap lg:py-0">
          <Link
            aria-label="Ir para o catálogo"
            className={cn(
              "focus-visible:ring-brand-blue rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-night)]",
              !catalogRoute && "mr-auto",
            )}
            href="/app/catalog"
          >
            <BrandLogo
              background="dark"
              className="w-36 sm:w-40"
              preload
              variant="white"
            />
          </Link>

          {catalogRoute ? (
            <div className="order-last w-full lg:order-none lg:max-w-md lg:min-w-52 lg:flex-1">
              {/* The search reads useSearchParams, which bails out of
               * prerendering. Without this boundary the shell cannot be
               * statically rendered inside a route's loading.tsx. */}
              <Suspense fallback={<CatalogHeaderSearchFallback />}>
                <CatalogHeaderSearch viewerRole={viewerRole} />
              </Suspense>
            </div>
          ) : null}

          <ProductNavigation pathname={pathname} presentation="desktop" />

          <div className="hidden lg:block">
            <ProductSignOut action={signOutAction} presentation="desktop" />
          </div>

          <Sheet
            onOpenChange={setMobileNavigationOpen}
            open={mobileNavigationOpen}
          >
            <SheetTrigger
              render={
                <Button
                  aria-label="Abrir menu principal"
                  className="ml-auto border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white lg:hidden"
                  disabled={!hydrated}
                  size="icon"
                  type="button"
                  variant="outline"
                />
              }
            >
              <Menu aria-hidden="true" />
            </SheetTrigger>
            <SheetContent className="p-0" side="right">
              <SheetHeader className="bg-brand-night border-b border-white/10 text-white">
                <BrandLogo background="dark" className="w-36" variant="white" />
                <SheetTitle className="text-white">
                  Navegação principal
                </SheetTitle>
                <SheetDescription className="text-white/65">
                  Encontre creators e mantenha seu perfil atualizado.
                </SheetDescription>
              </SheetHeader>
              <div className="p-5">
                <ProductNavigation
                  onNavigate={() => setMobileNavigationOpen(false)}
                  pathname={pathname}
                  presentation="mobile"
                />
              </div>
              <SheetFooter className="border-t">
                <ProductSignOut action={signOutAction} presentation="mobile" />
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {children}

      <AuthenticatedProductFooter />
    </div>
  );
}
