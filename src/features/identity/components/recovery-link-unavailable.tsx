import { CircleAlert } from "lucide-react";
import Link from "next/link";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";

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
      <Button
        className="w-full"
        nativeButton={false}
        render={<Link href="/forgot-password" />}
        size="lg"
        variant="outline"
      >
        Solicitar um novo link
      </Button>
    </div>
  );
}
