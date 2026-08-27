import { NextResponse } from "next/server";

import { getLaunchReadiness } from "@/lib/launch-readiness-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = await getLaunchReadiness();
  return NextResponse.json(readiness, {
    status: readiness.status === "ready" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
