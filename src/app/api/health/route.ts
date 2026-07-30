import { NextResponse } from "next/server";

import { isProductionConfigured } from "@/lib/env";

export function GET() {
  return NextResponse.json(
    { status: isProductionConfigured() ? "ready" : "configuration-required", time: new Date().toISOString() },
    { status: isProductionConfigured() ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
