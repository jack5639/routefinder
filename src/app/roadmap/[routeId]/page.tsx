import { notFound } from "next/navigation";
import { mockRoadmaps } from "@/data/roadmaps/mock-roadmaps";
import { getCatalogueRoute } from "@/lib/catalog/queries";
import { RoadmapView } from "./roadmap-view";

export const dynamic = "force-dynamic";

type RoadmapPageProps = {
  params: Promise<{
    routeId: string;
  }>;
};

export default async function RoadmapPage({ params }: RoadmapPageProps) {
  const { routeId } = await params;
  const route = getCatalogueRoute(routeId);
  const roadmap = mockRoadmaps.find((item) => item.routeId === routeId);

  if (!route || !roadmap) {
    notFound();
  }

  return <RoadmapView route={route} roadmap={roadmap} />;
}
