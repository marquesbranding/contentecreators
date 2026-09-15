import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  OnboardingFormShell,
  RegistrationVerifyStep,
} from "@/features/onboarding";
import {
  verifyRegistrationCodeAction,
  resendRegistrationCodeAction,
} from "@/features/onboarding/server";
export default async function VerifyPage() {
  const email = (await cookies()).get("cc_signup_email")?.value;
  if (!email) redirect("/sign-up");
  const [local, domain] = email.split("@");
  return (
    <OnboardingFormShell
      currentStep={2}
      totalSteps={6}
      progressLabel="Confirmação"
      title="Confira seu e-mail"
      description="Confirme seu acesso para continuar o cadastro."
    >
      <RegistrationVerifyStep
        action={verifyRegistrationCodeAction}
        resendAction={resendRegistrationCodeAction}
        maskedEmail={`${local[0]}***@${domain}`}
        mailboxUrl={
          process.env.NODE_ENV === "development"
            ? process.env.NEXT_PUBLIC_LOCAL_MAILBOX_URL
            : undefined
        }
      />
    </OnboardingFormShell>
  );
}
