import { Suspense } from "react";
import { PageHeading } from "@/components/page-heading";
import { AccountControls } from "./account-controls";

export default function AccountPage() {
  return (
    <>
      <PageHeading eyebrow="Account and privacy" title="Your Routefinder account" description="Manage Cycle access, exports, explicit prototype import, deletion, and your session." />
      <Suspense fallback={<p role="status">Loading account…</p>}><AccountControls /></Suspense>
    </>
  );
}
