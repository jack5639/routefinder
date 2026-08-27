import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    { status: "alive", time: new Date().toISOString() },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
