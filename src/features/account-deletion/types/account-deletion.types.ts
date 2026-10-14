export type AccountDeletionActionCode =
  | "INVALID_PASSWORD"
  | "NOT_AVAILABLE"
  | "RATE_LIMITED"
  | "REAUTH_REQUIRED"
  | "UNKNOWN"
  | "VALIDATION_ERROR";

export interface AccountDeletionActionState {
  code?: AccountDeletionActionCode;
  fieldErrors?: Partial<
    Record<"acknowledged" | "confirmation" | "password", string[]>
  >;
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
