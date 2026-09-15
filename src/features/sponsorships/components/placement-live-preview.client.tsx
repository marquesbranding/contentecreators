"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { PlacementFormValues } from "../schemas/placement-form.schema";
import type { EligibleCreator } from "../api/eligible-creators.contract";
import { getPlacementSlot } from "../domain/placement-slot-catalog";
import { SponsorshipHeroBanner } from "./sponsorship-hero-banner";
import { SponsorshipSidePlacement } from "./sponsorship-side-placement";
import { SponsorshipCarousel } from "./sponsorship-carousel.client";
import { SponsorshipGridRow } from "./sponsorship-grid-row";
import { SponsorshipFeaturedCreator } from "./sponsorship-featured-creator";
import {
  SponsorshipTopBanner,
  type SponsorshipCreativeViewModel,
} from "./sponsorship-presentation";

const viewports = [
  { label: "Mobile", width: 375, Icon: Smartphone },
  { label: "Tablet", width: 768, Icon: Tablet },
  { label: "Desktop", width: 1280, Icon: Monitor },
] as const;
const frameHtml =
  '<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="preview-root"></div></body></html>';
export function PlacementLivePreview({
  values,
  images,
  creator,
}: {
  values: PlacementFormValues;
  images: {
    desktop: string | null;
    tablet: string | null;
    mobile: string | null;
  };
  creator: EligibleCreator | null;
}) {
  const [viewport, setViewport] = useState<number>(375);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [frameHeight, setFrameHeight] = useState(450);
  const [availableWidth, setAvailableWidth] = useState(320);
  const container = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const slot =
    getPlacementSlot(values.slotKey) ?? getPlacementSlot("catalog-top")!;
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let animationFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() =>
        setAvailableWidth(element.clientWidth),
      );
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, []);
  useEffect(() => {
    if (!target) return;
    // Updating the iframe during observer delivery causes a resize loop in WebKit.
    let animationFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() =>
        setFrameHeight(target.scrollHeight),
      );
    });
    observer.observe(target);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [target]);
  const media = (url: string | null) =>
    url
      ? {
          url,
          alt: values.advertiserLabel || values.title || "Imagem do patrocínio",
        }
      : null;
  const creative: SponsorshipCreativeViewModel = {
    id: "administrative-preview",
    advertiserLabel: values.advertiserLabel,
    audienceMatches: true,
    eligible: true,
    routeMatches: true,
    previewMode: true,
    title: values.title || "Sua campanha começa aqui",
    body: values.body || null,
    media: media(images.desktop),
    mediaMobile: media(images.mobile),
    mediaTablet: media(images.tablet),
    link: values.linkUrl
      ? { href: values.linkUrl, label: values.linkLabel || "Conheça a oferta" }
      : null,
  };
  const content =
    slot.slotKey === "catalog-top" ? (
      <SponsorshipHeroBanner creative={creative} />
    ) : slot.slotKey === "landing-top" ? (
      <SponsorshipTopBanner creative={creative} />
    ) : slot.slotKey === "catalog-inline" ? (
      <div className="flex justify-end">
        <SponsorshipSidePlacement creative={creative} />
      </div>
    ) : slot.slotKey === "catalog-carousel" ? (
      <SponsorshipCarousel creatives={[creative]} />
    ) : slot.slotKey === "catalog-midlist" ? (
      <SponsorshipGridRow creatives={[creative]} />
    ) : (
      <SponsorshipFeaturedCreator
        creative={creative}
        creator={{
          eligible: true,
          creatorTypeLabel: "Criador",
          detailHref: `/app/catalog/${creator?.id ?? "preview"}`,
          displayName: creator?.displayName ?? "Selecione um criador",
          media: media(creator?.avatarUrl ?? null),
          location: creator?.location,
        }}
      />
    );
  const scale = Math.min(1, availableWidth / viewport);
  return (
    <section className="space-y-4" aria-label="Prévia ao vivo">
      <div>
        <p className="text-sm font-bold">Prévia ao vivo</p>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          O mesmo componente da página, no tamanho de tela escolhido.
        </p>
      </div>
      <div
        className="bg-muted flex rounded-xl p-1"
        role="group"
        aria-label="Tamanho da prévia"
      >
        {viewports.map(({ label, width, Icon }) => (
          <Button
            key={label}
            className="min-h-11 min-w-0 flex-1 gap-1 px-2 text-xs"
            type="button"
            aria-pressed={viewport === width}
            variant={viewport === width ? "outline" : "ghost"}
            onClick={() => setViewport(width)}
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </div>
      <div className="bg-background overflow-hidden rounded-xl border">
        <div className="bg-muted/60 text-muted-foreground flex items-center gap-2 border-b px-3 py-2 text-[11px]">
          <span className="bg-brand-blue size-2 rounded-full" />
          <span>{slot.path}</span>
          <span className="ml-auto">{viewport}px</span>
        </div>
        <div
          ref={container}
          className="max-h-[440px] overflow-x-hidden overflow-y-auto"
        >
          <div
            style={{
              height: frameHeight * scale,
              width: viewport * scale,
              marginInline: "auto",
            }}
          >
            <iframe
              ref={frame}
              title="Prévia do patrocínio no site"
              sandbox="allow-same-origin"
              srcDoc={frameHtml}
              className="block origin-top-left border-0"
              style={{
                width: viewport,
                height: frameHeight,
                transform: `scale(${scale})`,
              }}
              onLoad={() => {
                const doc = frame.current?.contentDocument;
                if (!doc) return;
                document
                  .querySelectorAll('link[rel="stylesheet"], style')
                  .forEach((style) =>
                    doc.head.appendChild(style.cloneNode(true)),
                  );
                doc.documentElement.className =
                  document.documentElement.className;
                doc.body.className = document.body.className;
                setTarget(doc.getElementById("preview-root"));
              }}
            />
            {target
              ? createPortal(
                  <div
                    className="bg-brand-canvas p-4 sm:p-6"
                    onClickCapture={(event) => {
                      if ((event.target as HTMLElement).closest("a"))
                        event.preventDefault();
                    }}
                  >
                    <p className="text-muted-foreground mb-4 text-xs">
                      {slot.name}
                    </p>
                    {content}
                    <div
                      aria-hidden="true"
                      className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
                    >
                      {[0, 1, 2].map((key) => (
                        <div
                          className="bg-muted h-16 rounded-xl border"
                          key={key}
                        />
                      ))}
                    </div>
                  </div>,
                  target,
                )
              : null}
          </div>
        </div>
      </div>
      <p className="text-muted-foreground text-xs leading-5">
        {slot.description} Links desabilitados nesta prévia. A exibição depende
        da ativação e da agenda.
      </p>
    </section>
  );
}
