import Link from "next/link";

import { PageHeading } from "@/components/page-heading";
import { OpportunitySearch } from "./opportunity-search";

export default function OpportunitiesPage() {
  return (
    <>
      <PageHeading
        eyebrow="Reviewed catalogue"
        title="Find real opportunities"
        description="Search reviewed, source-backed records that are currently open and fresh enough for public discovery. Saved records that later change remain visible in your private portfolio with a warning."
        action={<Link href="/portfolio#external" className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-black">Add an external link</Link>}
      />
      <OpportunitySearch />
    </>
  );
}
