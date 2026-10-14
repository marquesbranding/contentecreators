"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { Checkbox } from "@/shared/components/ui/checkbox";

import type { PlacementFormValues } from "../schemas/placement-form.schema";

export function PlacementContentToggle({
  contentName,
  label,
  toggleName,
}: {
  contentName: "title" | "body";
  label: string;
  toggleName: "showTitle" | "showBody";
}) {
  const form = useFormContext<PlacementFormValues>();
  const content = useWatch({ control: form.control, name: contentName });
  const visible = useWatch({ control: form.control, name: toggleName });
  const hasContent = Boolean(content?.trim());

  useEffect(() => {
    // Clearing the text must never leave an active flag without content.
    if (!hasContent && visible) {
      form.setValue(toggleName, false, { shouldDirty: true });
    }
  }, [form, hasContent, toggleName, visible]);

  return (
    <PlacementCheckbox disabled={!hasContent} label={label} name={toggleName} />
  );
}

export function PlacementCheckbox({
  disabled = false,
  name,
  label,
}: {
  disabled?: boolean;
  name:
    | "linkOnCreative"
    | "showSponsoredBadge"
    | "showAdvertiserLabel"
    | "showTitle"
    | "showBody";
  label: React.ReactNode;
}) {
  const form = useFormContext<PlacementFormValues>();
  const value = useWatch({ control: form.control, name });
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
      <Checkbox
        checked={value}
        disabled={disabled}
        onCheckedChange={(checked) =>
          form.setValue(name, checked === true, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />
      <span className="flex items-center gap-2">{label}</span>
    </label>
  );
}
