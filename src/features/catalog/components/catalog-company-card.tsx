import { Building2, MapPin, SquareArrowOutUpRight } from "lucide-react";
import Link from "next/link";

import { SignedImage } from "@/shared/components/signed-image";
import { Badge } from "@/shared/components/ui/badge";
import { buttonVariants } from "@/shared/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { accountTypeLabels } from "@/shared/domain/account-type-labels";
import { cn } from "@/shared/lib/cn";

import { nameSizeClass } from "../lib/name-size";
import type { DirectoryCompanyBrowserEntryDto } from "../api/catalog-directory.contract";

export function CatalogCompanyCard({
  company,
}: {
  company: DirectoryCompanyBrowserEntryDto;
}) {
  return (
    <Card
      className="hover:border-brand-blue/30 border-border h-full gap-0 overflow-hidden rounded-2xl py-0 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      role="article"
    >
      <div className="relative">
        <div
          aria-hidden="true"
          className="from-brand-blue/30 via-brand-pink/15 to-brand-lime/25 relative z-0 h-20 bg-gradient-to-br sm:h-24"
        />
        <div className="absolute -bottom-7 left-4 z-10 size-16 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
          {company.logo ? (
            <SignedImage
              alt={`Logo da ${company.displayName}`}
              className="size-full object-contain p-1.5"
              src={company.logo.url}
            />
          ) : (
            <div
              aria-label={`${company.displayName} está sem logo`}
              className="bg-muted text-muted-foreground flex size-full items-center justify-center"
              role="img"
            >
              <Building2 aria-hidden="true" className="size-6" />
            </div>
          )}
        </div>
      </div>

      <CardHeader className="flex-1 gap-2.5 px-4 pt-9 pb-3">
        <CardTitle>
          <h3
            className={cn(
              "truncate font-extrabold tracking-[-0.01em]",
              nameSizeClass(company.displayName),
            )}
          >
            {company.displayName}
          </h3>
        </CardTitle>
        {[company.city, company.state].filter(Boolean).length > 0 ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            {[company.city, company.state].filter(Boolean).join(", ")}
          </p>
        ) : null}
        {company.description ? (
          <p className="text-muted-foreground line-clamp-2 text-xs leading-5">
            {company.description}
          </p>
        ) : null}
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

      <CardFooter className="bg-card border-t-0 px-4 pt-0 pb-4">
        <Link
          aria-label={`Ver perfil de ${company.displayName}`}
          className={cn(
            buttonVariants({
              className:
                "bg-brand-night hover:bg-brand-night/90 h-9 w-full text-sm text-white",
              size: "sm",
            }),
          )}
          href={`/app/companies/${company.companyId}`}
        >
          Ver perfil da marca
          <SquareArrowOutUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}
