import { cn } from "@/shared/lib/cn";

export function SkipLink({
  className,
  targetId = "main-content",
}: {
  className?: string;
  targetId?: string;
}) {
  return (
    <a
      className={cn(
        "sr-only rounded-xl bg-white px-4 py-3 font-semibold text-black shadow-lg outline-none focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:ring-3 focus:ring-black/30",
        className,
      )}
      href={`#${targetId}`}
    >
      Pular para o conteúdo
    </a>
  );
}
