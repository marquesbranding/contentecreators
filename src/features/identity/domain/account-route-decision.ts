import type {
  ApplicationAccountStatus,
  ApplicationRole,
} from "../types/role-selection.types";

interface AccountRouteInput {
  registrationStep?:
    "ACCOUNT_DETAILS" | "PROFILE" | "AUDIENCE" | "LOCATION_TERMS" | "SUBMITTED";
  role: ApplicationRole | null;
  status: ApplicationAccountStatus;
}

export function getAccountDestination({
  role,
  status,
  registrationStep,
}: AccountRouteInput) {
  if (!role) {
    return "/onboarding/account";
  }

  if (role === "ADMIN") {
    return "/backoffice";
  }

  if (status === "BANNED") {
    return "/app/status/blocked";
  }

  if (status === "SUSPENDED") {
    return "/app/status/suspended";
  }

  if (status === "PENDING_REVIEW") {
    return "/app/status/analysis";
  }

  if (status === "APPROVED") {
    return "/app/catalog";
  }

  const onboardingPath =
    role === "INFLUENCER" ? "/onboarding/influencer" : "/onboarding/company";

  return status === "CHANGES_REQUESTED"
    ? `${onboardingPath}?corrections=requested`
    : registrationStep === "AUDIENCE"
      ? `${onboardingPath}?step=audience`
      : registrationStep === "LOCATION_TERMS"
        ? `${onboardingPath}?step=location`
        : onboardingPath;
}
