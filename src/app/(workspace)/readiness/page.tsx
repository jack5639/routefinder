import { PageHeading } from "@/components/page-heading";
import { ReadinessForm } from "./readiness-form";

export default function ReadinessPage() {
  return (
    <>
      <PageHeading
        eyebrow="Starting strategy"
        title="Readiness check"
        description="Tell Routefinder enough to compare published requirements with your current information. Unknown is always a valid answer."
      />
      <ReadinessForm />
    </>
  );
}
