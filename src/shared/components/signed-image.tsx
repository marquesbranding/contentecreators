"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/shared/lib/cn";

interface SignedImageProps {
  alt: string;
  /** Classes for the <img> itself (object-fit, sizing when no wrapperClassName is given). */
  className: string;
  fetchPriority?: "auto" | "high" | "low";
  height?: number | null;
  loading?: "eager" | "lazy";
  /** A short-lived bearer URL; intentionally bypasses the shared image optimizer. */
  src: string;
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
  fetchPriority = "auto",
  height,
  loading = "lazy",
  src,
  width,
  wrapperClassName,
}: SignedImageProps) {
  const [status, setStatus] = useState<"error" | "loaded" | "loading">(
    "loading",
  );
  const [trackedSrc, setTrackedSrc] = useState(src);

  if (src !== trackedSrc) {
    setTrackedSrc(src);
    setStatus("loading");
  }

  useEffect(() => {
    /* Some failed loads (e.g. blocked cross-origin responses) never fire
     * onError, which would otherwise spin the placeholder forever. */
    const timeoutId = window.setTimeout(() => {
      setStatus((current) => (current === "loading" ? "error" : current));
    }, 8_000);

    return () => window.clearTimeout(timeoutId);
  }, [src]);

  /* An image already decoded before hydration (server-rendered markup, or a
   * warm cache) fires no load event, which would strand it at opacity 0.
   * A callback ref runs as soon as the node attaches, so we can read the
   * browser's own completion flags instead of waiting for the event. */
  function adoptAlreadyLoadedImage(node: HTMLImageElement | null) {
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
        wrapperClassName && "absolute inset-0",
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

  if (!wrapperClassName) {
    return (
      <>
        {status === "loading" ? <LoadingSpinnerOverlay /> : null}
        {img}
      </>
    );
  }

  return (
    <div className={cn("bg-muted relative overflow-hidden", wrapperClassName)}>
      {status === "loading" ? <LoadingSpinnerOverlay /> : null}
      {img}
    </div>
  );
}
