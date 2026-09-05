import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/cn";

export function CatalogEmptyState({
  actions,
  description,
  icon: Icon,
  title,
  tone,
}: {
  actions?: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
  tone: "filtered" | "first";
}) {
  return (
    <Card
      className={cn(
        "items-center rounded-2xl px-5 text-center",
        tone === "first"
          ? "bg-brand-night rounded-3xl border-white/10 py-14 text-white shadow-lg"
          : "border bg-white py-12 shadow-sm",
      )}
    >
      {tone === "first" ? (
        <span className="bg-brand-blue/20 text-brand-blue flex size-14 items-center justify-center rounded-2xl">
          <Icon aria-hidden="true" className="size-7" />
        </span>
      ) : (
        <Icon aria-hidden="true" className="text-brand-blue size-10" />
      )}
      <CardTitle>
        <h2 className="text-xl font-bold">{title}</h2>
      </CardTitle>
      <p
        className={cn(
          "max-w-lg leading-6",
          tone === "first" ? "text-white/60" : "text-muted-foreground",
        )}
      >
        {description}
      </p>
      {actions ? (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {actions}
        </div>
      ) : null}
    </Card>
  );
}
