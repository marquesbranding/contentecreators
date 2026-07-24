import type {
  ApplicationAccountStatus,
  ApplicationRole,
} from "./role-selection.types";

export interface CurrentAccountDto {
  id: string;
  role: ApplicationRole;
  status: ApplicationAccountStatus;
}

export type CurrentSessionDto =
  | {
      account: null;
      kind: "anonymous";
    }
  | {
      account: CurrentAccountDto | null;
      kind: "authenticated";
    };
