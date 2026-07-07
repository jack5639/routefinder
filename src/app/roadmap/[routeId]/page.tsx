import { notFound } from "next/navigation";
import { mockRoadmaps } from "@/data/roadmaps/mock-roadmaps";
import { mockRoutes } from "@/data/routes/mock-routes";
import { RoadmapView } from "./roadmap-view";

type RoadmapPageProps = {
  params: Promise<{
    routeId: string;
  }>;
};

export function generateStaticParams() {
  return mockRoutes.map((route) => ({
    routeId: route.id,
  }));
}

export default async function RoadmapPage({ params }: RoadmapPageProps) {
  const { routeId } = await params;
  const route = mockRoutes.find((item) => item.id === routeId);
  const roadmap = mockRoadmaps.find((item) => item.routeId === routeId);

  if (!route || !roadmap) {
    notFound();
  }

  return <RoadmapView route={route} roadmap={roadmap} />;
}
