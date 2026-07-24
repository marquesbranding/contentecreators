import type { Metadata } from "next";

import { BlockedAccount } from "@/features/moderation";

export const metadata: Metadata = {
  title: "Conta bloqueada",
};

export default function BlockedAccountPage() {
  return <BlockedAccount />;
}
