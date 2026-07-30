"use client";

import { LogOut, Menu, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/shared/components/brand-logo";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
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
          ? "hidden items-center gap-1 md:flex"
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
      <Button
        aria-label="Sair da conta"
        className={cn(
          presentation === "desktop"
            ? "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            : "h-12 w-full justify-start",
        )}
        type="submit"
        variant="outline"
      >
        <LogOut aria-hidden="true" />
        Sair
      </Button>
    </form>
  );
}

export function AuthenticatedProductShell({
  children,
  signOutAction,
}: {
  children: React.ReactNode;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <div className="bg-brand-canvas min-h-screen">
      <header className="bg-brand-night sticky top-0 z-40 border-b border-white/10 text-white">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center gap-3 px-5 sm:px-8">
          <Link
            aria-label="Ir para o catálogo"
            className="focus-visible:ring-brand-blue mr-auto rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-night)]"
            href="/app/catalog"
          >
            <BrandLogo
              background="dark"
              className="w-36 sm:w-40"
              preload
              variant="white"
            />
          </Link>

          <ProductNavigation pathname={pathname} presentation="desktop" />

          <div className="hidden md:block">
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
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white md:hidden"
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
    </div>
  );
}
