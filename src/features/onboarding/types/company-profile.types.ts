import type { CompanyProfileEditInput } from "../schemas/company-profile-edit-schema";

export interface CompanyProfileDto extends Omit<
  CompanyProfileEditInput,
  "expectedVersion"
> {
  coverAssetId: string | null;
  logoAssetId: string | null;
  version: number;
}

export type CompanyProfileUpdateResult =
  | {
      kind: "updated";
      profile: CompanyProfileDto;
    }
  | {
      currentVersion: number;
      kind: "conflict";
    };

export interface CompanyProfileActionState {
  fieldErrors?: Record<string, string[]>;
  message?: string;
  profileVersion?: number;
  status: "idle" | "error" | "success";
}

export type CompanyProfileAction = (
  previousState: CompanyProfileActionState,
  formData: FormData,
) => Promise<CompanyProfileActionState>;

export const initialCompanyProfileActionState: CompanyProfileActionState = {
  status: "idle",
};
