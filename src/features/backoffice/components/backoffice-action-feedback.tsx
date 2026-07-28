import { CircleCheck, CircleX } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";

interface BackofficeActionFeedbackProps {
  kind: "error" | "success";
  message: string;
  title?: string;
}

export function BackofficeActionFeedback({
  kind,
  message,
  title,
}: BackofficeActionFeedbackProps) {
  const isError = kind === "error";
  const Icon = isError ? CircleX : CircleCheck;

  return (
    <Alert
      aria-live={isError ? "assertive" : "polite"}
      className={
        isError
          ? undefined
          : "border-[color:var(--brand-success)] bg-emerald-50 text-emerald-900"
      }
      role={isError ? "alert" : "status"}
      variant={isError ? "destructive" : "default"}
    >
      <Icon aria-hidden="true" />
      <AlertTitle>
        {title ?? (isError ? "Ação não concluída" : "Tudo certo")}
      </AlertTitle>
      <AlertDescription className={isError ? undefined : "text-emerald-800"}>
        {message}
      </AlertDescription>
    </Alert>
  );
}
