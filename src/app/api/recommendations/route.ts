import { NextResponse, type NextRequest } from "next/server";

import type { RecommendationRequest } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecommendationRequest(value: unknown): value is RecommendationRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RecommendationRequest>;
  return Boolean(candidate.answers && typeof candidate.answers === "object");
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as unknown;

  if (!isRecommendationRequest(body)) {
    return NextResponse.json({ error: "Expected recommendation request with quiz answers." }, { status: 400 });
  }

  const { buildRecommendationResponse } = await import("@/lib/catalog/queries");

  return NextResponse.json(buildRecommendationResponse(body.answers, body.limit));
}
