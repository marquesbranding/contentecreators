import { cn } from "@/shared/lib/cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-muted animate-pulse rounded-lg", className)}
      data-slot="skeleton"
      {...props}
    />
  );
}

export { Skeleton };
