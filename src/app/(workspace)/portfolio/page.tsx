import { PageHeading } from "@/components/page-heading";
import { PortfolioBoard } from "./portfolio-board";

export default function PortfolioPage() {
  return (
    <>
      <PageHeading
        eyebrow="Decision workspace"
        title="Your opportunity portfolio"
        description="Compare eligibility, fit, readiness, information confidence, and portfolio role separately. None of these predicts acceptance."
      />
      <PortfolioBoard />
    </>
  );
}
