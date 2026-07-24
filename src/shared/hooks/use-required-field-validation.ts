"use client";

import { useCallback, useState } from "react";

export type FieldErrors = Record<string, string[] | undefined>;

const defaultRequiredMessage = "Preencha este campo.";

function getNativeValidationMessage(
  control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
) {
  if (control.validity.valueMissing) {
    return defaultRequiredMessage;
  }

  if (control.validity.typeMismatch && control.type === "email") {
    return "Informe um e-mail válido.";
  }

  if (control.validity.typeMismatch && control.type === "url") {
    return "Informe uma URL válida.";
  }

  if (control.validity.badInput) {
    return "Informe um número válido.";
  }

  return "Revise este campo.";
}

function customFieldHasValue(field: HTMLElement) {
  const fieldKind = field.dataset.fieldKind;

  if (fieldKind === "checkbox") {
    return field.getAttribute("aria-checked") === "true";
  }

  if (fieldKind === "checkbox-group") {
    return Boolean(
      field.querySelector('[role="checkbox"][aria-checked="true"]'),
    );
  }

  if (fieldKind === "radio-group") {
    return Boolean(field.querySelector('[role="radio"][aria-checked="true"]'));
  }

  return Boolean(field.dataset.fieldValue?.trim());
}

function findFocusableField(form: HTMLFormElement, fieldName: string) {
  const candidates = Array.from(
    form.querySelectorAll<HTMLElement>("[name], [data-field-name]"),
  );
  const field = candidates.find(
    (candidate) =>
      candidate.getAttribute("name") === fieldName ||
      candidate.dataset.fieldName === fieldName,
  );

  if (!field) {
    return null;
  }

  if (field.matches("input:not([type=hidden]), select, textarea, button")) {
    return field;
  }

  return field.querySelector<HTMLElement>(
    "input:not([type=hidden]), select, textarea, button, [role=radio], [role=checkbox]",
  );
}

export function useRequiredFieldValidation() {
  const [clientFieldErrors, setClientFieldErrors] = useState<FieldErrors>({});

  const clearFieldError = useCallback((fieldName: string) => {
    setClientFieldErrors((current) => {
      if (!current[fieldName]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  }, []);

  const getFieldErrors = useCallback(
    (fieldName: string, serverErrors?: string[]) => {
      const clientErrors = clientFieldErrors[fieldName] ?? [];
      const uniqueErrors = [
        ...new Set([...clientErrors, ...(serverErrors ?? [])]),
      ];

      return uniqueErrors.length > 0 ? uniqueErrors : undefined;
    },
    [clientFieldErrors],
  );

  const onInput = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (
        (target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLTextAreaElement) &&
        !target.validity.valid
      ) {
        return;
      }

      const fieldName =
        target.getAttribute("name") ??
        target.closest<HTMLElement>("[data-field-name]")?.dataset.fieldName;

      if (fieldName) {
        clearFieldError(fieldName);
      }
    },
    [clearFieldError],
  );

  const onSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const nextErrors: FieldErrors = {};
    const invalidFields: Array<{ element: HTMLElement; name: string }> = [];

    for (const element of Array.from(form.elements)) {
      if (
        !(
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        ) ||
        element.disabled ||
        (element instanceof HTMLInputElement && element.type === "hidden") ||
        !element.name ||
        element.validity.valid
      ) {
        continue;
      }

      nextErrors[element.name] = [getNativeValidationMessage(element)];
      invalidFields.push({ element, name: element.name });
    }

    const customRequiredFields = form.querySelectorAll<HTMLElement>(
      '[data-required-field="true"][data-field-name]',
    );

    for (const field of customRequiredFields) {
      const fieldName = field.dataset.fieldName;

      if (!fieldName || customFieldHasValue(field)) {
        continue;
      }

      nextErrors[fieldName] = [
        field.dataset.requiredMessage ?? defaultRequiredMessage,
      ];
      invalidFields.push({ element: field, name: fieldName });
    }

    if (invalidFields.length === 0) {
      setClientFieldErrors({});
      return;
    }

    event.preventDefault();
    invalidFields.sort(({ element: first }, { element: second }) => {
      if (first === second) {
        return 0;
      }

      const position = first.compareDocumentPosition(second);

      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
      }

      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }

      return 0;
    });
    const firstInvalidFieldName = invalidFields[0]?.name;
    if (firstInvalidFieldName) {
      findFocusableField(form, firstInvalidFieldName)?.focus();
    }
    setClientFieldErrors(nextErrors);
  }, []);

  return {
    clearFieldError,
    clientFieldErrors,
    formValidationProps: {
      onInput,
      onSubmit,
    },
    getFieldErrors,
  };
}
