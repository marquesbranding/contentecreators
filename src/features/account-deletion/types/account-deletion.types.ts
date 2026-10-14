export type AccountDeletionActionCode =
  "NOT_AVAILABLE" | "RATE_LIMITED" | "UNKNOWN" | "VALIDATION_ERROR";

export interface AccountDeletionActionState {
  code?: AccountDeletionActionCode;
  fieldErrors?: Partial<Record<"acknowledged" | "confirmation", string[]>>;
  message?: string;
  status: "error" | "idle";
}

/** A Storage object left by a deleted account (bucket and path only). */
export interface StorageObjectRef {
  bucket: string;
  path: string;
}

export interface DeletedAccount {
  accountId: string;
  outboxId: string;
  storageObjects: StorageObjectRef[];
}
