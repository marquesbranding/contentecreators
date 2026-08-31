"use client";

import type { LucideIcon } from "lucide-react";

import { FieldError } from "@/shared/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { cn } from "@/shared/lib/cn";

export interface DescriptiveRadioCardOption<Value extends string> {
  description: string;
  icon: LucideIcon;
  label: string;
  value: Value;
}

/**
 * A radio group whose options read as cards — bold label, one-line
 * description, an icon chip — rather than a bare list of values. Used
 * anywhere the choice itself needs explaining (account type, creator type),
 * not just naming.
 */
export function DescriptiveRadioCardGroup<Value extends string>({
  ariaLabelledBy,
  errors,
  idPrefix,
  name,
  onValueChange,
  options,
  required = true,
  value,
}: {
  ariaLabelledBy: string;
  errors?: string[];
  /** Prefixes every option's generated id, so two groups on one page never collide. */
  idPrefix: string;
  name: string;
  onValueChange: (value: Value) => void;
  options: readonly DescriptiveRadioCardOption<Value>[];
  required?: boolean;
  value: Value | null;
}) {
  const errorId = errors?.length ? `${idPrefix}-error` : undefined;

  return (
    <>
      <RadioGroup
        aria-describedby={errorId}
        aria-invalid={Boolean(errors?.length)}
        aria-labelledby={ariaLabelledBy}
        aria-required={required}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        name={name}
        onValueChange={(nextValue) => {
          const match = options.find((option) => option.value === nextValue);

          if (match) {
            onValueChange(match.value);
          }
        }}
        value={value}
      >
        {options.map((option) => {
          const selected = value === option.value;
          const optionId = `${idPrefix}-${option.value.toLowerCase()}`;
          const titleId = `${optionId}-title`;
          const descriptionId = `${optionId}-description`;
          const Icon = option.icon;

          return (
            <label
              className={cn(
                "focus-within:ring-ring/40 flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-5 transition-colors focus-within:ring-3",
                selected
                  ? "border-brand-blue bg-brand-blue-soft"
                  : "border-border hover:border-brand-blue/40",
              )}
              htmlFor={optionId}
              key={option.value}
              onClick={() => onValueChange(option.value)}
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl",
                  selected ? "bg-brand-blue text-white" : "bg-muted text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block" id={titleId}>
                  {option.label}
                </strong>
                <span
                  className="text-muted-foreground mt-1 block text-sm leading-5"
                  id={descriptionId}
                >
                  {option.description}
                </span>
              </span>
              <RadioGroupItem
                aria-describedby={descriptionId}
                aria-labelledby={titleId}
                id={optionId}
                value={option.value}
              />
            </label>
          );
        })}
      </RadioGroup>
      <FieldError id={errorId}>
        {errors?.map((message) => (
          <span className="block" key={message}>
            {message}
          </span>
        ))}
      </FieldError>
    </>
  );
}
