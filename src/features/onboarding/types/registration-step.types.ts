export interface RegistrationStepState {
  status: "idle" | "error" | "success" | "account_exists";
  message?: string;
  email?: string;
  providers?: ("email" | "google")[];
  hasPassword?: boolean;
  fieldErrors?: Record<string, string[]>;
}
export type RegistrationStepAction = (
  state: RegistrationStepState,
  data: FormData,
) => Promise<RegistrationStepState>;
