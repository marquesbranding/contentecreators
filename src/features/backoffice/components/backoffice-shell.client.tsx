"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ChevronRight,
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Megaphone,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState } from "react";

import { BrandLogo } from "@/shared/components/brand-logo";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { cn } from "@/shared/lib/cn";

const primaryNavigation = [
  {
    href: "/backoffice",
    icon: LayoutDashboard,
    label: "Visão geral",
  },
  {
    href: "/backoffice/moderation",
    icon: ClipboardCheck,
    label: "Moderação",
  },
  {
    href: "/backoffice/accounts",
    icon: Users,
    label: "Contas",
  },
  {
    href: "/backoffice/audit",
    icon: FileClock,
    label: "Auditoria",
  },
  {
    href: "/backoffice/emails",
    icon: Mail,
    label: "E-mails",
  },
  {
    href: "/backoffice/sponsorships",
    icon: Megaphone,
    label: "Patrocínios",
  },
] as const;

const plannedNavigation = [{ icon: Archive, label: "Arquivados" }] as const;

function isPathActive(pathname: string, href: string) {
  return href === "/backoffice"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function BackofficeNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação do backoffice" className="space-y-1.5">
      {primaryNavigation.map(({ href, icon: Icon, label }) => {
        const active = isPathActive(pathname, href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              active
                ? "bg-brand-blue text-white"
                : "text-foreground hover:bg-brand-blue-soft hover:text-brand-blue",
            )}
            href={href}
            key={href}
            onClick={onNavigate}
          >
            <Icon aria-hidden="true" className="size-4.5 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}

      <Separator className="my-4" />

      <p className="text-muted-foreground px-3 pb-1 text-xs font-semibold">
        Próximos módulos
      </p>
      {plannedNavigation.map(({ icon: Icon, label }) => (
        <span
          aria-disabled="true"
          className="text-muted-foreground flex min-h-11 cursor-not-allowed items-center gap-3 rounded-xl px-3 text-sm font-medium"
          key={label}
        >
          <Icon aria-hidden="true" className="size-4.5 shrink-0" />
          <span className="min-w-0 flex-1">{label}</span>
          <span className="rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold">
            Em breve
          </span>
        </span>
      ))}
    </nav>
  );
}

function BackofficeBreadcrumb() {
  const pathname = usePathname();

  if (pathname === "/backoffice") {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Visão geral</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const segments: Array<{ href?: string; label: string }> = [];

  if (pathname.startsWith("/backoffice/moderation")) {
    segments.push({
      href:
        pathname === "/backoffice/moderation"
          ? undefined
          : "/backoffice/moderation",
      label: "Moderação",
    });
    if (pathname !== "/backoffice/moderation") {
      segments.push({ label: "Revisão do cadastro" });
    }
  } else if (pathname.startsWith("/backoffice/accounts")) {
    segments.push({
      href:
        pathname === "/backoffice/accounts"
          ? undefined
          : "/backoffice/accounts",
      label: "Contas",
    });
    if (pathname !== "/backoffice/accounts") {
      const editing = pathname.endsWith("/edit");
      segments.push({
        href: editing ? pathname.replace(/\/edit$/u, "") : undefined,
        label: "Detalhes da conta",
      });
      if (editing) {
        segments.push({ label: "Editar perfil" });
      }
    }
  } else if (pathname.startsWith("/backoffice/audit")) {
    segments.push({ label: "Auditoria" });
  } else if (pathname.startsWith("/backoffice/emails")) {
    segments.push({ label: "E-mails" });
  } else if (pathname.startsWith("/backoffice/sponsorships")) {
    segments.push({ label: "Patrocínios" });
  } else {
    segments.push({ label: "Backoffice" });
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/backoffice" />}>
            Visão geral
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((segment) => (
          <Fragment key={`${segment.href}-${segment.label}`}>
            <BreadcrumbSeparator>
              <ChevronRight aria-hidden="true" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {segment.href ? (
                <BreadcrumbLink render={<Link href={segment.href} />}>
                  {segment.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{segment.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function BackofficeSignOutButton({ action }: { action: () => Promise<void> }) {
  const queryClient = useQueryClient();

  return (
    <form
      action={action}
      onSubmit={() => {
        queryClient.clear();
      }}
    >
      <Button
        aria-label="Sair"
        className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
        type="submit"
        variant="outline"
      >
        <LogOut aria-hidden="true" />
        <span>Sair</span>
      </Button>
    </form>
  );
}

export function BackofficeShell({
  children,
  signOutAction,
}: {
  children: React.ReactNode;
  signOutAction: () => Promise<void>;
}) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <div className="bg-brand-canvas min-h-screen">
      <header className="bg-brand-night sticky top-0 z-40 border-b border-white/10 text-white">
        <div className="mx-auto flex min-h-20 max-w-[96rem] items-center gap-3 px-5 sm:px-8">
          <Sheet
            onOpenChange={setMobileNavigationOpen}
            open={mobileNavigationOpen}
          >
            <SheetTrigger
              render={
                <Button
                  aria-label="Abrir menu do backoffice"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white lg:hidden"
                  size="icon"
                  variant="outline"
                />
              }
            >
              <Menu aria-hidden="true" />
            </SheetTrigger>
            <SheetContent className="p-0" side="left">
              <SheetHeader className="bg-brand-night border-b border-white/10 text-white">
                <BrandLogo background="dark" className="w-36" variant="white" />
                <SheetTitle className="text-white">
                  Navegação do backoffice
                </SheetTitle>
                <SheetDescription className="text-white/65">
                  Acesse as áreas administrativas da plataforma.
                </SheetDescription>
              </SheetHeader>
              <div className="overflow-y-auto p-5">
                <BackofficeNavigation
                  onNavigate={() => setMobileNavigationOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>

          <Link
            aria-label="Ir para a visão geral do backoffice"
            className="focus-visible:ring-ring flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2"
            href="/backoffice"
          >
            <BrandLogo
              background="dark"
              className="w-32 sm:w-40"
              preload
              variant="white"
            />
            <span className="hidden truncate border-l border-white/20 pl-3 text-sm font-semibold sm:inline">
              Backoffice
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs font-semibold text-white/70 md:flex">
              <ShieldCheck aria-hidden="true" className="size-4" />
              Ambiente protegido
            </span>
            <BackofficeSignOutButton action={signOutAction} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[96rem] lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden border-r bg-white p-5 lg:block lg:min-h-[calc(100vh-5rem)]">
          <BackofficeNavigation />
        </aside>
        <div className="min-w-0">
          <div className="border-b bg-white px-5 py-3 sm:px-8">
            <BackofficeBreadcrumb />
          </div>
          <main
            className="px-5 py-6 sm:px-8 sm:py-8"
            id="main-content"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
