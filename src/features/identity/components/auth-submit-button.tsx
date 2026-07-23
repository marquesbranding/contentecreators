"use client";

import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";

interface AuthSubmitButtonProps {
  children: React.ReactNode;
  pending: boolean;
  pendingLabel: string;
}

export function AuthSubmitButton({
  children,
  pending,
  pendingLabel,
}: AuthSubmitButtonProps) {
  return (
    <Button className="w-full" disabled={pending} size="lg" type="submit">
      {pending ? <Spinner aria-label={pendingLabel} /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
