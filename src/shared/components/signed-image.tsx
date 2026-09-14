"use client";

import { Loader2Icon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@/shared/lib/cn";

interface SignedImageSource {
  /** A `(min-width: …)` media query; the first matching source wins. */
  media: string;
  src: string;
}

interface SignedImageProps {
  alt: string;
  /** Classes for the <img> itself (object-fit, sizing when no wrapperClassName is given). */
  className: string;
  fetchPriority?: "auto" | "high" | "low";
  /**
   * Rendered in place of the image once it errors out or times out. Without
   * it, an errored image just leaves its area blank (opacity 0) — pass the
   * same gradient/initials shown when there is no image at all.
   */
  fallback?: ReactNode;
  height?: number | null;
  loading?: "eager" | "lazy";
  /** A short-lived bearer URL; intentionally bypasses the shared image optimizer. */
  src: string;
  /**
   * Wider-viewport variants, checked top-down — the first whose `media`
   * query matches wins; `src` is the fallback when none match (or none are
   * given). Renders as a native `<picture>` so the browser swaps sources on
   * its own, no JS/resize listener involved.
   */
  sources?: SignedImageSource[];
  width?: number | null;
  /**
   * When set, renders a positioned wrapper sized by these classes and makes
   * the <img> absolutely fill it. Use this when the image's own parent isn't
   * already a sized, positioned box (e.g. a bare cover image inside a Card).
   * Omit it when the parent already provides that (e.g. a fixed-size avatar
   * or logo container) — the spinner then renders as a plain sibling.
   */
  wrapperClassName?: string;
}

function LoadingSpinnerOverlay() {
  return (
    <span
      aria-hidden="true"
      className="bg-muted absolute inset-0 flex items-center justify-center"
    >
      <Loader2Icon className="text-muted-foreground/50 size-5 animate-spin" />
    </span>
  );
}

/**
 * A signed/private <img> that shows a spinner placeholder until it loads,
 * then cross-fades the image in — instead of popping in abruptly or
 * flashing a broken-image icon while the signed URL round-trips.
 */
export function SignedImage({
  alt,
  className,
  fallback,
  fetchPriority = "auto",
  height,
  loading = "lazy",
  src,
  sources,
  width,
  wrapperClassName,
}: SignedImageProps) {
  const [status, setStatus] = useState<"error" | "loaded" | "loading">(
    "loading",
  );
  const [trackedSrc, setTrackedSrc] = useState(src);
  const [isVisible, setIsVisible] = useState(loading === "eager");
  const rootRef = useRef<HTMLDivElement | HTMLImageElement | null>(null);

  if (src !== trackedSrc) {
    setTrackedSrc(src);
    setStatus("loading");
  }

  useEffect(() => {
    if (loading === "eager" || isVisible) {
      return;
    }

    const node = rootRef.current;

    if (!node || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    /* `loading="lazy"` defers the browser's own fetch until the element nears
     * the viewport; without this, the 8s timeout below could elapse before
     * that fetch even starts (e.g. duplicated carousel copies sitting far
     * offscreen), marking a perfectly fine image as errored. */
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setIsVisible(true);
      }
    });

    observer.observe(node);

    return () => observer.disconnect();
  }, [isVisible, loading]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    /* Some failed loads (e.g. blocked cross-origin responses) never fire
     * onError, which would otherwise spin the placeholder forever. */
    const timeoutId = window.setTimeout(() => {
      setStatus((current) => (current === "loading" ? "error" : current));
    }, 8_000);

    return () => window.clearTimeout(timeoutId);
  }, [src, isVisible]);

  /* An image already decoded before hydration (server-rendered markup, or a
   * warm cache) fires no load event, which would strand it at opacity 0.
   * A callback ref runs as soon as the node attaches, so we can read the
   * browser's own completion flags instead of waiting for the event. Also
   * doubles as the IntersectionObserver target when there is no wrapper. */
  function adoptAlreadyLoadedImage(node: HTMLImageElement | null) {
    if (!wrapperClassName) {
      rootRef.current = node;
    }

    if (node?.complete && node.naturalWidth > 0) {
      setStatus("loaded");
    }
  }

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className={cn(
        className,
        // Without this, the browser falls back to the image's own native
        // pixel size (via the width/height attributes below) instead of
        // filling the positioned wrapper — leaving the rest of the box
        // showing whatever sits behind it.
        wrapperClassName && "absolute inset-0 size-full",
        "transition-opacity duration-500 ease-out",
        status === "loaded" ? "opacity-100" : "opacity-0",
      )}
      decoding="async"
      fetchPriority={fetchPriority}
      height={height ?? 640}
      loading={loading}
      onError={() => setStatus("error")}
      onLoad={() => setStatus("loaded")}
      ref={adoptAlreadyLoadedImage}
      referrerPolicy="no-referrer"
      src={src}
      width={width ?? 640}
    />
  );
  const picture =
    sources && sources.length > 0 ? (
      <picture>
        {sources.map((source) => (
          <source key={source.media} media={source.media} srcSet={source.src} />
        ))}
        {img}
      </picture>
    ) : (
      img
    );

  const fallbackOverlay =
    status === "error" && fallback ? (
      <span aria-hidden="true" className="absolute inset-0">
        {fallback}
      </span>
    ) : null;

  if (!wrapperClassName) {
    return (
      <>
        {status === "loading" ? <LoadingSpinnerOverlay /> : null}
        {fallbackOverlay}
        {picture}
      </>
    );
  }

  return (
    <div
      className={cn("bg-muted relative overflow-hidden", wrapperClassName)}
      ref={(node) => {
        rootRef.current = node;
      }}
    >
      {status === "loading" ? <LoadingSpinnerOverlay /> : null}
      {fallbackOverlay}
      {picture}
    </div>
  );
}
