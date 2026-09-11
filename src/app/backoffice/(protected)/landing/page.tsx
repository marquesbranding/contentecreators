import type { Metadata } from "next";

import { LandingShowcaseManagementScreen } from "@/features/landing-showcase";

export const metadata: Metadata = {
  title: "Gestão da landing",
};

export default function BackofficeLandingPage() {
  return <LandingShowcaseManagementScreen />;
}
