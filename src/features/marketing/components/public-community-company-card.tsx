import { Building2, ShieldCheck } from "lucide-react";

import { SignedImage } from "@/shared/components/signed-image";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardHeader } from "@/shared/components/ui/card";
import { accountTypeLabels } from "@/shared/domain/account-type-labels";
import { cn } from "@/shared/lib/cn";
import { nameSizeClass } from "@/shared/lib/names/display-name";

import type { PublicShowcaseCompanyDto } from "../types/public-landing-showcase.types";
import { ShowcaseLocation } from "./showcase-location";

/**
 * Company counterpart of the public creator card, same geometry so both kinds
 * sit in one carousel. Carries only presentation data — no contact, website or
 * CNPJ — since the catalog keeps those behind approval.
 */
export function PublicCommunityCompanyCard({
  company,
}: {
  company: PublicShowcaseCompanyDto;
}) {
  return (
    <Card
      className="ring-foreground/10 h-full gap-0 overflow-hidden rounded-2xl bg-[#f7f6f2] py-0 whitespace-normal text-black shadow-sm"
      role="article"
    >
      <div className="relative">
        <div
          aria-hidden="true"
          className="from-brand-sky/35 via-brand-lime/15 to-brand-blue/25 relative z-0 h-20 bg-gradient-to-br sm:h-24"
        />
        <ShieldCheck
          aria-label="Empresa aprovada"
          className="text-brand-blue absolute top-3 right-3 z-10 size-6"
        />
        <div className="absolute -bottom-7 left-4 z-10 size-16 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
          {company.logo ? (
            <SignedImage
              alt={`Logo de ${company.tradeName}`}
              className="size-full object-contain p-1"
              height={company.logo.height}
              src={company.logo.url}
              width={company.logo.width}
            />
          ) : (
            <div
              aria-hidden="true"
              className="bg-brand-night flex size-full items-center justify-center text-white"
            >
              <Building2 className="size-7" />
            </div>
          )}
        </div>
      </div>

      <CardHeader className="flex-1 gap-2.5 px-4 pt-9 pb-4">
        <h3
          className={cn(
            "truncate font-extrabold tracking-[-0.01em]",
            nameSizeClass(company.tradeName),
          )}
        >
          {company.tradeName}
        </h3>
        <ShowcaseLocation city={company.city} state={company.state} />
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="bg-brand-night border-transparent text-[11px] text-white">
            {accountTypeLabels.COMPANY}
          </Badge>
          {company.segment ? (
            <Badge className="text-[11px]" variant="secondary">
              {company.segment}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
    </Card>
  );
}
