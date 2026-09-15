import { Check, ImageIcon, UsersRound } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { placementSlotCatalog } from "../domain/placement-slot-catalog";

export function PlacementWireframe({ slotKey }: { slotKey: string }) {
  const highlight = "fill-brand-blue stroke-brand-blue";
  const muted = "fill-muted stroke-border";
  return (
    <svg
      aria-hidden="true"
      className="h-24 w-full"
      viewBox="0 0 240 112"
      fill="none"
    >
      <rect
        x="1"
        y="1"
        width="238"
        height="110"
        rx="10"
        className="fill-background stroke-border"
      />
      <path d="M1 21H239" className="stroke-border" />
      <circle cx="12" cy="11" r="3" className="fill-brand-blue" />
      <path
        d="M22 11H65 M190 11H226"
        className="stroke-muted-foreground"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x="12"
        y="29"
        width="216"
        height="22"
        rx="4"
        className={
          slotKey === "catalog-top" || slotKey === "landing-top"
            ? highlight
            : muted
        }
      />
      {[12, 86, 160].map((x) => (
        <rect
          key={x}
          x={x}
          y="57"
          width="68"
          height="12"
          rx="3"
          className={slotKey === "catalog-carousel" ? highlight : muted}
        />
      ))}
      {slotKey === "catalog-featured" ? (
        <>
          <rect
            x="12"
            y="76"
            width="153"
            height="26"
            rx="4"
            className={highlight}
          />
          <circle cx="27" cy="89" r="7" className="fill-background" />
          <path
            d="M42 85H95 M42 94H122"
            className="stroke-background"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : (
        [12, 65, 118].map((x, index) => (
          <rect
            key={x}
            x={x}
            y="76"
            width="47"
            height="26"
            rx="4"
            className={
              slotKey === "catalog-midlist" && index === 1 ? highlight : muted
            }
          />
        ))
      )}
      <rect
        x="174"
        y="76"
        width="54"
        height="26"
        rx="4"
        className={slotKey === "catalog-inline" ? highlight : muted}
      />
      {slotKey === "landing-top" ? (
        <path d="M126 29V51" className="stroke-background" strokeWidth="2" />
      ) : null}
    </svg>
  );
}
export function PlacementSlotPicker({
  value,
  onChange,
}: {
  value: string;
  onChange(value: string): void;
}) {
  return (
    <section className="space-y-4" aria-labelledby="slot-step-title">
      <div>
        <h3 id="slot-step-title" className="text-xl font-bold tracking-tight">
          Onde sua campanha vai aparecer?
        </h3>
        <p className="text-muted-foreground mt-1 text-sm leading-6">
          Escolha o espaço. O formato e as medidas vêm prontos para ele.
        </p>
      </div>
      <div
        className="grid gap-3 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Posição do patrocínio"
      >
        {placementSlotCatalog.map((slot) => (
          <label
            key={slot.slotKey}
            className={cn(
              "focus-within:ring-brand-blue hover:border-brand-blue/60 relative flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-colors focus-within:ring-2",
              value === slot.slotKey
                ? "border-brand-blue bg-brand-blue-soft/50"
                : "bg-card border-border",
            )}
          >
            <input
              className="sr-only"
              type="radio"
              name="placement-slot"
              checked={value === slot.slotKey}
              onChange={() => onChange(slot.slotKey)}
              value={slot.slotKey}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                {slot.audience}
              </span>
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border",
                  value === slot.slotKey &&
                    "border-brand-blue bg-brand-blue text-white",
                )}
              >
                {value === slot.slotKey ? <Check className="size-3.5" /> : null}
              </span>
            </div>
            <PlacementWireframe slotKey={slot.slotKey} />
            <span className="text-sm leading-5 font-bold">{slot.name}</span>
            <span className="text-muted-foreground text-xs leading-5">
              {slot.bestFor}
            </span>
            <span className="mt-auto flex flex-wrap gap-2 text-[11px] font-medium">
              <span className="bg-background flex items-center gap-1 rounded-md border px-2 py-1">
                {slot.usesImage ? (
                  <ImageIcon className="size-3" />
                ) : (
                  <UsersRound className="size-3" />
                )}
                {slot.usesImage ? "Precisa de imagem" : "Sem imagem"}
              </span>
              <span className="bg-background rounded-md border px-2 py-1">
                {slot.limit === 1 ? "1 por vez" : `Até ${slot.limit}`}
              </span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
