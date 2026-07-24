import { CircleAlert } from "lucide-react";
import Link from "next/link";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { buttonVariants } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/cn";

export function RecoveryLinkUnavailable() {
  return (
    <div className="space-y-5">
      <Alert variant="destructive">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>Link indisponível</AlertTitle>
        <AlertDescription>
          Este link expirou, já foi utilizado ou não pertence a uma sessão
          válida.
        </AlertDescription>
      </Alert>
      <Link
        className={cn(
          buttonVariants({ size: "lg", variant: "outline" }),
          "w-full",
        )}
        href="/forgot-password"
      >
        Solicitar um novo link
      </Link>
    </div>
  );
}
