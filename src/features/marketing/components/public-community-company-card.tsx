import { Building2, ShieldCheck } from "lucide-react";

import { ProfileAvatarFrame } from "@/shared/components/profile-avatar-frame";
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
        {company.cover ? (
          <SignedImage
            alt=""
            className="object-cover"
            fallback={
              <div
                aria-hidden="true"
                className="from-brand-sky/35 via-brand-lime/15 to-brand-blue/25 size-full bg-gradient-to-br"
              />
            }
            height={company.cover.height}
            src={company.cover.url}
            width={company.cover.width}
            wrapperClassName="z-0 h-20 w-full sm:h-24"
          />
        ) : (
          <div
            aria-hidden="true"
            className="from-brand-sky/35 via-brand-lime/15 to-brand-blue/25 relative z-0 h-20 bg-gradient-to-br sm:h-24"
          />
        )}
        <ShieldCheck
          aria-label="Empresa aprovada"
          className="text-brand-blue absolute top-3 right-3 z-10 size-6"
        />
        <ProfileAvatarFrame
          alt={`Logo de ${company.tradeName}`}
          className="absolute -bottom-7 left-4 z-10"
          fallback={
            <div
              aria-hidden="true"
              className="bg-brand-night flex size-full items-center justify-center text-white"
            >
              <Building2 className="size-7" />
            </div>
          }
          src={company.logo?.url ?? null}
        />
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
