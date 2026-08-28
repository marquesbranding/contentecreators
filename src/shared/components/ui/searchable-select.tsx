"use client";

import * as React from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxIcon,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
} from "@/shared/components/ui/combobox";

interface SearchableSelectOption {
  label: string;
  value: string;
}

/**
 * A near drop-in replacement for `Select` (`items`/`value`/`onValueChange`
 * mirror `Select`'s own Record-based API) that adds text filtering, built on
 * the shared `Combobox` primitive.
 */
function SearchableSelect({
  className,
  disabled,
  id,
  items,
  onValueChange,
  placeholder,
  value,
  ...props
}: {
  className?: string;
  disabled?: boolean;
  id?: string;
  items: Record<string, string>;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  value: string | null | undefined;
} & Omit<
  React.ComponentProps<"input">,
  "disabled" | "id" | "onChange" | "value"
>) {
  const options = React.useMemo<SearchableSelectOption[]>(
    () => Object.entries(items).map(([optionValue, label]) => ({
      label,
      value: optionValue,
    })),
    [items],
  );
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Combobox
      disabled={disabled}
      items={options}
      onValueChange={(nextOption: SearchableSelectOption | null) =>
        onValueChange(nextOption?.value)
      }
      value={selected}
    >
      <ComboboxInputGroup className={className}>
        <ComboboxInput id={id} placeholder={placeholder} {...props} />
        <ComboboxIcon />
      </ComboboxInputGroup>
      <ComboboxContent>
        {(option: SearchableSelectOption) => (
          <ComboboxItem key={option.value} value={option}>
            {option.label}
          </ComboboxItem>
        )}
      </ComboboxContent>
    </Combobox>
  );
}

export { SearchableSelect };
