"use client";

import { getCorrectableFieldDefinition } from "@/features/moderation/domain/correctable-fields";

import { focusField } from "./form-error-summary";

export interface CorrectionRequestedFieldItem {
  field: string;
  note?: string;
}

/** The clickable field list inside the "correções solicitadas" banner — clicking one scrolls to and focuses that field in the form below. */
export function CorrectionRequestedFieldsList({
  fields,
}: {
  fields: CorrectionRequestedFieldItem[];
}) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <ul className="mt-2 list-disc space-y-1 pl-5">
      {fields.map((item) => {
        const definition = getCorrectableFieldDefinition(item.field);

        return (
          <li key={item.field}>
            <button
              className="text-left underline underline-offset-3"
              onClick={() =>
                /* The field lives in the form below this banner, not inside
                 * it, so search the whole document instead of the nearest
                 * ancestor form. */
                focusField(document, definition?.dataFieldName ?? item.field)
              }
              type="button"
            >
              {definition?.label ?? item.field}
              {item.note ? `: ${item.note}` : ""}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
