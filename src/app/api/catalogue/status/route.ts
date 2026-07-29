import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { getCatalogueStatusSnapshot } = await import("@/lib/catalog/queries");

  return NextResponse.json(getCatalogueStatusSnapshot());
}
