import { ChevronRight, MoreHorizontal } from "lucide-react";
import * as React from "react";

import { cn } from "@/shared/lib/cn";

function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  return (
    <nav aria-label="Navegação estrutural" data-slot="breadcrumb" {...props} />
  );
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      className={cn(
        "text-muted-foreground flex min-w-0 flex-wrap items-center gap-1.5 text-sm sm:gap-2.5",
        className,
      )}
      data-slot="breadcrumb-list"
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      className={cn("inline-flex min-w-0 items-center gap-1.5", className)}
      data-slot="breadcrumb-item"
      {...props}
    />
  );
}

function BreadcrumbLink({
  className,
  children,
  render,
  ...props
}: React.ComponentProps<"a"> & { render?: React.ReactElement }) {
  const sharedProps = {
    ...props,
    className: cn(
      "hover:text-foreground focus-visible:ring-ring rounded-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2",
      className,
    ),
    "data-slot": "breadcrumb-link",
  };

  return render ? (
    React.cloneElement(
      render as React.ReactElement<Record<string, unknown>>,
      sharedProps,
      children,
    )
  ) : (
    <a {...sharedProps}>{children}</a>
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-current="page"
      aria-disabled="true"
      className={cn("text-foreground truncate font-medium", className)}
      data-slot="breadcrumb-page"
      role="link"
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      data-slot="breadcrumb-separator"
      role="presentation"
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

function BreadcrumbEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-9 items-center justify-center", className)}
      data-slot="breadcrumb-ellipsis"
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">Mais</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
