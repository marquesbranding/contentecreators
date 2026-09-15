/**
 * The full CDL wordmark (`cdl-logo.png`) renders "CDL" in white, which
 * disappears on the light card backgrounds this badge sits on — so this
 * uses only the colored emblem crop and sets the "CDL" text in HTML
 * instead, in a color that reads on any background.
 */
export function CdlMemberBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#0b3c7a] ring-1 ring-black/10"
      title="Associado da CDL (Câmara de Dirigentes Lojistas)"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        aria-hidden="true"
        className={size === "md" ? "h-4 w-auto" : "h-3.5 w-auto"}
        height={57}
        src="/brand/partners/cdl-emblem.png"
        width={78}
      />
      CDL
      <span className="sr-only">
        : associado da Câmara de Dirigentes Lojistas
      </span>
    </span>
  );
}
