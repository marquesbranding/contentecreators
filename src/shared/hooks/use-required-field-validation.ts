"use client";

import { useCallback, useRef, useState } from "react";

export type FieldErrors = Record<string, string[] | undefined>;

const defaultRequiredMessage = "Preencha este campo.";
const defaultPasswordMatchMessage = "As senhas precisam ser iguais.";

type NativeFormControl =
  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isNativeFormControl(target: EventTarget): target is NativeFormControl {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}

function getNativeValidationMessage(control: NativeFormControl) {
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

  if (
    control.validity.patternMismatch ||
    control.validity.tooLong ||
    control.validity.tooShort
  ) {
    return control.dataset.validationMessage ?? "Revise este campo.";
  }

  return "Revise este campo.";
}

function getFormValue(form: HTMLFormElement, fieldName: string) {
  const value = new FormData(form).get(fieldName);
  return typeof value === "string" ? value : "";
}

function getControlValidationMessage(
  control: NativeFormControl,
  form: HTMLFormElement,
) {
  if (!control.validity.valid) {
    return getNativeValidationMessage(control);
  }

  const matchFieldName = control.dataset.matchField;

  if (matchFieldName && control.value !== getFormValue(form, matchFieldName)) {
    return control.dataset.matchMessage ?? defaultPasswordMatchMessage;
  }

  return null;
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
  const touchedFields = useRef(new Set<string>());

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

  const updateFieldError = useCallback(
    (fieldName: string, message: string | null) => {
      if (!message) {
        clearFieldError(fieldName);
        return;
      }

      setClientFieldErrors((current) => {
        if (
          current[fieldName]?.length === 1 &&
          current[fieldName]?.[0] === message
        ) {
          return current;
        }

        return {
          ...current,
          [fieldName]: [message],
        };
      });
    },
    [clearFieldError],
  );

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

      const fieldName =
        target.getAttribute("name") ??
        target.closest<HTMLElement>("[data-field-name]")?.dataset.fieldName;

      if (!fieldName) {
        return;
      }

      if (
        isNativeFormControl(target) &&
        (touchedFields.current.has(fieldName) ||
          Boolean(clientFieldErrors[fieldName]))
      ) {
        updateFieldError(
          fieldName,
          getControlValidationMessage(target, event.currentTarget),
        );
      } else if (!isNativeFormControl(target)) {
        clearFieldError(fieldName);
      }

      if (!isNativeFormControl(target)) {
        return;
      }

      const matchingControls =
        event.currentTarget.querySelectorAll<HTMLInputElement>(
          "input[data-match-field]",
        );

      for (const matchingControl of matchingControls) {
        if (
          matchingControl.dataset.matchField !== fieldName ||
          !matchingControl.name ||
          (!touchedFields.current.has(matchingControl.name) &&
            !clientFieldErrors[matchingControl.name])
        ) {
          continue;
        }

        updateFieldError(
          matchingControl.name,
          getControlValidationMessage(matchingControl, event.currentTarget),
        );
      }
    },
    [clearFieldError, clientFieldErrors, updateFieldError],
  );

  const onBlur = useCallback(
    (event: React.FocusEvent<HTMLFormElement>) => {
      const target = event.target;
      const form = event.currentTarget;

      if (isNativeFormControl(target)) {
        if (
          target.disabled ||
          (target instanceof HTMLInputElement && target.type === "hidden") ||
          !target.name
        ) {
          return;
        }

        touchedFields.current.add(target.name);
        updateFieldError(
          target.name,
          getControlValidationMessage(target, form),
        );
        return;
      }

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const customField = target.closest<HTMLElement>(
        '[data-required-field="true"][data-field-name]',
      );
      const nextFocusedElement = event.relatedTarget;

      if (
        !customField ||
        (nextFocusedElement instanceof Node &&
          customField.contains(nextFocusedElement))
      ) {
        return;
      }

      const fieldName = customField.dataset.fieldName;
      if (!fieldName) {
        return;
      }

      touchedFields.current.add(fieldName);
      updateFieldError(
        fieldName,
        customFieldHasValue(customField)
          ? null
          : (customField.dataset.requiredMessage ?? defaultRequiredMessage),
      );
    },
    [updateFieldError],
  );

  const onSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const nextErrors: FieldErrors = {};
    const invalidFields: Array<{ element: HTMLElement; name: string }> = [];

    for (const element of Array.from(form.elements)) {
      if (
        !isNativeFormControl(element) ||
        element.disabled ||
        (element instanceof HTMLInputElement && element.type === "hidden") ||
        !element.name
      ) {
        continue;
      }

      const validationMessage = getControlValidationMessage(element, form);

      if (!validationMessage) {
        continue;
      }

      touchedFields.current.add(element.name);
      nextErrors[element.name] = [validationMessage];
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

      touchedFields.current.add(fieldName);
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
      onBlur,
      onInput,
      onSubmit,
    },
    getFieldErrors,
  };
}
