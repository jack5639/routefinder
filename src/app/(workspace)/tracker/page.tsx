import { PageHeading } from "@/components/page-heading";
import { ApplicationTracker } from "./application-tracker";

export default function TrackerPage() {
  return (
    <>
      <PageHeading eyebrow="Application progress" title="Tracker" description="Keep deadlines, stages, official destinations, and the next useful action together. Routefinder links out and never submits for you." />
      <ApplicationTracker />
    </>
  );
}
