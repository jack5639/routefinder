import { Suspense } from "react";
import { PageHeading } from "@/components/page-heading";
import { AccountControls } from "./account-controls";
import { getCurrentCycleOffer } from "@/lib/mvp/pricing-service";

export default async function AccountPage() {
  const currentOffer = await getCurrentCycleOffer();
  return (
    <>
      <PageHeading eyebrow="Account and privacy" title="Your Routefinder account" description="Manage Cycle access, exports, explicit prototype import, deletion, and your session." />
      <Suspense fallback={<p role="status">Loading account…</p>}><AccountControls currentOffer={currentOffer} /></Suspense>
    </>
  );
}
