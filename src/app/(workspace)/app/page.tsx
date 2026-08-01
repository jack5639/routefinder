import Link from "next/link";

import { PageHeading } from "@/components/page-heading";
import { ThisWeek } from "./this-week";

export default function AppHomePage() {
  return (
    <>
      <PageHeading
        eyebrow="Your returning home"
        title="This week"
        description="Up to three deterministic priorities, shaped by deadlines, hard-requirement uncertainty, blockers, reusable gaps, and realistic effort."
        action={<Link href="/readiness" className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black">Update readiness</Link>}
      />
      <ThisWeek />
    </>
  );
}
