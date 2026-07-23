import Image from "next/image";

import { cn } from "@/shared/lib/cn";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative block h-[3.15rem] w-[9.35rem] shrink-0 overflow-hidden bg-black sm:h-[3.6rem] sm:w-[10.65rem]",
        className,
      )}
    >
      <Image
        alt="Contente Creators"
        className="absolute -inset-[2.5%] h-[105%] w-[105%] max-w-none object-cover"
        height={1_141}
        priority
        sizes="(max-width: 640px) 150px, 171px"
        src="/brand/contente-creators-logo.png"
        width={3_370}
      />
    </span>
  );
}
