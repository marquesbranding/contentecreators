import { MapPin } from "lucide-react";

export function ShowcaseLocation({
  city,
  state,
}: {
  city: string | null;
  state: string | null;
}) {
  const location = [city, state].filter(Boolean).join(", ");

  if (!location) {
    return null;
  }

  return (
    <p className="flex items-center gap-1.5 text-xs text-black/60">
      <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
      {location}
    </p>
  );
}
