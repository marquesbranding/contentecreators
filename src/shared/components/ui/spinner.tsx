import { cn } from "@/shared/lib/cn";

function Spinner({
  "aria-label": ariaLabel = "Carregando",
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "submit-brand-pulse inline-block size-4 shrink-0",
        className,
      )}
      data-slot="spinner"
      role="status"
      {...props}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        className="size-full rounded-full object-cover"
        decoding="async"
        height={379}
        src="/brand/official/contente-creators-mascot.png"
        width={369}
      />
    </span>
  );
}

export { Spinner };
