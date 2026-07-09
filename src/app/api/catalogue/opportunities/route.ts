import { NextResponse, type NextRequest } from "next/server";

import type { RouteOpportunity } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { getCatalogueOpportunities } = await import("@/lib/catalog/queries");
  const searchParams = request.nextUrl.searchParams;
  const kind = searchParams.get("kind");
  const limit = Number(searchParams.get("limit"));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    opportunities: getCatalogueOpportunities({
      routeId: searchParams.get("routeId") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      kind: kind === "university-course" || kind === "apprenticeship-vacancy" ? (kind as RouteOpportunity["kind"]) : undefined,
      limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    }),
  });
}
