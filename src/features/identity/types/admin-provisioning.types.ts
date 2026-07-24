export type AdminProvisioningFieldName = "email" | "reason";

export interface AdminProvisioningActionState {
  fieldErrors?: Partial<Record<AdminProvisioningFieldName, string[]>>;
  message?: string;
  status: "error" | "idle" | "success";
  values?: {
    email?: string;
  };
}

export type AdminProvisioningAction = (
  previousState: AdminProvisioningActionState,
  formData: FormData,
) => Promise<AdminProvisioningActionState>;

export const initialAdminProvisioningActionState: AdminProvisioningActionState =
  {
    status: "idle",
  };
