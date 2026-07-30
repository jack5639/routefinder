import { PageHeading } from "@/components/page-heading";
import { EvidenceBank } from "./evidence-bank";

export default function EvidencePage() {
  return (
    <>
      <PageHeading eyebrow="Student-owned work" title="Evidence bank" description="Capture what you genuinely did, your contribution, the outcome, and what you learned—then connect it to reviewed requirements." />
      <EvidenceBank />
    </>
  );
}
