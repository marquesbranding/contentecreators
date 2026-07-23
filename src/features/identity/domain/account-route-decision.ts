import type {
  ApplicationAccountStatus,
  ApplicationRole,
} from "../types/role-selection.types";

interface AccountRouteInput {
  role: ApplicationRole | null;
  status: ApplicationAccountStatus;
}

export function getAccountDestination({ role, status }: AccountRouteInput) {
  if (!role) {
    return "/onboarding/role";
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
    : onboardingPath;
}
